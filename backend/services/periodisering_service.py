"""
Centralized Periodisering Assessment Service

Provides a shared LLM prompt and assessment logic used by:
- Path A: invoice_processor.py (OCR pipeline) + autonomous_posting.py
- Path B: periodisering_scan_task.py (weekly batch scan for manual bilags)

Legal basis: Regnskapsloven § 4-1 nr. 3 (sammenstillingsprinsippet)
MVA timing: mval. § 15-9 (tidfesting etter fakturadato, ikke leveringsdato)
"""

import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models import Bilag, Notification

logger = logging.getLogger(__name__)


# ============================================================================
# SHARED ASSESSMENT PROMPT
# ============================================================================

PERIODISERING_ASSESSMENT_PROMPT = """Du er Ciri, en AI-regnskapsfører for norske småbedrifter.
Vurder om denne posteringen/kostnaden/inntekten bør periodiseres i henhold til
sammenstillingsprinsippet (Regnskapsloven § 4-1 nr. 3).

REGLER FOR PERIODISERING:

Inntekter (opptjeningsprinsippet):
- Inntekt skal resultatføres i den perioden den er opptjent, ikke når betaling mottas
- Forskuddsbetalt inntekt (f.eks. årlig vedlikeholdsavtale) fordeles over leveringsperioden
- Løpende leveranser periodiseres etterhvert som tjenesten leveres (mval. § 15-9)

Kostnader (sammenstillingsprinsippet):
- Kostnader sammenstilles med tilhørende inntekt i samme periode
- Forskuddsbetalte kostnader (forsikring, husleie, lisenser) fordeles over dekningsperioden
- Driftsmidler over kr 15 000 eks. MVA med levetid over 3 år → aktivering, ikke periodisering her

Konkrete eksempler som SKAL periodiseres:
- Årsforsikring betalt i januar → fordeles over 12 måneder
- Husleie betalt kvartalsvis forskudd → fordeles over 3 måneder
- Årsabonnement eller lisens over kr 5 000 netto → fordeles over abonnementsperioden
- Vedlikeholdsavtale som dekker flere måneder → fordeles over dekningsperioden
- Forskuddsbetalt inntekt for tjenester → fordeles over leveringsperioden
- Leasing betalt forskudd → fordeles over leasingperioden

Eksempler som IKKE skal periodiseres:
- Månedlige SaaS-kostnader under kr 5 000 (allerede månedlig, trenger ikke fordeling)
- Engangskjøp og forbruksvarer (kontorrekvisita, rengjøringsmidler osv.)
- Enkeltstående tjenester som er levert og ferdig (konsulenttime, reparasjon)
- Kostnader og inntekter under kr 5 000 (vesentlighetsprinsippet for små foretak)
- Lønn og lønnsrelaterte kostnader (periodiseres separat via lønnssystem)
- Strøm, telefon og andre løpende driftskostnader som faktureres månedlig

VIKTIG: Ikke forsøk å GJØRE noe periodiserbart som ikke er det. De fleste posteringer
er helt korrekte som engangskostnader eller -inntekter. Svar isCandidate: false med
confidence 0.0 hvis det ikke er en tydelig periodiseringscase. Vær konservativ.

For MVA: Periodisering påvirker kun kostnads-/inntektsfordelingen i resultatregnskapet,
IKKE MVA-innberetningen. MVA tidfestes etter fakturadato (mval. § 15-9).

Svar ALLTID i JSON:
{
  "isCandidate": true/false,
  "confidence": 0.0-1.0,
  "reason": "Kort norsk forklaring, eller null hvis ikke kandidat",
  "category": "forsikring|husleie|abonnement|lisens|vedlikehold|inntekt|annet",
  "periodMonths": tall (antall måneder, eller null hvis ikke kandidat),
  "startMonth": "YYYY-MM" (første måned, eller null),
  "balanceAccount": "1700" for forskuddsbetalte kostnader, "2900" for forskuddsbetalt inntekt, eller null,
  "expenseAccount": "kontonummer" (eller null),
  "direction": "kostnad" eller "inntekt"
}"""


# ============================================================================
# ASSESSMENT FUNCTIONS
# ============================================================================

async def assess_periodisering(
    description: str,
    amount: float,
    account_number: str | None = None,
    counterparty: str | None = None,
    document_date: str | None = None,
    category: str | None = None,
) -> dict | None:
    """
    Assess a single bilag for periodisering potential using Claude Haiku.

    Returns a periodisering assessment dict if the LLM responds,
    or None if the call fails.
    """
    import anthropic
    from config.settings import get_settings

    settings = get_settings()
    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY not set, skipping periodisering assessment")
        return None

    bilag_context = json.dumps({
        "description": description,
        "amount": amount,
        "account_number": account_number,
        "counterparty": counterparty,
        "document_date": document_date,
        "category": category,
    }, ensure_ascii=False)

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": PERIODISERING_ASSESSMENT_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    },
                    {
                        "type": "text",
                        "text": f"Vurder denne posteringen:\n{bilag_context}",
                    },
                ],
            }],
        )

        response_text = message.content[0].text
        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0]
        response_text = response_text.strip()

        result = json.loads(response_text)
        return result

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse periodisering assessment JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Periodisering assessment failed: {e}")
        return None


async def assess_periodisering_batch(
    bilags: list[dict],
) -> list[dict | None]:
    """
    Assess a batch of bilags for periodisering.
    Uses Claude Haiku with prompt caching for efficiency.

    Each dict in bilags should have: description, amount, account_number,
    counterparty, document_date, category.

    Returns list of assessment dicts (or None for failures), same order as input.
    """
    import anthropic
    from config.settings import get_settings

    settings = get_settings()
    if not settings.anthropic_api_key:
        logger.warning("ANTHROPIC_API_KEY not set, skipping batch assessment")
        return [None] * len(bilags)

    if not bilags:
        return []

    batch_context = json.dumps(
        [{"index": i, **b} for i, b in enumerate(bilags)],
        ensure_ascii=False, indent=2,
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": PERIODISERING_ASSESSMENT_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    },
                    {
                        "type": "text",
                        "text": (
                            f"Vurder disse {len(bilags)} posteringene. "
                            "Svar med en JSON-array med ett objekt per postering, i samme rekkefølge.\n\n"
                            f"{batch_context}"
                        ),
                    },
                ],
            }],
        )

        # Log cache performance
        cached_tokens = getattr(message.usage, "cache_read_input_tokens", 0)
        logger.info(
            f"Periodisering batch: {message.usage.input_tokens} input "
            f"({cached_tokens} cached), {message.usage.output_tokens} output, "
            f"{len(bilags)} bilags"
        )

        response_text = message.content[0].text
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text.rsplit("```", 1)[0]
        response_text = response_text.strip()

        results = json.loads(response_text)
        if isinstance(results, list) and len(results) == len(bilags):
            return results
        else:
            logger.warning(
                f"Batch assessment returned {len(results) if isinstance(results, list) else 'non-list'} "
                f"results for {len(bilags)} bilags"
            )
            return [None] * len(bilags)

    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse batch assessment JSON: {e}")
        return [None] * len(bilags)
    except Exception as e:
        logger.error(f"Batch periodisering assessment failed: {e}")
        return [None] * len(bilags)


# ============================================================================
# SUGGESTION BUILDER
# ============================================================================

def build_suggestion_from_assessment(
    assessment: dict,
    total_amount: float,
    document_date: str | None = None,
    expense_account: str | None = None,
) -> dict | None:
    """
    Build a periodisering_suggestion JSONB dict from an LLM assessment result.

    Returns the suggestion dict ready to store on bilag.periodisering_suggestion,
    or None if the assessment is not a candidate.
    """
    if not assessment or not assessment.get("isCandidate"):
        return None

    months = int(assessment.get("periodMonths") or 0)
    if months < 2:
        return None

    if total_amount <= 0:
        return None

    monthly = round(total_amount / months, 2)
    remainder = round(total_amount - monthly * months, 2)

    start = assessment.get("startMonth") or (document_date or "")[:7]
    if not start or len(start) != 7 or "-" not in start:
        return None

    # Validate month range
    try:
        start_year, start_month = int(start[:4]), int(start[5:7])
        if not (1 <= start_month <= 12) or start_year < 2000:
            return None
    except (ValueError, IndexError):
        return None
    end_month_total = (start_year * 12 + start_month - 1) + months - 1
    end_year, end_m = divmod(end_month_total, 12)
    end_period = f"{end_year}-{end_m + 1:02d}"

    direction = assessment.get("direction", "kostnad")
    default_balance = "2900" if direction == "inntekt" else "1700"

    return {
        "is_candidate": True,
        "confidence": float(assessment.get("confidence", 0.0)),
        "reason": assessment.get("reason", ""),
        "legal_basis": "Regnskapsloven § 4-1 nr. 3 (sammenstillingsprinsippet)",
        "category": assessment.get("category", "annet"),
        "total_amount": total_amount,
        "period_count": months,
        "start_period": start,
        "end_period": end_period,
        "monthly_amount": monthly,
        "remainder": remainder,
        "expense_account": expense_account or assessment.get("expenseAccount") or "7700",
        "balance_account": assessment.get("balanceAccount") or default_balance,
        "direction": direction,
        "dismissed": False,
        "accepted": False,
    }


# ============================================================================
# NOTIFICATION HELPER
# ============================================================================

def create_periodisering_notification(
    db: AsyncSession,
    bilag: Bilag,
    suggestion: dict,
) -> Notification:
    """Create a notification for a periodisering candidate."""
    category_labels = {
        "forsikring": "forsikring",
        "husleie": "husleie",
        "abonnement": "abonnement",
        "lisens": "lisens",
        "vedlikehold": "vedlikehold",
        "inntekt": "inntekt",
        "annet": "kostnad",
    }
    cat = category_labels.get(suggestion.get("category", ""), "kostnad")
    direction = "inntekten" if suggestion.get("direction") == "inntekt" else "kostnaden"
    total = suggestion.get("total_amount", 0)
    months = suggestion.get("period_count", 0)

    notification = Notification(
        company_id=bilag.company_id,
        title=f"Periodiseringsforslag: {bilag.description[:50]}",
        message=(
            f"Ciri foreslår å fordele {direction} på kr {total:,.0f} "
            f"over {months} måneder ({cat}). Klikk for å gjennomgå."
        ),
        type="periodisering_suggestion",
        reference_id=str(bilag.id),
    )
    db.add(notification)
    return notification
