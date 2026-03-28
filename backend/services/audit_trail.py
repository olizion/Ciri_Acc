"""
Domain-Level Audit Trail
Logs business events to AuditLog with actor attribution.

The HTTP audit middleware (middleware/audit.py) captures request-level events.
This module captures domain-level events — the "what happened in business terms"
that Bokføringsloven §13a requires for traceability.

Usage:
    from services.audit_trail import log_domain_event

    await log_domain_event(
        db=session,
        action="bilag:approved",
        resource_type="bilag",
        resource_id=str(bilag.id),
        user_id=user.user_id,      # or None for Ciri
        company_id=bilag.company_id,
        details={"bilag_number": bilag.bilag_number, "status": "approved"},
    )
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def log_domain_event(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    user_id: UUID | None = None,
    company_id: UUID | None = None,
    details: dict | None = None,
    by_ciri: bool = False,
) -> None:
    """
    Log a domain-level event to AuditLog.

    Unlike the HTTP middleware which logs requests, this logs business events:
    - bilag:approved, bilag:posted, bilag:rejected
    - invoice:sent, invoice:paid
    - employee:created, employee:terminated
    - reconciliation:confirmed, reconciliation:rejected
    - submission:amelding_submitted, submission:mva_submitted
    - autonomous:batch_posted

    Args:
        db: Database session (uses the caller's transaction)
        action: Domain event name (e.g., "bilag:approved")
        resource_type: Model type (e.g., "bilag", "invoice")
        resource_id: Primary key of affected record
        user_id: UUID of user who performed the action, or None for system/Ciri
        company_id: UUID of the company context
        details: Additional context (old/new values, amounts, reasons)
        by_ciri: True if this action was performed by Ciri AI
    """
    from models.audit_log import AuditLog

    try:
        log_entry = AuditLog(
            user_id=user_id,
            company_id=company_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            created_by_ciri=by_ciri,
        )
        db.add(log_entry)
        await db.flush()
    except Exception as e:
        # Audit log failures must NEVER crash the business operation
        logger.error(f"Domain audit log failed for {action} on {resource_type}/{resource_id}: {e}")
