"""
Weekly Summary Generator
Generates HTML email summaries of unmatched transactions and reconciliation stats.
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    BankTransaction,
    ReconciliationStatus,
    ReconciliationMatch,
    MatchStatus,
    Bilag,
    BilagStatus,
    Company,
)

logger = logging.getLogger(__name__)


async def generate_weekly_summary(company_id, db: AsyncSession) -> str:
    """
    Generate a Norwegian HTML email summary for a company.

    Includes:
    - Overview stats (matched, unmatched, total)
    - Table of unmatched transactions
    - Call to action to send bilags
    """
    # Get company
    company_result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = company_result.scalar_one_or_none()
    if not company:
        return ""

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Count transactions by status
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company_id,
            BankTransaction.is_private == False,
        )
    )
    tx_result = await db.execute(tx_query)
    all_txs = tx_result.scalars().all()

    total = len(all_txs)
    matched = sum(1 for t in all_txs if t.reconciliation_status == ReconciliationStatus.MATCHED)
    unmatched = sum(1 for t in all_txs if t.reconciliation_status == ReconciliationStatus.UNMATCHED)
    suggested = sum(1 for t in all_txs if t.reconciliation_status == ReconciliationStatus.SUGGESTED)

    # Get unmatched transactions (most recent first, limit 20)
    unmatched_query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company_id,
            BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
            BankTransaction.is_private == False,
        )
    ).order_by(BankTransaction.booking_date.desc()).limit(20)
    unmatched_result = await db.execute(unmatched_query)
    unmatched_txs = unmatched_result.scalars().all()

    # Matches created this week
    matches_query = select(func.count(ReconciliationMatch.id)).where(
        and_(
            ReconciliationMatch.company_id == company_id,
            ReconciliationMatch.created_at >= week_ago,
            ReconciliationMatch.status.in_([MatchStatus.CONFIRMED, MatchStatus.AUTO_CONFIRMED]),
        )
    )
    matches_result = await db.execute(matches_query)
    matches_this_week = matches_result.scalar() or 0

    # Sum of unmatched amounts
    unmatched_sum = sum(abs(t.amount) for t in unmatched_txs)

    match_rate = (matched / total * 100) if total > 0 else 100.0

    # Build HTML
    html = _build_email_html(
        company_name=company.name,
        total=total,
        matched=matched,
        unmatched=unmatched,
        suggested=suggested,
        match_rate=match_rate,
        matches_this_week=matches_this_week,
        unmatched_txs=unmatched_txs,
        unmatched_sum=unmatched_sum,
    )

    return html


def _build_email_html(
    company_name: str,
    total: int,
    matched: int,
    unmatched: int,
    suggested: int,
    match_rate: float,
    matches_this_week: int,
    unmatched_txs: list,
    unmatched_sum: Decimal,
) -> str:
    """Build Norwegian HTML email body — Nordic Editorial aesthetic."""

    now = datetime.utcnow()
    week_number = now.isocalendar()[1]
    date_str = now.strftime("%d. %B %Y").lstrip("0")

    # Transaction rows with alternating tones
    tx_rows = ""
    for i, tx in enumerate(unmatched_txs):
        desc = tx.cleaned_description or tx.raw_description
        if len(desc) > 45:
            desc = desc[:42] + "..."
        bg = "#f8faf7" if i % 2 == 0 else "#ffffff"
        tx_rows += f"""
                <tr>
                    <td style="padding: 14px 16px; background: {bg}; font-size: 13px; color: #5a6b5d; font-family: 'SF Mono', 'Cascadia Mono', 'Fira Code', 'Consolas', monospace; letter-spacing: 0.02em; border-bottom: 1px solid #eef1eb;">
                        {tx.booking_date.strftime('%d.%m')}
                    </td>
                    <td style="padding: 14px 16px; background: {bg}; font-size: 14px; color: #2d3a2e; font-family: Georgia, 'Times New Roman', serif; border-bottom: 1px solid #eef1eb;">
                        {desc}
                    </td>
                    <td style="padding: 14px 16px; background: {bg}; font-size: 14px; color: #3E715C; font-weight: 600; text-align: right; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.01em; border-bottom: 1px solid #eef1eb;">
                        {abs(tx.amount):,.2f}
                    </td>
                </tr>"""

    overflow_text = ""
    if unmatched > 20:
        overflow_text = f'<p style="margin: 16px 0 0; padding: 12px 16px; font-size: 12px; color: #7a8a7c; font-style: italic; font-family: Georgia, serif; background: #f8faf7; border-radius: 6px; text-align: center;">+ {unmatched - 20} flere transaksjoner som mangler bilag</p>'

    # Build transaction section
    tx_section = ""
    if unmatched_txs:
        tx_section = f'''
    <!-- Transactions -->
    <div style="background: #ffffff; padding: 0 40px 32px;">
        <!-- Section header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
            <tr>
                <td style="padding: 0;">
                    <p style="margin: 0 0 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #96AFA8;">Trenger oppmerksomhet</p>
                    <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 400; color: #2d3a2e; letter-spacing: -0.02em;">Transaksjoner uten bilag</h2>
                </td>
                <td style="text-align: right; vertical-align: bottom;">
                    <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; color: #3E715C; letter-spacing: -0.02em;">kr {unmatched_sum:,.2f}</span>
                </td>
            </tr>
        </table>

        <!-- Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(62,113,92,0.06);">
            <thead>
                <tr>
                    <th style="padding: 10px 16px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #96AFA8; background: #3E715C; color: rgba(255,255,255,0.7); border-bottom: 2px solid #5B906F;">Dato</th>
                    <th style="padding: 10px 16px; text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; background: #3E715C; color: rgba(255,255,255,0.7); border-bottom: 2px solid #5B906F;">Beskrivelse</th>
                    <th style="padding: 10px 16px; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; background: #3E715C; color: rgba(255,255,255,0.7); border-bottom: 2px solid #5B906F;">Bel&oslash;p</th>
                </tr>
            </thead>
            <tbody>
                {tx_rows}
            </tbody>
        </table>
        {overflow_text}
    </div>
    '''

    return f"""<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Ukentlig oppsummering &ndash; {company_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2ed; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f0f2ed;">
<tr><td style="padding: 32px 16px;">

<!-- Main container -->
<table width="600" cellpadding="0" cellspacing="0" align="center" role="presentation" style="max-width: 600px; width: 100%; margin: 0 auto;">

    <!-- Header -->
    <tr><td style="padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(160deg, #2d4a3e 0%, #3E715C 35%, #5B906F 70%, #7aa88a 100%); border-radius: 16px 16px 0 0;">
            <tr><td style="padding: 48px 40px 40px;">

                <!-- Top bar: week label -->
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.5); padding-bottom: 24px;">
                        Uke {week_number} &middot; {company_name}
                    </td>
                    <td style="text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; letter-spacing: 0.08em; color: rgba(255,255,255,0.4); padding-bottom: 24px;">
                        &#9679; CIRI
                    </td>
                </tr></table>

                <!-- Title -->
                <h1 style="margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; font-weight: 400; color: #ffffff; letter-spacing: -0.03em; line-height: 1.15;">
                    Ukentlig<br>oppsummering
                </h1>

                <!-- Decorative line -->
                <div style="width: 48px; height: 2px; background: rgba(207,206,161,0.5); margin: 20px 0 16px; border-radius: 1px;"></div>

                <!-- Subtitle -->
                <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-style: italic; color: rgba(255,255,255,0.65); line-height: 1.5;">
                    Din &oslash;konomiske puls &mdash; alt p&aring; ett sted.
                </p>

            </td></tr>
        </table>
    </td></tr>

    <!-- Stats section -->
    <tr><td style="padding: 0;">
        <div style="background: #ffffff; padding: 36px 40px 32px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;">

            <!-- Stats grid using table for email compatibility -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                    <!-- Matched -->
                    <td width="33%" style="padding: 0 6px 0 0; vertical-align: top;">
                        <div style="background: linear-gradient(180deg, #f4f7f2 0%, #eef3eb 100%); border-radius: 12px; padding: 24px 16px; text-align: center; border: 1px solid #e2e8dd;">
                            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 400; color: #3E715C; letter-spacing: -0.03em; line-height: 1;">{matched}</div>
                            <div style="margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #7a8a7c;">Matchet</div>
                        </div>
                    </td>
                    <!-- Unmatched -->
                    <td width="33%" style="padding: 0 3px; vertical-align: top;">
                        <div style="background: linear-gradient(180deg, #fdf8f4 0%, #faf3ec 100%); border-radius: 12px; padding: 24px 16px; text-align: center; border: 1px solid #ede5da;">
                            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 400; color: #9e6b40; letter-spacing: -0.03em; line-height: 1;">{unmatched}</div>
                            <div style="margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #b89a77;">Uten bilag</div>
                        </div>
                    </td>
                    <!-- Match rate -->
                    <td width="33%" style="padding: 0 0 0 6px; vertical-align: top;">
                        <div style="background: linear-gradient(180deg, #f2f6f4 0%, #e8f0ec 100%); border-radius: 12px; padding: 24px 16px; text-align: center; border: 1px solid #dce6df;">
                            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 400; color: #5B906F; letter-spacing: -0.03em; line-height: 1;">{match_rate:.0f}<span style="font-size: 20px; color: #96AFA8;">%</span></div>
                            <div style="margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #7a8a7c;">Treffsikkerhet</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Activity note -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                    <td style="text-align: center; padding: 12px 0; border-top: 1px solid #eef1eb;">
                        <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-style: italic; color: #96AFA8;">
                            {matches_this_week} nye matcher denne uken&ensp;&bull;&ensp;{suggested} forslag venter p&aring; deg
                        </span>
                    </td>
                </tr>
            </table>

        </div>
    </td></tr>

    <!-- Divider -->
    <tr><td style="background: #ffffff; padding: 0 40px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;">
        <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #CFCEA1 30%, #9AAD83 50%, #CFCEA1 70%, transparent 100%);"></div>
    </td></tr>

    <!-- Spacer -->
    <tr><td style="background: #ffffff; padding: 0; height: 28px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;"></td></tr>

    <!-- Transaction table section -->
    <tr><td style="padding: 0; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4;">
        {tx_section}
    </td></tr>

    <!-- CTA section -->
    <tr><td style="padding: 0;">
        <div style="background: #ffffff; padding: 32px 40px 40px; border-left: 1px solid #e8ebe4; border-right: 1px solid #e8ebe4; border-radius: 0 0 16px 16px; text-align: center;">

            <!-- Decorative element -->
            <div style="width: 32px; height: 32px; margin: 0 auto 20px; border: 2px solid #CFCEA1; border-radius: 50%; opacity: 0.5;"></div>

            <p style="margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #2d3a2e; letter-spacing: -0.02em;">
                Mangler det bilag?
            </p>
            <p style="margin: 0 0 24px; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; font-style: italic; color: #96AFA8; line-height: 1.5;">
                Send dem til Ciri &mdash; vi matcher automatisk.
            </p>

            <a href="#" style="display: inline-block; padding: 14px 36px; background: linear-gradient(160deg, #3E715C, #5B906F); color: #ffffff; text-decoration: none; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(62,113,92,0.25), 0 1px 3px rgba(62,113,92,0.15);">
                &Aring;pne Ciri &rarr;
            </a>

        </div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding: 28px 40px 16px; text-align: center;">
        <p style="margin: 0 0 6px; font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; color: #96AFA8;">
            Sendt med omhu av Ciri Regnskapsf&oslash;rer
        </p>
        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 10px; color: #bfc7b8; letter-spacing: 0.05em;">
            Du kan endre varsler i innstillingene &middot; {company_name}
        </p>
    </td></tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>"""
