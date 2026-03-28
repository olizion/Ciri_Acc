"""
Periodisering Scan Background Task

Runs weekly to assess manual (non-Ciri) bilags for periodisering candidates.
Auto-posted bilags are already assessed during creation — this task only
targets bilags where periodisering_scanned_at IS NULL.

Legal basis: Regnskapsloven § 4-1 nr. 3 (sammenstillingsprinsippet)
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session_maker
from models import Bilag, BilagStatus, Company

logger = logging.getLogger(__name__)

_scan_task: Optional[asyncio.Task] = None

# Run weekly — Sunday at 03:00
SCAN_TARGET_WEEKDAY = 6  # Sunday
SCAN_TARGET_HOUR = 3
BATCH_SIZE = 20


async def _periodisering_scan_loop():
    """Background loop that runs the periodisering scan weekly at Sunday 03:00."""
    logger.info("Periodisering scan task started")

    while True:
        try:
            # Calculate sleep until next Sunday 03:00
            now = datetime.now()
            days_ahead = SCAN_TARGET_WEEKDAY - now.weekday()
            if days_ahead < 0 or (days_ahead == 0 and now.hour >= SCAN_TARGET_HOUR):
                days_ahead += 7

            next_run = now.replace(
                hour=SCAN_TARGET_HOUR, minute=0, second=0, microsecond=0
            ) + timedelta(days=days_ahead)

            sleep_seconds = (next_run - now).total_seconds()
            logger.info(
                f"Periodisering scan scheduled in {sleep_seconds/3600:.1f}h "
                f"(next run: {next_run.isoformat()})"
            )
            await asyncio.sleep(sleep_seconds)

            # Run the scan
            async with async_session_maker() as db:
                await run_periodisering_scan(db)

        except asyncio.CancelledError:
            logger.info("Periodisering scan task cancelled")
            break
        except Exception as e:
            logger.error(f"Periodisering scan cycle failed: {e}", exc_info=True)
            await asyncio.sleep(3600)  # Retry after 1 hour on error


async def run_periodisering_scan(db: AsyncSession):
    """
    Scan all companies for manual bilags that haven't been assessed for periodisering.

    Only targets bilags where:
    1. periodisering_scanned_at IS NULL (never scanned by LLM)
    2. created_by_ciri = False (manual posting — auto-posted already checked)
    3. status in (APPROVED, POSTED) (not drafts or rejected)
    """
    from services.periodisering_service import (
        assess_periodisering_batch,
        build_suggestion_from_assessment,
        create_periodisering_notification,
    )

    # Get all companies
    companies = (await db.execute(select(Company))).scalars().all()
    total_scanned = 0
    total_candidates = 0

    for company in companies:
        try:
            scanned, candidates = await _scan_company(db, company.id)
            total_scanned += scanned
            total_candidates += candidates
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Periodisering scan failed for company {company.id}: {e}")

    logger.info(
        f"Periodisering scan complete: {total_scanned} bilags scanned, "
        f"{total_candidates} candidates found"
    )


async def _scan_company(db: AsyncSession, company_id) -> tuple[int, int]:
    """Scan a single company's unscanned manual bilags."""
    from services.periodisering_service import (
        assess_periodisering_batch,
        build_suggestion_from_assessment,
        create_periodisering_notification,
    )

    query = select(Bilag).where(
        and_(
            Bilag.company_id == company_id,
            Bilag.periodisering_scanned_at.is_(None),
            Bilag.created_by_ciri == False,
            Bilag.status.in_([BilagStatus.APPROVED, BilagStatus.POSTED]),
        )
    ).order_by(Bilag.created_at.asc()).limit(200)

    result = await db.execute(query)
    unscanned = result.scalars().all()

    if not unscanned:
        return 0, 0

    logger.info(f"Company {company_id}: {len(unscanned)} unscanned manual bilags")

    now = datetime.now(timezone.utc)
    total_candidates = 0

    # Process in batches for LLM efficiency
    for i in range(0, len(unscanned), BATCH_SIZE):
        batch = unscanned[i:i + BATCH_SIZE]

        # Build batch input
        batch_input = []
        for bilag in batch:
            batch_input.append({
                "description": bilag.description or "",
                "amount": float(bilag.net_amount or bilag.gross_amount or 0),
                "account_number": bilag.suggested_account,
                "counterparty": bilag.counterparty_name,
                "document_date": str(bilag.document_date) if bilag.document_date else None,
                "category": bilag.category,
            })

        # Assess batch
        assessments = await assess_periodisering_batch(batch_input)

        # Process results — only mark as scanned after successful processing
        for bilag, assessment in zip(batch, assessments):
            try:
                if assessment and assessment.get("isCandidate"):
                    suggestion = build_suggestion_from_assessment(
                        assessment=assessment,
                        total_amount=float(bilag.net_amount or bilag.gross_amount or 0),
                        document_date=str(bilag.document_date) if bilag.document_date else None,
                        expense_account=bilag.suggested_account,
                    )
                    if suggestion:
                        bilag.periodisering_suggestion = suggestion
                        create_periodisering_notification(db, bilag, suggestion)
                        total_candidates += 1

                # Only mark as scanned AFTER successful processing
                bilag.periodisering_scanned_at = now
            except Exception as e:
                # Per-bilag error isolation: skip this bilag, retry next scan
                logger.warning(f"Failed to process periodisering for bilag {bilag.id}: {e}")

        await db.flush()

    return len(unscanned), total_candidates


def start_periodisering_scan_task():
    """Start the weekly periodisering scan background task."""
    global _scan_task
    if _scan_task is None or _scan_task.done():
        _scan_task = asyncio.create_task(_periodisering_scan_loop())
        logger.info("Periodisering scan task launched")


def stop_periodisering_scan_task():
    """Stop the periodisering scan background task."""
    global _scan_task
    if _scan_task and not _scan_task.done():
        _scan_task.cancel()
        logger.info("Periodisering scan task stopped")
