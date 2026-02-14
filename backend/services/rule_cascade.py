"""
Rule Cascade Service
Retroactively applies IGNORE rules to existing transactions and bilags.

When a user creates an IGNORE rule (e.g., "all REMA 1000 = private"),
existing transactions and bilags matching that pattern should be cleaned up.

Cascade order:
1. Bank transactions → mark private + IGNORED
2. Bilags (PENDING/APPROVED only) → REJECTED
3. ReconciliationMatches (SUGGESTED only) → REJECTED
4. POSTED bilags are never touched (Bokføringsloven compliance)
"""

import uuid
import logging
from datetime import datetime, timezone
from dataclasses import dataclass

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    BankTransaction, ReconciliationStatus, TransactionCategory,
    Bilag, BilagStatus,
    ReconciliationMatch, MatchStatus,
)

logger = logging.getLogger(__name__)


@dataclass
class CascadeResult:
    """Summary of what the cascade cleaned up."""
    transactions_marked_private: int = 0
    bilags_rejected: int = 0
    matches_rejected: int = 0

    @property
    def total_affected(self) -> int:
        return (
            self.transactions_marked_private
            + self.bilags_rejected
            + self.matches_rejected
        )

    def to_dict(self) -> dict:
        return {
            "transactions_marked_private": self.transactions_marked_private,
            "bilags_rejected": self.bilags_rejected,
            "matches_rejected": self.matches_rejected,
            "total_affected": self.total_affected,
        }


async def cascade_ignore_rule(
    db: AsyncSession,
    company_id: uuid.UUID,
    criteria: dict,
    rule_name: str,
) -> CascadeResult:
    """
    Retroactively apply an IGNORE rule to existing data.

    Args:
        db: Database session
        company_id: Company to scope the cascade to
        criteria: Rule criteria dict (description_contains, amount_min, etc.)
        rule_name: Human-readable rule name for rejection reasons
    """
    result = CascadeResult()
    description_pattern = criteria.get("description_contains", "").strip()
    merchant_name = criteria.get("merchant_name", "").strip()
    amount_min = criteria.get("amount_min")
    amount_max = criteria.get("amount_max")
    direction = criteria.get("direction")

    if not description_pattern and not merchant_name:
        # No text criteria to match on — skip cascade
        return result

    # ------------------------------------------------------------------
    # 1. Mark matching bank transactions as private
    # ------------------------------------------------------------------
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company_id,
            BankTransaction.is_private == False,
            BankTransaction.reconciliation_status.in_([
                ReconciliationStatus.UNMATCHED,
                ReconciliationStatus.SUGGESTED,
            ]),
        )
    )

    # Text matching: description or merchant name
    text_filters = []
    if description_pattern:
        text_filters.append(
            func.upper(BankTransaction.raw_description).contains(description_pattern.upper())
        )
        text_filters.append(
            func.upper(BankTransaction.cleaned_description).contains(description_pattern.upper())
        )
    if merchant_name:
        text_filters.append(
            func.upper(BankTransaction.merchant_name).contains(merchant_name.upper())
        )

    if text_filters:
        tx_query = tx_query.where(or_(*text_filters))

    # Amount filters
    if amount_min is not None:
        tx_query = tx_query.where(func.abs(BankTransaction.amount) >= amount_min)
    if amount_max is not None:
        tx_query = tx_query.where(func.abs(BankTransaction.amount) <= amount_max)

    # Direction filter
    if direction == "debit":
        tx_query = tx_query.where(BankTransaction.amount < 0)
    elif direction == "credit":
        tx_query = tx_query.where(BankTransaction.amount >= 0)

    tx_result = await db.execute(tx_query)
    transactions = tx_result.scalars().all()

    affected_tx_ids = []
    for tx in transactions:
        tx.is_private = True
        tx.private_marked_at = datetime.now(timezone.utc)
        tx.private_marked_by_ciri = True
        tx.category = TransactionCategory.PRIVAT
        tx.reconciliation_status = ReconciliationStatus.IGNORED
        affected_tx_ids.append(tx.id)
        result.transactions_marked_private += 1

    # ------------------------------------------------------------------
    # 2. Reject matching bilags (PENDING and APPROVED only)
    # ------------------------------------------------------------------
    # POSTED bilags have immutable journal entries — never touch those.
    bilag_query = select(Bilag).where(
        and_(
            Bilag.company_id == company_id,
            Bilag.status.in_([BilagStatus.PENDING, BilagStatus.APPROVED]),
        )
    )

    bilag_text_filters = []
    if description_pattern:
        bilag_text_filters.append(
            func.upper(Bilag.counterparty_name).contains(description_pattern.upper())
        )
        bilag_text_filters.append(
            func.upper(Bilag.description).contains(description_pattern.upper())
        )
    if merchant_name:
        bilag_text_filters.append(
            func.upper(Bilag.counterparty_name).contains(merchant_name.upper())
        )

    if bilag_text_filters:
        bilag_query = bilag_query.where(or_(*bilag_text_filters))
    else:
        # No text to match bilags on
        bilag_query = None

    affected_bilag_ids = []
    if bilag_query is not None:
        bilag_result = await db.execute(bilag_query)
        bilags = bilag_result.scalars().all()

        rejection_reason = f"Automatisk avvist — privat utgift (regel: {rule_name})"
        for bilag in bilags:
            bilag.status = BilagStatus.REJECTED
            bilag.ciri_reasoning = rejection_reason
            affected_bilag_ids.append(bilag.id)
            result.bilags_rejected += 1

    # ------------------------------------------------------------------
    # 3. Reject suggested matches involving affected items
    # ------------------------------------------------------------------
    if affected_tx_ids or affected_bilag_ids:
        match_filters = []
        if affected_tx_ids:
            match_filters.append(
                ReconciliationMatch.bank_transaction_id.in_(affected_tx_ids)
            )
        if affected_bilag_ids:
            match_filters.append(
                ReconciliationMatch.bilag_id.in_(affected_bilag_ids)
            )

        match_query = select(ReconciliationMatch).where(
            and_(
                ReconciliationMatch.company_id == company_id,
                ReconciliationMatch.status == MatchStatus.SUGGESTED,
                or_(*match_filters),
            )
        )

        match_result = await db.execute(match_query)
        matches = match_result.scalars().all()

        for match in matches:
            match.status = MatchStatus.REJECTED
            match.user_feedback = f"Automatisk avvist — privat utgift (regel: {rule_name})"
            result.matches_rejected += 1

    if result.total_affected > 0:
        await db.flush()
        logger.info(
            f"Rule cascade '{rule_name}': "
            f"{result.transactions_marked_private} tx, "
            f"{result.bilags_rejected} bilags, "
            f"{result.matches_rejected} matches affected"
        )

    return result
