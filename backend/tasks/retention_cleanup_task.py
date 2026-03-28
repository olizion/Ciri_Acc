"""
Retention Cleanup Background Task
Runs daily to purge expired data per Bokforingsloven + GDPR requirements.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from config.database import async_session_maker
from config.settings import settings
from services.retention_service import RetentionService

logger = logging.getLogger(__name__)

# Global task reference
_cleanup_task: Optional[asyncio.Task] = None


async def _retention_cleanup_loop():
    """
    Background loop that runs the retention purge cycle daily.
    Targets 02:00 local time to minimize impact on active users.
    """
    logger.info("Retention cleanup task started")

    while True:
        try:
            # Calculate sleep until next 02:00
            now = datetime.now()
            target_hour = 2
            if now.hour >= target_hour:
                # Already past 02:00 today, schedule for tomorrow
                next_run = now.replace(
                    hour=target_hour, minute=0, second=0, microsecond=0
                )
                next_run = next_run.replace(day=now.day + 1)
            else:
                next_run = now.replace(
                    hour=target_hour, minute=0, second=0, microsecond=0
                )

            sleep_seconds = (next_run - now).total_seconds()
            logger.info(
                f"Retention cleanup scheduled in {sleep_seconds/3600:.1f}h "
                f"(next run: {next_run.isoformat()})"
            )
            await asyncio.sleep(sleep_seconds)

            # Run the purge cycle
            async with async_session_maker() as session:
                service = RetentionService(session)
                summary = await service.run_purge_cycle()
                await session.commit()
                logger.info(f"Retention cleanup completed: {summary}")

        except asyncio.CancelledError:
            logger.info("Retention cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Retention cleanup cycle failed: {e}", exc_info=True)
            # Wait 1 hour before retrying on error
            await asyncio.sleep(3600)


def start_retention_cleanup_task():
    """Start the retention cleanup background task."""
    global _cleanup_task
    if _cleanup_task is None or _cleanup_task.done():
        _cleanup_task = asyncio.create_task(_retention_cleanup_loop())
        logger.info("Retention cleanup task launched")


def stop_retention_cleanup_task():
    """Stop the retention cleanup background task."""
    global _cleanup_task
    if _cleanup_task and not _cleanup_task.done():
        _cleanup_task.cancel()
        logger.info("Retention cleanup task stopped")
