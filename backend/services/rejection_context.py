"""
Rejection Context Service
Gathers per-sector rejection history and formats it for Claude prompts.

Sectors are (account_number, category) pairs matching cluster grouping keys.
When a sector accumulates 20+ rejections, Haiku compacts them into a summary.
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

REJECTION_LOOKBACK_DAYS = 180
COMPACTION_THRESHOLD = 20
COMPACTION_STALE_THRESHOLD = 5  # Re-compact when this many new entries since last compaction


@dataclass
class RejectionEntry:
    """A single rejection event for prompt context."""
    sector_account: str
    sector_category: str
    date: datetime
    feedback: Optional[str]  # User's reason text (may be None)
    original_confidence: Optional[float]
    merchant_name: Optional[str]
    amount: Optional[float]
    source: str  # "match_rejected" or "cluster_overridden"


Sector = tuple[str, str]  # (account_number, category)


async def gather_rejection_context(
    db: AsyncSession,
    company_id: UUID,
) -> dict[Sector, list[RejectionEntry]]:
    """
    Gather all rejection events for a company, grouped by sector.

    Sources:
      1. ReconciliationMatch (status=REJECTED) — user rejected a suggested match
      2. ClusterDataPoint (was_overridden=True) — user corrected an auto-posting
    """
    cutoff = datetime.utcnow() - timedelta(days=REJECTION_LOOKBACK_DAYS)
    sectors: dict[Sector, list[RejectionEntry]] = {}

    # Source 1: Rejected matches
    from models.reconciliation_match import ReconciliationMatch, MatchStatus
    from models.bilag import Bilag

    try:
        result = await db.execute(
            select(ReconciliationMatch, Bilag.suggested_account, Bilag.category)
            .join(Bilag, ReconciliationMatch.bilag_id == Bilag.id, isouter=True)
            .where(and_(
                ReconciliationMatch.company_id == company_id,
                ReconciliationMatch.status == MatchStatus.REJECTED,
                ReconciliationMatch.created_at > cutoff,
            ))
            .order_by(ReconciliationMatch.created_at.desc())
        )
        for match, account, category in result.all():
            if not account:
                continue  # Can't determine sector without account
            sector = (account, category or "ukategorisert")
            entry = RejectionEntry(
                sector_account=account,
                sector_category=category or "ukategorisert",
                date=match.created_at,
                feedback=match.user_feedback,
                original_confidence=float(match.confidence_score) if match.confidence_score else None,
                merchant_name=None,
                amount=float(match.transaction_amount) if match.transaction_amount else None,
                source="match_rejected",
            )
            sectors.setdefault(sector, []).append(entry)
    except Exception as e:
        logger.error(f"Failed to gather rejected matches: {e}")

    # Source 2: Overridden cluster data points
    from models.cluster_data_point import ClusterDataPoint

    try:
        result = await db.execute(
            select(ClusterDataPoint).where(and_(
                ClusterDataPoint.company_id == company_id,
                ClusterDataPoint.was_overridden == True,
                ClusterDataPoint.overridden_at > cutoff,
            )).order_by(ClusterDataPoint.overridden_at.desc())
        )
        for cdp in result.scalars().all():
            sector = (cdp.account_number, cdp.category)
            entry = RejectionEntry(
                sector_account=cdp.account_number,
                sector_category=cdp.category,
                date=cdp.overridden_at or cdp.confirmed_at,
                feedback=None,
                original_confidence=None,
                merchant_name=cdp.merchant_name,
                amount=float(cdp.amount) if cdp.amount else None,
                source="cluster_overridden",
            )
            sectors.setdefault(sector, []).append(entry)
    except Exception as e:
        logger.error(f"Failed to gather overridden data points: {e}")

    # Sort each sector's entries by date descending
    for entries in sectors.values():
        entries.sort(key=lambda e: e.date or datetime.min, reverse=True)

    return sectors


async def compact_if_needed(
    db: AsyncSession,
    company_id: UUID,
    sectors: dict[Sector, list[RejectionEntry]],
) -> None:
    """
    For sectors with 20+ entries, call Haiku to create a compact summary.
    Stores summaries in Company.rejection_summaries JSONB.
    """
    from models.company import Company

    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        return

    existing_summaries = company.rejection_summaries or {}
    updated = False

    for sector, entries in sectors.items():
        if len(entries) < COMPACTION_THRESHOLD:
            continue

        sector_key = f"{sector[0]}:{sector[1]}"
        existing = existing_summaries.get(sector_key, {})
        count_at_compaction = existing.get("entry_count_at_compaction", 0)
        entries_since = len(entries) - count_at_compaction

        if entries_since < COMPACTION_STALE_THRESHOLD and existing.get("summary"):
            continue  # Existing summary is still fresh

        # Compact via Haiku
        summary = await _summarize_rejections(entries, sector)
        if summary:
            existing_summaries[sector_key] = {
                "summary": summary,
                "compacted_at": datetime.utcnow().isoformat(),
                "entry_count_at_compaction": len(entries),
            }
            updated = True
            logger.info(f"Compacted {len(entries)} rejections for sector {sector_key}")

    if updated:
        company.rejection_summaries = existing_summaries
        await db.flush()


async def _summarize_rejections(entries: list[RejectionEntry], sector: Sector) -> Optional[str]:
    """Call Haiku to summarize a large list of rejections into a compact paragraph."""
    try:
        import anthropic
        from config.settings import settings

        if not settings.anthropic_api_key:
            return None

        # Format entries for summarization
        lines = []
        for e in entries[:30]:  # Cap at 30 for token budget
            parts = []
            if e.feedback:
                parts.append(f'grunn: "{e.feedback}"')
            if e.merchant_name:
                parts.append(f"leverandor: {e.merchant_name}")
            if e.amount:
                parts.append(f"belop: kr {abs(e.amount):.0f}")
            if e.original_confidence:
                parts.append(f"konfidens: {e.original_confidence:.0%}")
            lines.append(f"  - {e.date.strftime('%Y-%m-%d') if e.date else '?'}: {', '.join(parts)}")

        bullet_list = "\n".join(lines)

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{
                "role": "user",
                "content": (
                    f"Oppsummer disse {len(entries)} avvisningene for konto {sector[0]} ({sector[1]}) "
                    f"i ett avsnitt (maks 80 ord). Fokuser pa monsteret: hvilke typer transaksjoner "
                    f"ble feil plassert her, og hva var den vanligste grunnen.\n\n{bullet_list}"
                ),
            }],
        )
        return message.content[0].text.strip()

    except Exception as e:
        logger.error(f"Rejection summary compaction failed: {e}")
        return None


def format_for_prompt(
    sectors: dict[Sector, list[RejectionEntry]],
    relevant_sectors: set[Sector] | None = None,
    compacted_summaries: dict | None = None,
) -> str:
    """
    Format rejection context as Norwegian text for injection into Claude prompt.

    Only includes sectors present in relevant_sectors (if provided).
    Returns empty string if no rejections exist for relevant sectors.
    """
    if not sectors:
        return ""

    sections = []

    for sector, entries in sectors.items():
        if relevant_sectors and sector not in relevant_sectors:
            continue
        if not entries:
            continue

        account, category = sector
        sector_key = f"{account}:{category}"

        # Check for compacted summary
        if compacted_summaries and sector_key in compacted_summaries:
            summary_data = compacted_summaries[sector_key]
            summary_text = summary_data.get("summary", "")
            count = summary_data.get("entry_count_at_compaction", len(entries))

            # Show summary + any entries since compaction
            section = f"Konto {account} ({category}) — oppsummert ({count} avvisninger):\n  {summary_text}"

            # Append recent entries since compaction
            compacted_at = summary_data.get("compacted_at")
            if compacted_at:
                recent = [e for e in entries if e.date and e.date.isoformat() > compacted_at]
                if recent:
                    section += "\n  Nye avvisninger siden oppsummering:"
                    for e in recent[:5]:
                        section += f"\n  {_format_entry(e)}"
            sections.append(section)
        else:
            # Raw list (under compaction threshold)
            header = f"Konto {account} ({category}) — {len(entries)} avvisning{'er' if len(entries) != 1 else ''}:"
            lines = [_format_entry(e) for e in entries[:10]]  # Cap display at 10
            if len(entries) > 10:
                lines.append(f"  ... og {len(entries) - 10} til")
            sections.append(header + "\n" + "\n".join(lines))

    if not sections:
        return ""

    return "AVVISNINGSHISTORIKK (tidligere avvisning betyr ikke at navarende match er feil):\n\n" + "\n\n".join(sections)


def _format_entry(entry: RejectionEntry) -> str:
    """Format a single rejection entry as a bullet point."""
    date_str = entry.date.strftime("%Y-%m-%d") if entry.date else "?"
    parts = []

    if entry.feedback:
        parts.append(f'"{entry.feedback}"')
    elif entry.merchant_name:
        parts.append(f"{entry.merchant_name} avvist")
    else:
        parts.append("avvist uten grunn")

    if entry.original_confidence:
        parts.append(f"konfidens: {entry.original_confidence:.2f}")
    if entry.amount:
        parts.append(f"kr {abs(entry.amount):,.0f}")

    return f"  * {date_str}: {' — '.join(parts)}"
