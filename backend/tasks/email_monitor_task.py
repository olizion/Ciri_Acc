"""
Email Monitor Background Task
Polls connected email accounts for invoices
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session_maker
from models.email_connection import EmailConnection, EmailConnectionStatus, EmailProvider
from services.email_inbox import fetch_emails_for_connection, Email
from services.invoice_processor import process_emails_batch, ProcessingResult
from services.encryption import decrypt_token, encrypt_token
from services.reconciliation_matcher import create_matcher

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# =============================================================================
# Task Configuration
# =============================================================================

POLL_INTERVAL_SECONDS = 300  # 5 minutes
MAX_EMAILS_PER_SYNC = 20
MAX_CONSECUTIVE_ERRORS = 5
ERROR_BACKOFF_MINUTES = 30


# =============================================================================
# Background Task State
# =============================================================================

_task_running = False
_task_handle: Optional[asyncio.Task] = None


# =============================================================================
# Single Connection Sync
# =============================================================================

async def sync_single_connection(connection_id: str) -> dict:
    """
    Sync a single email connection.

    This is called both by the background task and manual sync endpoint.

    Returns:
        dict with sync results
    """
    try:
        async with async_session_maker() as db:
            # Get connection
            result = await db.execute(
                select(EmailConnection).where(
                    EmailConnection.id == uuid.UUID(connection_id)
                )
            )
            connection = result.scalar_one_or_none()

            if not connection:
                return {"success": False, "error": "Connection not found"}

            if not connection.is_active:
                return {"success": False, "error": "Connection is inactive"}

            try:
                # Decrypt tokens
                access_token = decrypt_token(connection.access_token)
                refresh_token = decrypt_token(connection.refresh_token) if connection.refresh_token else None

                # Determine sync parameters based on provider
                after_message_id = connection.last_message_id if connection.provider == EmailProvider.GOOGLE else None
                after_datetime = connection.last_sync_at if connection.provider == EmailProvider.MICROSOFT else None

                # Fetch emails
                emails, token_refresh = await fetch_emails_for_connection(
                    provider=connection.provider.value,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    max_emails=MAX_EMAILS_PER_SYNC,
                    after_message_id=after_message_id,
                    after_datetime=after_datetime,
                )

                # Update tokens if refreshed
                if token_refresh:
                    connection.access_token = encrypt_token(token_refresh.access_token)
                    if token_refresh.refresh_token:
                        connection.refresh_token = encrypt_token(token_refresh.refresh_token)
                    connection.token_expires_at = token_refresh.expires_at

                # Process emails for invoices
                if emails:
                    results = await process_emails_batch(
                        emails=emails,
                        company_id=connection.company_id,
                        db_session=db,
                    )

                    # Calculate totals
                    total_processed = sum(r.attachments_processed for r in results)
                    total_created = sum(r.invoices_created for r in results)
                    all_errors = [e for r in results for e in r.errors]

                    if all_errors:
                        for err in all_errors:
                            logger.warning(f"Processing error: {err}")

                    # Update connection stats
                    connection.emails_processed += total_processed
                    connection.invoices_created += total_created

                    # Update last message ID for incremental sync (Gmail)
                    if emails and connection.provider == EmailProvider.GOOGLE:
                        connection.last_message_id = emails[0].message_id

                    # Trigger reconciliation for unmatched bank transactions
                    if total_created > 0:
                        try:
                            from models import BankTransaction, ReconciliationStatus, Company
                            tx_result = await db.execute(
                                select(BankTransaction).where(
                                    BankTransaction.company_id == connection.company_id,
                                    BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                                )
                            )
                            unmatched_txs = tx_result.scalars().all()

                            if unmatched_txs:
                                company_result = await db.execute(
                                    select(Company).where(Company.id == connection.company_id)
                                )
                                company = company_result.scalar_one_or_none()

                                if company:
                                    matcher = create_matcher(db)
                                    for tx in unmatched_txs:
                                        try:
                                            await matcher.auto_reconcile(tx, company.autonomy_level)
                                        except Exception as e:
                                            logger.warning(f"Reconcile error for tx {tx.id}: {e}")

                                    await db.commit()
                                    logger.info(
                                        f"Ran reconciliation on {len(unmatched_txs)} unmatched "
                                        f"transactions after {total_created} new bilags"
                                    )

                                    try:
                                        from tasks.batch_reconciliation_task import run_batch_reconciliation_for_company
                                        await run_batch_reconciliation_for_company(connection.company_id, db)
                                        await db.commit()
                                    except Exception as e:
                                        logger.warning(f"Claude batch reconciliation failed: {e}")

                        except Exception as e:
                            logger.warning(f"Post-email reconciliation failed: {e}")

                else:
                    total_processed = 0
                    total_created = 0
                    all_errors = []

                # Update connection status
                connection.last_sync_at = datetime.utcnow()
                connection.status = EmailConnectionStatus.ACTIVE
                connection.last_error = None
                connection.error_count = 0

                await db.commit()

                logger.info(
                    f"Synced {connection.email_address}: "
                    f"{len(emails)} emails, {total_processed} attachments, "
                    f"{total_created} invoices created"
                )

                return {
                    "success": True,
                    "emails_found": len(emails),
                    "attachments_processed": total_processed,
                    "invoices_created": total_created,
                    "errors": all_errors,
                }

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Sync error for {connection.email_address}: {error_msg}", exc_info=True)

                connection.last_error = error_msg[:500]
                connection.error_count += 1
                connection.last_error_at = datetime.utcnow()

                if connection.error_count >= MAX_CONSECUTIVE_ERRORS:
                    connection.status = EmailConnectionStatus.ERROR
                    connection.is_active = False
                    logger.warning(
                        f"Disabled connection {connection.email_address} after "
                        f"{MAX_CONSECUTIVE_ERRORS} consecutive errors"
                    )

                await db.commit()

                return {
                    "success": False,
                    "error": error_msg,
                }

    except Exception as e:
        logger.error(f"Sync failed for connection {connection_id}: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


# =============================================================================
# Background Polling Task
# =============================================================================

async def poll_all_connections():
    """
    Poll all active email connections.

    This is the main polling function that runs periodically.
    """
    logger.info("Starting email poll cycle...")

    async with async_session_maker() as db:
        # Get all active connections
        result = await db.execute(
            select(EmailConnection).where(
                EmailConnection.is_active == True,
                EmailConnection.status != EmailConnectionStatus.ERROR,
            )
        )
        connections = result.scalars().all()

        if not connections:
            logger.info("No active email connections to poll")
            return

        logger.info(f"Polling {len(connections)} email connections")

        for connection in connections:
            # Skip if in error backoff
            if connection.last_error_at:
                backoff_until = connection.last_error_at + timedelta(minutes=ERROR_BACKOFF_MINUTES)
                if datetime.utcnow() < backoff_until:
                    logger.debug(
                        f"Skipping {connection.email_address} - in error backoff "
                        f"until {backoff_until.isoformat()}"
                    )
                    continue

            # Sync this connection
            await sync_single_connection(str(connection.id))

            # Small delay between connections to avoid rate limits
            await asyncio.sleep(1)

    logger.info("Email poll cycle complete")


async def email_monitor_loop():
    """
    Main loop for the email monitor background task.
    """
    global _task_running
    _task_running = True

    logger.info("Email monitor task started")

    while _task_running:
        try:
            await poll_all_connections()
        except Exception as e:
            logger.error(f"Error in email monitor loop: {e}")

        # Wait for next poll cycle
        await asyncio.sleep(POLL_INTERVAL_SECONDS)

    logger.info("Email monitor task stopped")


# =============================================================================
# Task Control Functions
# =============================================================================

def start_email_monitor():
    """
    Start the email monitor background task.

    Called from main.py on application startup.
    """
    global _task_handle

    if _task_handle and not _task_handle.done():
        logger.warning("Email monitor already running")
        return

    _task_handle = asyncio.create_task(email_monitor_loop())
    logger.info("Email monitor task scheduled")


def stop_email_monitor():
    """
    Stop the email monitor background task.

    Called from main.py on application shutdown.
    """
    global _task_running, _task_handle

    _task_running = False

    if _task_handle and not _task_handle.done():
        _task_handle.cancel()
        logger.info("Email monitor task cancelled")


def is_monitor_running() -> bool:
    """Check if the email monitor is running."""
    return _task_running and _task_handle and not _task_handle.done()


# =============================================================================
# Health Check
# =============================================================================

async def get_monitor_status() -> dict:
    """
    Get status of the email monitor.
    """
    async with async_session_maker() as db:
        # Count connections by status
        result = await db.execute(
            select(EmailConnection)
        )
        connections = result.scalars().all()

        active = sum(1 for c in connections if c.is_active and c.status == EmailConnectionStatus.ACTIVE)
        error = sum(1 for c in connections if c.status == EmailConnectionStatus.ERROR)
        inactive = sum(1 for c in connections if not c.is_active)

        return {
            "running": is_monitor_running(),
            "poll_interval_seconds": POLL_INTERVAL_SECONDS,
            "connections": {
                "total": len(connections),
                "active": active,
                "error": error,
                "inactive": inactive,
            },
        }
