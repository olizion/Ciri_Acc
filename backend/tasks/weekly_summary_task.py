"""
Weekly Summary Email Background Task
Runs daily at 08:00 and sends weekly summaries to companies
that have notification_enabled=True on their configured day.
"""

import asyncio
import logging
from datetime import datetime, time
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session_maker
from models import Company
from services.summary_generator import generate_weekly_summary
from services.email_sender import send_email

logger = logging.getLogger(__name__)

# Check every hour (will only send if it's the right day + around 08:00)
CHECK_INTERVAL_SECONDS = 3600
TARGET_HOUR = 8  # Send at 08:00

_task_running = False
_task_handle: Optional[asyncio.Task] = None


async def check_and_send_summaries():
    """Check if any companies need their weekly summary today."""
    now = datetime.utcnow()
    current_day = now.weekday()  # 0=Mon..6=Sun
    current_hour = now.hour

    # Only send around the target hour
    if current_hour != TARGET_HOUR:
        return

    logger.info("Checking for weekly summaries to send...")

    async with async_session_maker() as db:
        # Get companies with notifications enabled
        query = select(Company).where(
            Company.notification_enabled == True,
            Company.notification_email != None,
            Company.notification_day == current_day,
        )
        result = await db.execute(query)
        companies = result.scalars().all()

        if not companies:
            logger.info("No summaries to send today")
            return

        for company in companies:
            try:
                html = await generate_weekly_summary(company.id, db)
                if not html:
                    continue

                success = await send_email(
                    to=company.notification_email,
                    subject=f"Ukentlig oppsummering – {company.name}",
                    html_body=html,
                )

                if success:
                    logger.info(f"Weekly summary sent to {company.notification_email} for {company.name}")
                else:
                    logger.warning(f"Failed to send summary for {company.name}")

            except Exception as e:
                logger.error(f"Error generating/sending summary for {company.name}: {e}")


async def _weekly_summary_loop():
    """Main loop for the weekly summary background task."""
    global _task_running
    _task_running = True
    logger.info("Weekly summary task started")

    while _task_running:
        try:
            await check_and_send_summaries()
        except Exception as e:
            logger.error(f"Error in weekly summary loop: {e}")

        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

    logger.info("Weekly summary task stopped")


def start_weekly_summary_task():
    """Start the background task. Called from main.py."""
    global _task_handle
    if _task_handle and not _task_handle.done():
        logger.warning("Weekly summary task already running")
        return
    _task_handle = asyncio.create_task(_weekly_summary_loop())
    logger.info("Weekly summary task scheduled")


def stop_weekly_summary_task():
    """Stop the background task. Called from main.py."""
    global _task_running, _task_handle
    _task_running = False
    if _task_handle and not _task_handle.done():
        _task_handle.cancel()
        logger.info("Weekly summary task cancelled")
