"""
Batch Reconciliation Background Task
Runs every 30 minutes to match unmatched transactions using Claude AI.

Flow:
1. Per company with active bank connections
2. Query unmatched transactions + unmatched bilags
3. Run algorithmic matcher first (free, fast)
4. For remaining unmatched: call Claude batch matcher
5. Apply results based on autonomy_level
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session_maker
from models import (
    BankAccount, BankAccountStatus,
    BankTransaction, ReconciliationStatus,
    ReconciliationMatch, MatchType, MatchConfidence, MatchStatus,
    Bilag, BilagStatus,
    Company, AutonomyLevel,
)
from services.reconciliation_matcher import create_matcher
from services.claude_batch_matcher import batch_match, MatchResult

logger = logging.getLogger(__name__)

RECONCILE_INTERVAL_SECONDS = 30 * 60  # 30 minutes

_task_running = False
_task_handle: Optional[asyncio.Task] = None


async def run_batch_reconciliation():
    """Run batch reconciliation for all companies with active bank connections."""
    logger.info("Starting batch reconciliation cycle...")

    async with async_session_maker() as db:
        # Get companies with active bank accounts
        company_query = (
            select(Company)
            .join(BankAccount, BankAccount.company_id == Company.id)
            .where(BankAccount.status == BankAccountStatus.ACTIVE)
            .distinct()
        )
        result = await db.execute(company_query)
        companies = result.scalars().all()

        if not companies:
            logger.info("No companies with active bank connections")
            return

        for company in companies:
            try:
                await _reconcile_company(company, db)
                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.error(f"Batch reconciliation error for {company.name}: {e}")

    logger.info("Batch reconciliation cycle complete")


async def _reconcile_company(company: Company, db: AsyncSession):
    """Run reconciliation for a single company."""
    # Get unmatched transactions
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company.id,
            BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
            BankTransaction.is_private == False,
        )
    ).order_by(BankTransaction.booking_date.desc()).limit(200)

    tx_result = await db.execute(tx_query)
    unmatched_txs = tx_result.scalars().all()

    if not unmatched_txs:
        return

    # Phase 1: Algorithmic matcher (free, fast)
    matcher = create_matcher(db)
    algo_matched = 0

    for tx in list(unmatched_txs):
        try:
            match = await matcher.auto_reconcile(tx, company.autonomy_level)
            if match:
                algo_matched += 1
        except Exception as e:
            logger.warning(f"Algorithmic match error for tx {tx.id}: {e}")

    # Clear cached bilags/rules since some may have been matched/posted
    matcher.clear_cache()

    if algo_matched > 0:
        await db.flush()
        logger.info(f"Algorithmic matcher: {algo_matched} matches for {company.name}")

    # Filter to still-unmatched transactions (no extra DB query needed)
    remaining_txs = [
        tx for tx in unmatched_txs
        if tx.reconciliation_status == ReconciliationStatus.UNMATCHED
    ][:100]

    if not remaining_txs:
        return

    # Get unmatched bilags
    bilag_query = select(Bilag).where(
        and_(
            Bilag.company_id == company.id,
            Bilag.status.in_([BilagStatus.PENDING, BilagStatus.APPROVED]),
        )
    ).order_by(Bilag.document_date.desc()).limit(100)

    bilag_result = await db.execute(bilag_query)
    bilags = bilag_result.scalars().all()

    if not bilags:
        return

    # Phase 2: Claude batch matcher
    tx_dicts = [
        {
            "id": str(tx.id),
            "date": tx.booking_date.isoformat(),
            "amount": float(abs(tx.amount)),
            "description": tx.raw_description,
            "merchant_name": tx.merchant_name or tx.cleaned_description or "",
        }
        for tx in remaining_txs
    ]

    bilag_dicts = [
        {
            "id": str(b.id),
            "date": b.document_date.isoformat() if b.document_date else "",
            "gross_amount": float(abs(b.gross_amount)),
            "supplier_name": b.counterparty_name or b.description or "",
            "reference": b.bilag_number or "",
            "kid_number": "",
        }
        for b in bilags
    ]

    # Gather rejection context for relevant sectors
    from services.rejection_context import gather_rejection_context, compact_if_needed, format_for_prompt
    rejection_sectors = await gather_rejection_context(db, company.id)
    relevant = {(b.suggested_account, b.category) for b in bilags if b.suggested_account}
    await compact_if_needed(db, company.id, rejection_sectors)
    company_summaries = company.rejection_summaries if hasattr(company, 'rejection_summaries') else None
    rejection_text = format_for_prompt(rejection_sectors, relevant, compacted_summaries=company_summaries)

    batch_result = await batch_match(tx_dicts, bilag_dicts, company.id, rejection_context=rejection_text)

    if not batch_result.matches:
        logger.info(f"Claude batch: no matches for {company.name}")
        return

    # Apply results based on autonomy level
    tx_map = {tx.id: tx for tx in remaining_txs}
    bilag_map = {b.id: b for b in bilags}
    claude_applied = 0

    for match_result in batch_result.matches:
        tx = tx_map.get(match_result.tx_id)
        bilag = bilag_map.get(match_result.bilag_id)

        if not tx or not bilag:
            continue

        # Skip if already matched (race condition guard)
        if tx.reconciliation_status != ReconciliationStatus.UNMATCHED:
            continue

        should_auto_confirm = (
            company.autonomy_level == AutonomyLevel.AUTONOMOUS
            and match_result.confidence >= 0.75
        )

        # Both ASSISTANT and AUTONOMOUS modes create match records
        # ASSISTANT auto-confirms HIGH only; AUTONOMOUS auto-confirms HIGH+MEDIUM

        confidence_level = (
            MatchConfidence.HIGH if match_result.confidence >= 0.9
            else MatchConfidence.MEDIUM if match_result.confidence >= 0.7
            else MatchConfidence.LOW
        )

        rec_match = ReconciliationMatch(
            company_id=company.id,
            bank_transaction_id=tx.id,
            bilag_id=bilag.id,
            match_type=MatchType.ONE_TO_ONE,
            confidence=confidence_level,
            confidence_score=match_result.confidence,
            status=MatchStatus.AUTO_CONFIRMED if should_auto_confirm else MatchStatus.SUGGESTED,
            transaction_amount=tx.amount,
            matched_amount=bilag.gross_amount,
            difference=abs(tx.amount) - abs(bilag.gross_amount),
            match_factors={"claude_batch": True, "reasoning": match_result.reasoning},
            ciri_explanation=match_result.reasoning,
        )

        if should_auto_confirm:
            rec_match.confirmed_at = datetime.utcnow()
            tx.reconciliation_status = ReconciliationStatus.MATCHED
            tx.reconciled_at = datetime.utcnow()
            tx.reconciled_by_ciri = True
        else:
            tx.reconciliation_status = ReconciliationStatus.SUGGESTED

        db.add(rec_match)
        claude_applied += 1

    logger.info(
        f"Claude batch: {claude_applied} matches applied for {company.name} "
        f"(cost=${batch_result.total_cost_usd:.4f})"
    )


async def run_batch_reconciliation_for_company(company_id, db: AsyncSession):
    """Run batch reconciliation for a specific company (called after new bilags)."""
    company_result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        return

    try:
        await _reconcile_company(company, db)
    except Exception as e:
        logger.error(f"On-demand batch reconciliation error: {e}")


async def _batch_reconciliation_loop():
    """Main loop for the batch reconciliation background task."""
    global _task_running
    _task_running = True
    logger.info("Batch reconciliation task started")

    while _task_running:
        try:
            await run_batch_reconciliation()
        except Exception as e:
            logger.error(f"Error in batch reconciliation loop: {e}")

        await asyncio.sleep(RECONCILE_INTERVAL_SECONDS)

    logger.info("Batch reconciliation task stopped")


def start_batch_reconciliation_task():
    """Start the background task. Called from main.py."""
    global _task_handle
    if _task_handle and not _task_handle.done():
        logger.warning("Batch reconciliation already running")
        return
    _task_handle = asyncio.create_task(_batch_reconciliation_loop())
    logger.info("Batch reconciliation task scheduled")


def stop_batch_reconciliation_task():
    """Stop the background task. Called from main.py."""
    global _task_running, _task_handle
    _task_running = False
    if _task_handle and not _task_handle.done():
        _task_handle.cancel()
        logger.info("Batch reconciliation task cancelled")
