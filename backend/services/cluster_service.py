"""
Cluster Service
Manages success clusters — statistical profiles of confirmed posting outcomes.
Used to assess per-transaction readiness for autonomous posting.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from typing import Optional
from difflib import SequenceMatcher

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.cluster_data_point import ClusterDataPoint, DataPointSource
from models.bank_transaction import BankTransaction

logger = logging.getLogger(__name__)


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class ClusterSummary:
    """Computed summary of a success cluster."""
    company_id: uuid.UUID
    account_number: str
    category: str

    # Volume
    total_points: int = 0
    distinct_merchants: int = 0
    overridden_count: int = 0

    # Amount stats
    amount_min: float = 0.0
    amount_max: float = 0.0
    amount_p5: float = 0.0
    amount_p95: float = 0.0
    amount_median: float = 0.0

    # Direction
    dominant_direction: str = "debit"

    # Recency
    recency_ratio: float = 0.0
    first_confirmed_at: Optional[datetime] = None
    last_confirmed_at: Optional[datetime] = None

    # Computed
    strength: float = 0.0
    strength_level: str = "weak"  # weak, growing, strong

    # Example merchants for Claude prompt
    example_merchants: list[str] = field(default_factory=list)

    # All description keys (for fit scoring)
    description_keys: list[str] = field(default_factory=list)


@dataclass
class ClusterFitResult:
    """Result of scoring a transaction against a cluster."""
    cluster: ClusterSummary
    direction_fit: float = 0.0
    amount_fit: float = 0.0
    description_similarity: float = 0.0
    total_fit: float = 0.0
    fit_level: str = "none"  # none, partial, high


class ReadinessTier:
    """Per-transaction readiness tiers."""
    TIER_1_DIRECT_RULE = 1
    TIER_2_STRONG_CLUSTER = 2
    TIER_3_GROWING_CLUSTER = 3
    TIER_4_UNKNOWN = 4


@dataclass
class ReadinessResult:
    """Readiness assessment for a single transaction."""
    tier: int
    tier_label: str
    confidence_score: float = 0.0
    rule_name: Optional[str] = None
    cluster_summary: Optional[ClusterSummary] = None
    cluster_fit: Optional[ClusterFitResult] = None


# ============================================================================
# STRENGTH THRESHOLDS
# ============================================================================

MIN_POINTS_FOR_CLUSTER = 8
MIN_MERCHANTS_FOR_CLUSTER = 3
MAX_OVERRIDE_RATE = 0.20
STRONG_THRESHOLD = 0.75
GROWING_THRESHOLD = 0.50

# Strength formula weights
WEIGHT_VOLUME = 0.30
WEIGHT_DIVERSITY = 0.30
WEIGHT_RELIABILITY = 0.25
WEIGHT_RECENCY = 0.15

# Volume normalization: 15 data points = full score
VOLUME_NORMALIZATION = 15
DIVERSITY_NORMALIZATION = 4
RECENCY_WINDOW_DAYS = 90

# Fit scoring weights
FIT_WEIGHT_DIRECTION = 0.3
FIT_WEIGHT_AMOUNT = 0.4
FIT_WEIGHT_DESCRIPTION = 0.3


# ============================================================================
# RECORDING DATA POINTS
# ============================================================================

async def record_data_point(
    db: AsyncSession,
    *,
    company_id: uuid.UUID,
    account_number: str,
    category: str,
    merchant_name: Optional[str],
    description_key: Optional[str],
    amount: float,
    direction: str,
    source: DataPointSource,
    match_id: Optional[uuid.UUID] = None,
    rule_id: Optional[uuid.UUID] = None,
    transaction_id: Optional[uuid.UUID] = None,
) -> ClusterDataPoint:
    """Record a confirmed posting outcome as a cluster data point."""
    point = ClusterDataPoint(
        company_id=company_id,
        account_number=account_number,
        category=category,
        merchant_name=merchant_name,
        description_key=description_key,
        amount=abs(amount),
        direction=direction,
        source=source,
        match_id=match_id,
        rule_id=rule_id,
        transaction_id=transaction_id,
        confirmed_at=datetime.utcnow(),
    )
    db.add(point)
    return point


async def mark_data_point_overridden(
    db: AsyncSession,
    transaction_id: uuid.UUID,
    overridden_by: Optional[uuid.UUID] = None,
) -> int:
    """Mark all data points for a transaction as overridden. Returns count."""
    result = await db.execute(
        select(ClusterDataPoint).where(
            and_(
                ClusterDataPoint.transaction_id == transaction_id,
                ClusterDataPoint.was_overridden == False,
            )
        )
    )
    points = result.scalars().all()
    now = datetime.utcnow()
    for point in points:
        point.was_overridden = True
        point.overridden_at = now
        point.overridden_by = overridden_by
    return len(points)


# ============================================================================
# CLUSTER SUMMARIES
# ============================================================================

async def get_cluster_summaries(
    db: AsyncSession,
    company_id: uuid.UUID,
    min_points: int = 1,
) -> list[ClusterSummary]:
    """
    Compute cluster summaries for a company.
    Returns all clusters with at least min_points data points.
    """
    # Get all data points for the company
    result = await db.execute(
        select(ClusterDataPoint).where(
            ClusterDataPoint.company_id == company_id
        ).order_by(ClusterDataPoint.confirmed_at.desc())
    )
    all_points = result.scalars().all()

    if not all_points:
        return []

    # Group by (account_number, category)
    groups: dict[tuple[str, str], list[ClusterDataPoint]] = {}
    for p in all_points:
        key = (p.account_number, p.category)
        groups.setdefault(key, []).append(p)

    now = datetime.utcnow()
    cutoff = now - timedelta(days=RECENCY_WINDOW_DAYS)
    # Handle mixed naive/aware datetimes during migration
    cutoff_aware = cutoff.replace(tzinfo=timezone.utc) if cutoff.tzinfo is None else cutoff
    summaries = []

    for (account, category), points in groups.items():
        if len(points) < min_points:
            continue

        amounts = sorted([float(p.amount) for p in points])
        merchants = set()
        desc_keys = []
        overridden = 0
        recent = 0
        directions: dict[str, int] = {}

        for p in points:
            if p.merchant_name:
                merchants.add(p.merchant_name.upper())
            if p.description_key:
                desc_keys.append(p.description_key.upper())
            if p.was_overridden:
                overridden += 1
            if p.confirmed_at:
                # Handle mixed naive/aware timestamps during migration
                ca = p.confirmed_at.replace(tzinfo=timezone.utc) if p.confirmed_at.tzinfo is None else p.confirmed_at
                if ca > cutoff_aware:
                    recent += 1
            d = p.direction or "debit"
            directions[d] = directions.get(d, 0) + 1

        n = len(points)
        dominant_dir = max(directions, key=lambda k: directions[k]) if directions else "debit"

        # Percentiles
        def percentile(arr: list[float], pct: float) -> float:
            if not arr:
                return 0.0
            idx = pct * (len(arr) - 1)
            lo = int(idx)
            hi = min(lo + 1, len(arr) - 1)
            frac = idx - lo
            return arr[lo] * (1 - frac) + arr[hi] * frac

        # Example merchants (top 3 by frequency)
        merchant_counts: dict[str, int] = {}
        for p in points:
            if p.merchant_name:
                m = p.merchant_name.upper()
                merchant_counts[m] = merchant_counts.get(m, 0) + 1
        top_merchants = sorted(merchant_counts, key=lambda k: merchant_counts[k], reverse=True)[:3]

        summary = ClusterSummary(
            company_id=company_id,
            account_number=account,
            category=category,
            total_points=n,
            distinct_merchants=len(merchants),
            overridden_count=overridden,
            amount_min=amounts[0] if amounts else 0,
            amount_max=amounts[-1] if amounts else 0,
            amount_p5=percentile(amounts, 0.05),
            amount_p95=percentile(amounts, 0.95),
            amount_median=percentile(amounts, 0.50),
            dominant_direction=dominant_dir,
            recency_ratio=recent / n if n > 0 else 0,
            first_confirmed_at=points[-1].confirmed_at if points else None,
            last_confirmed_at=points[0].confirmed_at if points else None,
            example_merchants=top_merchants,
            description_keys=list(set(desc_keys)),
        )

        # Compute strength
        summary.strength = compute_cluster_strength(summary)

        # Strength level: "strong" requires hard minimums on top of score
        override_rate = overridden / n if n > 0 else 0
        meets_hard_minimums = (
            n >= MIN_POINTS_FOR_CLUSTER
            and len(merchants) >= MIN_MERCHANTS_FOR_CLUSTER
            and override_rate <= MAX_OVERRIDE_RATE
        )

        if summary.strength >= STRONG_THRESHOLD and meets_hard_minimums:
            summary.strength_level = "strong"
        elif summary.strength >= GROWING_THRESHOLD:
            summary.strength_level = "growing"
        else:
            summary.strength_level = "weak"

        summaries.append(summary)

    # Sort by strength descending
    summaries.sort(key=lambda s: s.strength, reverse=True)
    return summaries


def compute_cluster_strength(cluster: ClusterSummary) -> float:
    """
    Compute cluster strength score (0.0–1.0).

    Always returns a progressive score so users see clusters growing.
    Hard minimums only gate the "strong" threshold (applied in strength_level),
    not the score itself.
    """
    n = cluster.total_points
    if n == 0:
        return 0.0

    override_rate = cluster.overridden_count / n

    # High override rate caps strength severely
    if override_rate > MAX_OVERRIDE_RATE:
        return round(min(0.1, n / VOLUME_NORMALIZATION * 0.1), 4)

    volume_score = min(1.0, n / VOLUME_NORMALIZATION)
    diversity_score = min(1.0, cluster.distinct_merchants / DIVERSITY_NORMALIZATION)
    reliability_score = 1.0 - override_rate
    recency_score = max(0.3, cluster.recency_ratio)

    strength = (
        volume_score * WEIGHT_VOLUME
        + diversity_score * WEIGHT_DIVERSITY
        + reliability_score * WEIGHT_RELIABILITY
        + recency_score * WEIGHT_RECENCY
    )
    return round(strength, 4)


# ============================================================================
# CLUSTER FIT SCORING
# ============================================================================

def score_transaction_cluster_fit(
    tx_description_key: Optional[str],
    tx_amount: float,
    tx_direction: str,
    cluster: ClusterSummary,
) -> ClusterFitResult:
    """
    Score how well a transaction fits into a cluster's profile.
    Returns a ClusterFitResult with fit level.
    """
    result = ClusterFitResult(cluster=cluster)

    # Direction fit: does tx direction match the dominant direction?
    result.direction_fit = 1.0 if tx_direction == cluster.dominant_direction else 0.0

    # Amount fit: is tx amount within the cluster's p5-p95 range?
    tx_abs = abs(tx_amount)
    if cluster.amount_p5 <= tx_abs <= cluster.amount_p95:
        result.amount_fit = 1.0
    elif cluster.amount_min <= tx_abs <= cluster.amount_max:
        # Within full range but outside p5-p95
        result.amount_fit = 0.5
    else:
        # Check if within 2x the range
        range_size = cluster.amount_p95 - cluster.amount_p5
        if range_size > 0:
            lower = cluster.amount_p5 - range_size
            upper = cluster.amount_p95 + range_size
            if lower <= tx_abs <= upper:
                result.amount_fit = 0.25
            else:
                result.amount_fit = 0.0
        else:
            result.amount_fit = 0.0

    # Description similarity: best match against any description key in cluster
    if tx_description_key and cluster.description_keys:
        tx_key = tx_description_key.upper()
        best_sim = 0.0
        for dk in cluster.description_keys:
            sim = SequenceMatcher(None, tx_key, dk).ratio()
            if sim > best_sim:
                best_sim = sim
        result.description_similarity = best_sim if best_sim > 0.4 else 0.0
    else:
        result.description_similarity = 0.0

    # Total fit
    result.total_fit = round(
        result.direction_fit * FIT_WEIGHT_DIRECTION
        + result.amount_fit * FIT_WEIGHT_AMOUNT
        + result.description_similarity * FIT_WEIGHT_DESCRIPTION,
        4,
    )

    if result.total_fit >= 0.70:
        result.fit_level = "high"
    elif result.total_fit >= 0.40:
        result.fit_level = "partial"
    else:
        result.fit_level = "none"

    return result


# ============================================================================
# READINESS TIER COMPUTATION
# ============================================================================

def compute_readiness_tier(
    transaction: BankTransaction,
    rule_action: Optional[dict],
    clusters: list[ClusterSummary],
    bilag_match_score: float = 0.0,
    suggested_account: Optional[str] = None,
    suggested_category: Optional[str] = None,
) -> ReadinessResult:
    """
    Compute the readiness tier for a specific transaction.

    Tier 1: Direct rule match (tested, <20% override)
    Tier 2: Strong cluster + bilag match (score ≥ 0.65)
    Tier 3: Growing cluster + bilag match
    Tier 4: No cluster support (never auto-post)
    """
    # Extract key pattern for fit scoring
    from services.reconciliation_matcher import ReconciliationMatcher
    desc_key = ReconciliationMatcher._extract_key_pattern_static(
        transaction.raw_description or ""
    )
    tx_direction = "debit" if (transaction.amount and float(transaction.amount) < 0) else "credit"

    # TIER 1: Direct rule match
    if rule_action:
        rule_obj = rule_action.get("_rule_obj")
        rule_name = rule_action.get("rule_name", "Unknown")
        override_rate = 0.0
        if rule_obj and rule_obj.times_applied > 0:
            override_rate = rule_obj.times_overridden / rule_obj.times_applied
        if override_rate < MAX_OVERRIDE_RATE:
            return ReadinessResult(
                tier=ReadinessTier.TIER_1_DIRECT_RULE,
                tier_label="Direkte regel",
                confidence_score=1.0 - override_rate,
                rule_name=rule_name,
            )

    # Need a bilag match for Tier 2-3
    if bilag_match_score < 0.65 or not suggested_account:
        return ReadinessResult(
            tier=ReadinessTier.TIER_4_UNKNOWN,
            tier_label="Ukjent",
            confidence_score=bilag_match_score,
        )

    # Find the best-fitting cluster for the suggested account+category
    best_fit: Optional[ClusterFitResult] = None
    best_cluster: Optional[ClusterSummary] = None

    for cluster in clusters:
        if cluster.account_number != suggested_account:
            continue
        if suggested_category and cluster.category != suggested_category:
            continue

        fit = score_transaction_cluster_fit(
            desc_key, float(transaction.amount), tx_direction, cluster
        )

        if best_fit is None or fit.total_fit > best_fit.total_fit:
            best_fit = fit
            best_cluster = cluster

    if not best_cluster or not best_fit:
        return ReadinessResult(
            tier=ReadinessTier.TIER_4_UNKNOWN,
            tier_label="Ukjent",
            confidence_score=bilag_match_score,
        )

    # TIER 2: Strong cluster with good fit
    if best_cluster.strength_level == "strong" and best_fit.fit_level == "high":
        return ReadinessResult(
            tier=ReadinessTier.TIER_2_STRONG_CLUSTER,
            tier_label="Sterk klynge",
            confidence_score=bilag_match_score * best_fit.total_fit,
            cluster_summary=best_cluster,
            cluster_fit=best_fit,
        )

    # TIER 3: Growing cluster or partial fit
    if best_cluster.strength_level in ("strong", "growing") and best_fit.fit_level in ("high", "partial"):
        return ReadinessResult(
            tier=ReadinessTier.TIER_3_GROWING_CLUSTER,
            tier_label="Voksende klynge",
            confidence_score=bilag_match_score * best_fit.total_fit * 0.8,
            cluster_summary=best_cluster,
            cluster_fit=best_fit,
        )

    # TIER 4: Weak cluster or no fit
    return ReadinessResult(
        tier=ReadinessTier.TIER_4_UNKNOWN,
        tier_label="Ukjent",
        confidence_score=bilag_match_score,
        cluster_summary=best_cluster,
        cluster_fit=best_fit,
    )


# ============================================================================
# CLUSTER SUMMARY FOR CLAUDE PROMPT
# ============================================================================

def format_clusters_for_prompt(clusters: list[ClusterSummary]) -> str:
    """Format strong/growing clusters into text for the Claude validation prompt."""
    usable = [c for c in clusters if c.strength_level in ("strong", "growing")]
    if not usable:
        return "Ingen etablerte klynger ennå."

    lines = []
    for c in usable:
        override_pct = round(c.overridden_count / c.total_points * 100) if c.total_points > 0 else 0
        merchants_str = ", ".join(c.example_merchants[:3]) if c.example_merchants else "—"
        lines.append(
            f"- Konto {c.account_number} ({c.category}): "
            f"{c.total_points} bekreftede posteringer, "
            f"{c.distinct_merchants} ulike leverandører, "
            f"kr {c.amount_p5:.0f}–{c.amount_p95:.0f}, "
            f"{override_pct}% overstyrt, "
            f"styrke: {c.strength_level.upper()}. "
            f"Eksempler: {merchants_str}."
        )
    return "\n".join(lines)


# ============================================================================
# GLOBAL MINIMUM CHECK (safety floor)
# ============================================================================

async def check_global_minimums(
    db: AsyncSession,
    company_id: uuid.UUID,
) -> tuple[bool, str]:
    """
    Check global safety minimums for autonomous posting.
    Returns (passes, reason).
    """
    from models.reconciliation_rule import ReconciliationRule

    # At least 5 non-overridden rules
    rules_result = await db.execute(
        select(ReconciliationRule).where(
            and_(
                ReconciliationRule.company_id == company_id,
                ReconciliationRule.is_active == True,
            )
        )
    )
    active_rules = rules_result.scalars().all()
    good_rules = [
        r for r in active_rules
        if r.times_applied == 0 or (r.times_overridden / r.times_applied) < MAX_OVERRIDE_RATE
    ]
    if len(good_rules) < 5:
        return False, f"Trenger minst 5 pålitelige regler (har {len(good_rules)})"

    # At least 1 strong cluster
    clusters = await get_cluster_summaries(db, company_id)
    strong_clusters = [c for c in clusters if c.strength_level == "strong"]
    if not strong_clusters:
        return False, "Trenger minst 1 sterk klynge"

    return True, "OK"
