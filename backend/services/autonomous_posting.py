"""
Autonomous Posting Service
Uses success clusters + per-transaction readiness tiers to determine
which transactions can be auto-posted with Claude validation.

Pipeline:
1. Check global safety minimums (clusters + rules)
2. Verify company is in AUTONOMOUS mode
3. Compute per-transaction readiness tier using clusters
4. Bundle Tier 1 (direct rule) + Tier 2 (strong cluster) transactions
5. Claude validates batch with cluster context (prompt caching)
6. Create bilags + posteringer for approved transactions
7. Record cluster data points for completed postings
"""

import uuid
import logging
import json
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, field

from fastapi import HTTPException
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    RuleType, Company, AutonomyLevel,
    ReconciliationRule,
    BankTransaction, ReconciliationStatus, TransactionCategory,
    Bilag, BilagStatus, Postering,
)
from services.cluster_service import (
    get_cluster_summaries,
    compute_readiness_tier,
    format_clusters_for_prompt,
    check_global_minimums,
    record_data_point,
    ReadinessTier,
    ReadinessResult,
)
from models.cluster_data_point import DataPointSource
from services.reconciliation_matcher import ReconciliationMatcher, create_matcher

logger = logging.getLogger(__name__)


# ============================================================================
# HELPERS
# ============================================================================

async def get_company_id(db: AsyncSession) -> uuid.UUID:
    """Get current company ID (placeholder for auth integration)."""
    query = select(Company).limit(1)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return company.id


# ============================================================================
# CONFIDENCE SCORING (kept for rule-based scoring)
# ============================================================================

SCORE_WEIGHTS = {
    "description_match": 0.35,
    "merchant_match": 0.25,
    "amount_in_range": 0.20,
    "direction_match": 0.10,
    "rule_reliability": 0.10,
}


def score_transaction_against_rule(
    tx: BankTransaction,
    rule: ReconciliationRule,
) -> tuple[float, dict]:
    """Score how well a single rule matches a transaction. Returns 0.0-1.0."""
    criteria = rule.criteria or {}
    scores: dict[str, float] = {}

    # Description match
    desc_pattern = criteria.get("description_contains", "").strip().upper()
    if desc_pattern:
        raw = (tx.raw_description or "").upper()
        cleaned = (tx.cleaned_description or "").upper()
        scores["description_match"] = 1.0 if (desc_pattern in raw or desc_pattern in cleaned) else 0.0
    else:
        scores["description_match"] = 0.5

    # Merchant name match
    merchant_pattern = criteria.get("merchant_name", "").strip().upper()
    if merchant_pattern:
        tx_merchant = (tx.merchant_name or "").upper()
        scores["merchant_match"] = 1.0 if merchant_pattern in tx_merchant else 0.0
    else:
        scores["merchant_match"] = 0.5

    # Amount in range
    amount_min = criteria.get("amount_min")
    amount_max = criteria.get("amount_max")
    tx_abs = abs(float(tx.amount)) if tx.amount else 0.0
    if amount_min is not None or amount_max is not None:
        in_range = True
        if amount_min is not None and tx_abs < float(amount_min):
            in_range = False
        if amount_max is not None and tx_abs > float(amount_max):
            in_range = False
        scores["amount_in_range"] = 1.0 if in_range else 0.0
    else:
        scores["amount_in_range"] = 0.5

    # Direction match
    rule_direction = criteria.get("direction")
    if rule_direction:
        tx_is_debit = float(tx.amount) < 0 if tx.amount else False
        if (rule_direction == "debit" and tx_is_debit) or (rule_direction == "credit" and not tx_is_debit):
            scores["direction_match"] = 1.0
        else:
            scores["direction_match"] = 0.0
    else:
        scores["direction_match"] = 0.5

    # Rule reliability
    times_applied = rule.times_applied or 0
    times_overridden = rule.times_overridden or 0
    if times_applied > 0:
        scores["rule_reliability"] = max(0.0, 1.0 - (times_overridden / times_applied))
    else:
        scores["rule_reliability"] = 0.5

    total = sum(scores.get(k, 0.0) * w for k, w in SCORE_WEIGHTS.items())
    return total, scores


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class ScoredTransaction:
    """A transaction with readiness assessment."""
    transaction: BankTransaction
    readiness: ReadinessResult
    best_rule: Optional[ReconciliationRule] = None
    confidence_score: float = 0.0
    suggested_account: Optional[str] = None
    suggested_category: Optional[str] = None
    suggested_mva_code: Optional[str] = None
    score_breakdown: dict = field(default_factory=dict)


@dataclass
class PostingBundle:
    """A bundle of scored transactions ready for Claude validation."""
    company_id: uuid.UUID
    scored_transactions: list[ScoredTransaction]
    cluster_context: str = ""
    rejection_context: str = ""
    average_confidence: float = 0.0
    bundle_ready: bool = False
    claude_approved: bool = False
    claude_reasoning: Optional[str] = None

    @property
    def tier_1_count(self) -> int:
        return sum(1 for st in self.scored_transactions if st.readiness.tier == ReadinessTier.TIER_1_DIRECT_RULE)

    @property
    def tier_2_count(self) -> int:
        return sum(1 for st in self.scored_transactions if st.readiness.tier == ReadinessTier.TIER_2_STRONG_CLUSTER)


@dataclass
class AutoPostResult:
    """Summary of what was auto-posted."""
    bilags_created: int = 0
    posterings_created: int = 0
    transactions_matched: int = 0
    skipped_low_readiness: int = 0
    skipped_tier_3: int = 0
    claude_approved: bool = False
    claude_reasoning: Optional[str] = None
    global_check_passed: bool = False
    global_check_reason: str = ""

    def to_dict(self) -> dict:
        return {
            "bilags_created": self.bilags_created,
            "posterings_created": self.posterings_created,
            "transactions_matched": self.transactions_matched,
            "skipped_low_readiness": self.skipped_low_readiness,
            "skipped_tier_3": self.skipped_tier_3,
            "claude_approved": self.claude_approved,
            "claude_reasoning": self.claude_reasoning,
            "global_check_passed": self.global_check_passed,
            "global_check_reason": self.global_check_reason,
        }


# ============================================================================
# BUNDLE CREATION (cluster-based)
# ============================================================================

async def create_posting_bundle(
    db: AsyncSession,
    company_id: uuid.UUID,
) -> tuple[PostingBundle, int, int]:
    """
    Build a bundle of transactions ready for autonomous posting.
    Uses per-transaction readiness tiers based on cluster analysis.

    Returns: (bundle, skipped_low_readiness, skipped_tier_3)
    """
    # Get active rules and filter out ineffective ones (>30% override rate)
    rule_query = select(ReconciliationRule).where(
        and_(
            ReconciliationRule.company_id == company_id,
            ReconciliationRule.is_active == True,
        )
    )
    rule_result = await db.execute(rule_query)
    all_rules = list(rule_result.scalars().all())

    # Enforce effectiveness threshold: auto-deactivate rules with >30% override rate
    rules = []
    for rule in all_rules:
        if hasattr(rule, 'is_effective') and not rule.is_effective:
            # Auto-deactivate the ineffective rule
            rule.is_active = False
            logger.warning(
                f"Auto-deactivated rule {rule.id} ({rule.description or 'unnamed'}): "
                f"override rate {rule.times_overridden}/{rule.times_applied} exceeds 30%"
            )
        else:
            rules.append(rule)

    # Get cluster summaries
    clusters = await get_cluster_summaries(db, company_id)
    cluster_context = format_clusters_for_prompt(clusters)

    # Get unmatched, non-private transactions
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company_id,
            BankTransaction.is_private == False,
            BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
        )
    )
    tx_result = await db.execute(tx_query)
    transactions = tx_result.scalars().all()

    eligible: list[ScoredTransaction] = []
    skipped_low = 0
    skipped_tier_3 = 0
    matcher = create_matcher(db)

    for tx in transactions:
        # Check if any rule matches
        rule_action = await matcher.apply_rules(tx)

        # Score against rules for additional context
        best_score = 0.0
        best_rule = None
        best_breakdown: dict = {}
        for rule in rules:
            if rule.rule_type == RuleType.IGNORE:
                continue
            score, breakdown = score_transaction_against_rule(tx, rule)
            if score > best_score:
                best_score = score
                best_rule = rule
                best_breakdown = breakdown

        # Compute readiness tier
        readiness = compute_readiness_tier(
            transaction=tx,
            rule_action=rule_action,
            clusters=clusters,
            bilag_match_score=best_score,
            suggested_account=best_rule.action.get("account") if best_rule else None,
            suggested_category=best_rule.action.get("category") if best_rule else None,
        )

        action = best_rule.action if best_rule else {}
        scored = ScoredTransaction(
            transaction=tx,
            readiness=readiness,
            best_rule=best_rule,
            confidence_score=readiness.confidence_score,
            suggested_account=action.get("account") or (tx.suggested_account if hasattr(tx, "suggested_account") else None),
            suggested_category=action.get("category"),
            suggested_mva_code=action.get("mva_code"),
            score_breakdown=best_breakdown,
        )

        # Only Tier 1 and Tier 2 are eligible for auto-posting
        if readiness.tier <= ReadinessTier.TIER_2_STRONG_CLUSTER:
            eligible.append(scored)
        elif readiness.tier == ReadinessTier.TIER_3_GROWING_CLUSTER:
            skipped_tier_3 += 1
        else:
            skipped_low += 1

    avg_confidence = (
        sum(s.confidence_score for s in eligible) / len(eligible)
        if eligible else 0.0
    )

    # Gather rejection context for sectors relevant to this bundle
    rejection_text = ""
    if eligible:
        try:
            from services.rejection_context import gather_rejection_context, compact_if_needed, format_for_prompt
            from models.company import Company
            rejection_sectors = await gather_rejection_context(db, company_id)
            relevant = {(st.suggested_account, st.suggested_category) for st in eligible if st.suggested_account}
            await compact_if_needed(db, company_id, rejection_sectors)
            co = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
            co_summaries = co.rejection_summaries if co else None
            rejection_text = format_for_prompt(rejection_sectors, relevant, compacted_summaries=co_summaries)
        except Exception as e:
            logger.warning(f"Failed to gather rejection context: {e}")

    bundle = PostingBundle(
        company_id=company_id,
        scored_transactions=eligible,
        cluster_context=cluster_context,
        rejection_context=rejection_text,
        average_confidence=round(avg_confidence, 4),
        bundle_ready=len(eligible) > 0,
    )

    return bundle, skipped_low, skipped_tier_3


# ============================================================================
# CLAUDE VALIDATION (with prompt caching)
# ============================================================================

# Static system prompt — cached across batch calls (per CLAUDE.md cost rules)
VALIDATION_SYSTEM_PROMPT = """Du er Ciri, en AI-regnskapsfører for norske småbedrifter.
Du mottar en batch med transaksjoner som er vurdert for automatisk bokføring.
Hver transaksjon har en beredskapsgrad (tier) basert på suksessklynger og regler.

Din oppgave:
1. Gjennomgå hver transaksjon og vurder om kontoforslaget er riktig
2. Sjekk at MVA-kode stemmer med transaksjontype
3. Flagg uvanlige beløp eller mistenkelige mønstre
4. Godkjenn batchen kun hvis alle transaksjoner ser rimelige ut

Avvisningshistorikk:
Hvis oppgitt, vurder om foreslatte kontoer har gjentatte avvisninger. Et monster
av avvisninger (f.eks. 3+ like) bor senke tilliten. Flagg slike transaksjoner,
men godkjenn batchen hvis du mener forslagene er riktige tross historikken.

Svar ALLTID i JSON-format:
{
    "approved": true/false,
    "reasoning": "Kort forklaring på norsk",
    "flagged_indices": [],
    "corrections": []
}"""


async def validate_bundle_with_claude(
    bundle: PostingBundle,
) -> PostingBundle:
    """
    Validate posting bundle with Claude using prompt caching.

    System prompt + cluster context are cached (static within batch).
    Transaction list is fresh per call.
    Uses Haiku for cost efficiency per CLAUDE.md.
    """
    if not bundle.scored_transactions:
        bundle.claude_approved = False
        bundle.claude_reasoning = "Ingen transaksjoner i bundle"
        return bundle

    import anthropic

    # Build transaction summaries for Claude
    tx_summaries = []
    for i, st in enumerate(bundle.scored_transactions):
        tx = st.transaction
        tx_summaries.append({
            "index": i,
            "description": tx.raw_description,
            "amount": str(tx.amount),
            "date": str(tx.booking_date),
            "merchant": tx.merchant_name,
            "suggested_account": st.suggested_account,
            "suggested_category": st.suggested_category,
            "mva_code": st.suggested_mva_code,
            "readiness_tier": st.readiness.tier,
            "readiness_label": st.readiness.tier_label,
            "confidence": st.confidence_score,
            "rule_name": st.best_rule.name if st.best_rule else None,
        })

    rejection_section = f"\n\n{bundle.rejection_context}" if bundle.rejection_context else ""

    user_content = f"""Suksessklynger for denne bedriften:
{bundle.cluster_context}{rejection_section}

Transaksjoner til godkjenning ({len(tx_summaries)} stk):
{json.dumps(tx_summaries, indent=2, ensure_ascii=False, default=str)}"""

    try:
        client = anthropic.AsyncAnthropic()
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            stop_sequences=["```"],
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": VALIDATION_SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    },
                    {
                        "type": "text",
                        "text": user_content,
                    },
                ],
            }],
        )

        # Log cache performance
        input_tokens = message.usage.input_tokens
        output_tokens = message.usage.output_tokens
        cached_tokens = getattr(message.usage, "cache_read_input_tokens", 0)
        logger.info(
            f"Claude validation: {input_tokens} input ({cached_tokens} cached), "
            f"{output_tokens} output"
        )

        response_text = message.content[0].text
        try:
            result = json.loads(response_text)
            bundle.claude_approved = result.get("approved", False)
            bundle.claude_reasoning = result.get("reasoning", "")

            flagged = result.get("flagged_indices", [])
            if flagged:
                logger.info(f"Claude flagged {len(flagged)} transactions for manual review")
        except json.JSONDecodeError:
            bundle.claude_approved = False
            bundle.claude_reasoning = f"Kunne ikke tolke Claude-svar: {response_text[:200]}"

    except Exception as e:
        logger.error(f"Claude validation failed: {e}")
        bundle.claude_approved = False
        bundle.claude_reasoning = f"Claude-validering feilet: {str(e)}"

    return bundle


# ============================================================================
# AUTO-POST EXECUTION
# ============================================================================

async def execute_autonomous_posting(
    db: AsyncSession,
    company_id: uuid.UUID,
) -> AutoPostResult:
    """
    Full autonomous posting pipeline with cluster-based readiness:
    1. Check global safety minimums (≥5 reliable rules, ≥1 strong cluster)
    2. Verify company is in AUTONOMOUS mode
    3. Compute per-transaction readiness tiers
    4. Bundle Tier 1 + Tier 2 transactions
    5. Claude validates with cluster context (prompt cached)
    6. Create bilags + posteringer
    7. Record cluster data points for completed postings
    """
    result = AutoPostResult()

    # --- Step 1: Check global safety minimums ---
    passes, reason = await check_global_minimums(db, company_id)
    result.global_check_passed = passes
    result.global_check_reason = reason

    if not passes:
        logger.info(f"Company {company_id} failed global minimums: {reason}")
        return result

    # --- Step 2: Check autonomy mode ---
    company_query = select(Company).where(Company.id == company_id)
    company_result = await db.execute(company_query)
    company = company_result.scalar_one_or_none()

    if not company or company.autonomy_level != AutonomyLevel.AUTONOMOUS:
        logger.info(f"Company {company_id} not in autonomous mode, skipping")
        return result

    # --- Step 3 & 4: Compute readiness and bundle ---
    bundle, skipped_low, skipped_tier_3 = await create_posting_bundle(db, company_id)
    result.skipped_low_readiness = skipped_low
    result.skipped_tier_3 = skipped_tier_3

    if not bundle.bundle_ready:
        logger.info("No transactions eligible for auto-posting")
        return result

    logger.info(
        f"Bundle: {bundle.tier_1_count} Tier 1, {bundle.tier_2_count} Tier 2, "
        f"{skipped_tier_3} Tier 3 (skipped), {skipped_low} Tier 4 (skipped)"
    )

    # --- Step 5: Claude validation ---
    bundle = await validate_bundle_with_claude(bundle)
    result.claude_approved = bundle.claude_approved
    result.claude_reasoning = bundle.claude_reasoning

    if not bundle.claude_approved:
        logger.info(f"Claude rejected bundle: {bundle.claude_reasoning}")
        return result

    # --- Step 6: Create bilags and posteringer ---
    now = datetime.now(timezone.utc)

    count_result = await db.execute(
        select(func.count()).where(Bilag.company_id == company_id)
    )
    bilag_seq = (count_result.scalar() or 0) + 1

    for scored_tx in bundle.scored_transactions:
        tx = scored_tx.transaction

        bilag_number = f"{now.year}-{bilag_seq:05d}"
        bilag_seq += 1

        # Determine reasoning based on tier
        tier_label = scored_tx.readiness.tier_label
        rule_name = scored_tx.best_rule.name if scored_tx.best_rule else "klynge-match"
        reasoning = (
            f"Autonom bokføring — {tier_label} "
            f"(konfidens: {scored_tx.confidence_score:.0%}, "
            f"regel: {rule_name}). Godkjent av Claude."
        )

        bilag = Bilag(
            company_id=company_id,
            bilag_number=bilag_number,
            document_date=tx.booking_date,
            receipt_date=now,
            description=tx.cleaned_description or tx.raw_description,
            gross_amount=abs(tx.amount),
            net_amount=abs(tx.amount),
            mva_amount=Decimal("0"),
            mva_code=scored_tx.suggested_mva_code or "0",
            counterparty_name=tx.merchant_name or tx.raw_description,
            category=scored_tx.suggested_category,
            suggested_account=scored_tx.suggested_account,
            status=BilagStatus.APPROVED,
            created_by_ciri=True,
            ciri_confidence=scored_tx.confidence_score,
            ciri_reasoning=reasoning,
            source_rule_id=scored_tx.best_rule.id if scored_tx.best_rule else None,
        )
        bilag.set_retention(
            fiscal_year=tx.booking_date.year if tx.booking_date else now.year,
            category="regnskap",
        )

        # Assess periodisering potential before flushing
        try:
            from services.periodisering_service import (
                assess_periodisering,
                build_suggestion_from_assessment,
                create_periodisering_notification,
            )
            assessment = await assess_periodisering(
                description=bilag.description,
                amount=float(abs(tx.amount)),
                account_number=scored_tx.suggested_account,
                counterparty=tx.merchant_name,
                document_date=str(tx.booking_date) if tx.booking_date else None,
                category=scored_tx.suggested_category,
            )
            suggestion = build_suggestion_from_assessment(
                assessment=assessment,
                total_amount=float(abs(tx.amount)),
                document_date=str(tx.booking_date) if tx.booking_date else None,
                expense_account=scored_tx.suggested_account,
            ) if assessment else None

            if suggestion:
                bilag.periodisering_suggestion = suggestion
            bilag.periodisering_scanned_at = now
        except Exception as e:
            # Don't set periodisering_scanned_at on transient failures
            # so the weekly scan can retry this bilag later
            logger.warning(f"Periodisering assessment failed for auto-posted bilag: {e}")

        db.add(bilag)
        await db.flush()

        # Create notification after flush (bilag.id now available)
        if bilag.periodisering_suggestion and bilag.periodisering_suggestion.get("is_candidate"):
            try:
                create_periodisering_notification(db, bilag, bilag.periodisering_suggestion)
            except Exception as e:
                logger.warning(f"Failed to create periodisering notification: {e}")

        result.bilags_created += 1

        # Create posteringer (double-entry)
        account = scored_tx.suggested_account or "7700"
        journal_id = f"J-{bilag.bilag_number}"
        period = tx.booking_date.strftime("%Y-%m") if tx.booking_date else now.strftime("%Y-%m")
        base_saft_id = f"SAFT-{bilag.bilag_number}"

        postering_debit = Postering(
            company_id=company_id,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=tx.booking_date,
            period=period,
            account_number=account,
            description=bilag.description,
            debit_amount=abs(tx.amount) if float(tx.amount) < 0 else Decimal("0"),
            credit_amount=abs(tx.amount) if float(tx.amount) >= 0 else Decimal("0"),
            mva_code=scored_tx.suggested_mva_code or "0",
            mva_amount=Decimal("0"),
            saft_transaction_id=f"{base_saft_id}-01",
            created_by_ciri=True,
        )
        db.add(postering_debit)

        postering_credit = Postering(
            company_id=company_id,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=tx.booking_date,
            period=period,
            account_number="1920",
            description=bilag.description,
            debit_amount=abs(tx.amount) if float(tx.amount) >= 0 else Decimal("0"),
            credit_amount=abs(tx.amount) if float(tx.amount) < 0 else Decimal("0"),
            mva_code="0",
            mva_amount=Decimal("0"),
            saft_transaction_id=f"{base_saft_id}-02",
            created_by_ciri=True,
        )
        db.add(postering_credit)
        result.posterings_created += 2

        # Update transaction status
        tx.reconciliation_status = ReconciliationStatus.MATCHED
        tx.reconciled_at = now
        tx.reconciled_by_ciri = True
        if scored_tx.suggested_category:
            try:
                tx.category = TransactionCategory(scored_tx.suggested_category)
            except ValueError:
                pass
        result.transactions_matched += 1

        # --- Step 7: Record cluster data point for auto-posted transaction ---
        desc_key = ReconciliationMatcher._extract_key_pattern_static(tx.raw_description or "")
        tx_direction = "debit" if float(tx.amount) < 0 else "credit"
        await record_data_point(
            db,
            company_id=company_id,
            account_number=account,
            category=scored_tx.suggested_category or "ukategorisert",
            merchant_name=tx.merchant_name,
            description_key=desc_key,
            amount=float(tx.amount),
            direction=tx_direction,
            source=DataPointSource.AUTO_CONFIRMED,
            rule_id=scored_tx.best_rule.id if scored_tx.best_rule else None,
            transaction_id=tx.id,
        )

        # Update rule stats (only if rule actually drove the decision)
        if scored_tx.best_rule and scored_tx.readiness.tier == ReadinessTier.TIER_1_DIRECT_RULE:
            scored_tx.best_rule.record_application()

    await db.flush()

    logger.info(
        f"Autonomous posting complete: {result.bilags_created} bilags, "
        f"{result.posterings_created} posterings, "
        f"{result.transactions_matched} transactions matched"
    )

    return result
