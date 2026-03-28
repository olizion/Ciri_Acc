"""
Claude Batch Matcher
AI-powered fuzzy matching for bank reconciliation.

Sends unmatched transactions + bilags to Claude in bulk for smart matching.
Handles messy bank names (VIPPS*, KORTBETALING 1234, extra symbols).

Cost-optimized per CLAUDE.md:
- Haiku first ($0.25/M input), Sonnet fallback
- Prompt caching on instruction text
- max_tokens capped
"""

import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

import anthropic

from config.settings import settings

logger = logging.getLogger(__name__)

# Model costs per 1M tokens
MODEL_COSTS = {
    "claude-haiku-4-5-20251001": {"input": 0.25, "output": 1.25, "cached": 0.025},
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0, "cached": 0.30},
}

BATCH_SIZE = 50  # Max transactions + bilags per API call

# Static instruction text (cached across calls)
MATCHING_INSTRUCTION = """Du er et avstemmingssystem for norsk bokføring. Du skal matche banktransaksjoner med bilag (fakturaer/kvitteringer).

VIKTIG om banktransaksjoner:
- Bankbeskrivelser inneholder ofte prefikser som VIPPS*, KORTBETALING, NETTGIRO, AVTALEGIRO
- De kan ha ekstra tall, datoer, eller referansenummer
- Selgernavn er ofte forkortet eller endret av banken
- Se GJENNOM disse prefiks/suffiks for å finne det faktiske firmanavnet

Matcheregler:
1. Beløp: Transaksjonsbeløpet (absolutt verdi) bør stemme med bilagets bruttobeløp (± 2%)
2. Navn: Se gjennom bankprefikser for å matche leverandørnavn
3. Dato: Transaksjon og bilag bør være innen 14 dager av hverandre
4. Referanse: KID-nummer eller fakturanummer kan finnes i transaksjonsbeskrivelsen

Du vil motta to lister:
- transactions: Banktransaksjoner med id, date, amount, description, merchant_name
- bilags: Bilag med id, date, gross_amount, supplier_name, reference, kid_number

Returner et JSON-array med matcher:
[
  {
    "tx_id": "uuid",
    "bilag_id": "uuid",
    "confidence": 0.0-1.0,
    "reasoning": "kort forklaring på norsk"
  }
]

Konfidensystem:
Skalaen er 0.0–1.0. Terskel for match er 0.5. Over 0.9 er sterk match.

Avvisningshistorikk:
Hvis det er oppgitt en avvisningshistorikk nedenfor, bruk den som kontekst. Juster confidence
ned med 0.05–0.15 for transaksjoner som ligner avviste matcher, men ALDRI avvis en god match
bare fordi en lignende ble avvist. Verifiser spesifikt at de oppgitte avvisningsgrunnene IKKE
gjelder den aktuelle matchen før du justerer.

Regler:
- Bare returner matcher der du er rimelig sikker (confidence >= 0.5)
- Hver transaksjon kan kun matches med ett bilag og omvendt
- Hvis ingen god match finnes, ikke returner den transaksjonen
- Returner KUN JSON-arrayet, ingen annen tekst"""


@dataclass
class MatchResult:
    """A single match result from Claude."""
    tx_id: uuid.UUID
    bilag_id: uuid.UUID
    confidence: float
    reasoning: str


@dataclass
class BatchMatchResult:
    """Result of a batch matching run."""
    matches: list[MatchResult] = field(default_factory=list)
    total_cost_usd: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    model_used: str = ""
    processing_time_ms: int = 0


def _calculate_cost(model: str, input_tokens: int, output_tokens: int, cached_tokens: int) -> float:
    """Calculate API cost in USD."""
    costs = MODEL_COSTS.get(model, MODEL_COSTS["claude-haiku-4-5-20251001"])
    uncached_input = input_tokens - cached_tokens
    return (
        uncached_input * costs["input"] / 1_000_000
        + cached_tokens * costs["cached"] / 1_000_000
        + output_tokens * costs["output"] / 1_000_000
    )


def _serialize_decimal(obj):
    """JSON serializer for Decimal."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (uuid.UUID,)):
        return str(obj)
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


async def batch_match(
    transactions: list[dict],
    bilags: list[dict],
    company_id: uuid.UUID,
    rejection_context: str = "",
) -> BatchMatchResult:
    """
    Match unmatched transactions against unmatched bilags using Claude.

    Args:
        transactions: List of dicts with keys: id, date, amount, description, merchant_name
        bilags: List of dicts with keys: id, date, gross_amount, supplier_name, reference, kid_number
        company_id: Company ID for logging
        rejection_context: Pre-formatted rejection history text for relevant sectors

    Returns:
        BatchMatchResult with matches and cost tracking
    """
    if not transactions or not bilags:
        return BatchMatchResult()

    if not settings.anthropic_api_key:
        logger.warning("Anthropic API key not configured, skipping Claude batch matching")
        return BatchMatchResult()

    start_time = datetime.now()
    total_cost = 0.0
    total_input = 0
    total_output = 0
    total_cached = 0
    all_matches: list[MatchResult] = []
    model_used = ""

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Build valid ID sets for validation
    valid_tx_ids = {str(tx["id"]) for tx in transactions}
    valid_bilag_ids = {str(b["id"]) for b in bilags}

    # Chunk into batches
    for i in range(0, max(len(transactions), len(bilags)), BATCH_SIZE):
        tx_chunk = transactions[i:i + BATCH_SIZE]
        bilag_chunk = bilags[i:i + BATCH_SIZE]

        if not tx_chunk or not bilag_chunk:
            continue

        payload = {"transactions": tx_chunk, "bilags": bilag_chunk}
        if rejection_context:
            payload["rejection_context"] = rejection_context
        data_payload = json.dumps(
            payload,
            default=_serialize_decimal,
            ensure_ascii=False,
        )

        # Try Haiku first, fallback to Sonnet
        for model in ["claude-haiku-4-5-20251001", "claude-sonnet-4-5-20250929"]:
            try:
                message = await client.messages.create(
                    model=model,
                    max_tokens=2048,
                    messages=[{
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": MATCHING_INSTRUCTION,
                                "cache_control": {"type": "ephemeral"},
                            },
                            {
                                "type": "text",
                                "text": data_payload,
                            },
                        ],
                    }],
                )

                input_tokens = message.usage.input_tokens
                output_tokens = message.usage.output_tokens
                cached_tokens = getattr(message.usage, "cache_read_input_tokens", 0)
                cost = _calculate_cost(model, input_tokens, output_tokens, cached_tokens)

                total_cost += cost
                total_input += input_tokens
                total_output += output_tokens
                total_cached += cached_tokens
                model_used = model

                logger.info(
                    f"Claude batch match API call: model={model}, "
                    f"cost=${cost:.4f}, cached={cached_tokens} tokens"
                )

                # Parse response
                response_text = message.content[0].text
                matches = _parse_matches(response_text, valid_tx_ids, valid_bilag_ids)

                if matches is not None:
                    all_matches.extend(matches)
                    break  # Success, no need for fallback
                else:
                    logger.warning(f"Failed to parse matches from {model}, trying fallback")
                    continue

            except anthropic.AuthenticationError:
                logger.error("Invalid Anthropic API key")
                break
            except Exception as e:
                logger.error(f"Claude batch match error ({model}): {e}")
                if model == "claude-sonnet-4-5-20250929":
                    break  # No more fallbacks
                continue

    elapsed_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    logger.info(
        f"Batch match complete for company {company_id}: "
        f"{len(all_matches)} matches, cost=${total_cost:.4f}, time={elapsed_ms}ms"
    )

    return BatchMatchResult(
        matches=all_matches,
        total_cost_usd=total_cost,
        input_tokens=total_input,
        output_tokens=total_output,
        cached_tokens=total_cached,
        model_used=model_used,
        processing_time_ms=elapsed_ms,
    )


def _parse_matches(
    response_text: str,
    valid_tx_ids: set[str],
    valid_bilag_ids: set[str],
) -> list[MatchResult] | None:
    """Parse and validate Claude's match response."""
    # Find JSON array in response
    text = response_text.strip()

    # Try to find array brackets
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        return None

    try:
        raw_matches = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None

    if not isinstance(raw_matches, list):
        return None

    results = []
    used_tx_ids = set()
    used_bilag_ids = set()

    for m in raw_matches:
        tx_id_str = str(m.get("tx_id", ""))
        bilag_id_str = str(m.get("bilag_id", ""))
        confidence = m.get("confidence", 0)
        reasoning = m.get("reasoning", "")

        # Validate IDs exist in input
        if tx_id_str not in valid_tx_ids or bilag_id_str not in valid_bilag_ids:
            continue

        # Validate confidence range
        if not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 1:
            continue

        # Skip low confidence
        if confidence < 0.5:
            continue

        # Ensure 1:1 matching
        if tx_id_str in used_tx_ids or bilag_id_str in used_bilag_ids:
            continue

        used_tx_ids.add(tx_id_str)
        used_bilag_ids.add(bilag_id_str)

        results.append(MatchResult(
            tx_id=uuid.UUID(tx_id_str),
            bilag_id=uuid.UUID(bilag_id_str),
            confidence=float(confidence),
            reasoning=str(reasoning)[:200],
        ))

    return results
