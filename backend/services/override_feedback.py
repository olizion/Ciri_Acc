"""
Override Feedback Service
Feeds user corrections back into clusters, rules, and audit trail.

Called when:
  - User corrects a Ciri-created bilag (correct_bilag endpoint)
  - User rejects a reconciliation match (reject_match endpoint)
  - Any future path where a user overrides an auto-posted decision

This closes the feedback loop so that:
  1. Cluster data points are marked as overridden → cluster strength degrades
  2. The driving rule's times_overridden increments → rule auto-deactivates at 30%
  3. An audit event records what was changed, by whom, and why
"""

import logging
from uuid import UUID
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.bilag import Bilag
from services.audit_trail import log_domain_event
from services.cluster_service import mark_data_point_overridden

logger = logging.getLogger(__name__)


async def process_override_feedback(
    db: AsyncSession,
    *,
    bilag: Bilag,
    transaction_id: Optional[UUID] = None,
    source_rule_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    correction_details: dict,
) -> dict:
    """
    Process feedback from a user override on an auto-posted or matched entry.

    Returns a summary dict of what was updated.
    """
    summary = {
        "cluster_points_overridden": 0,
        "rule_override_recorded": False,
        "audit_logged": False,
    }

    # ── Step 1: Cluster feedback ──
    if transaction_id:
        try:
            count = await mark_data_point_overridden(
                db, transaction_id, overridden_by=user_id
            )
            summary["cluster_points_overridden"] = count
            if count > 0:
                logger.info(
                    f"Override feedback: marked {count} cluster data points "
                    f"as overridden for tx {transaction_id}"
                )
        except Exception as e:
            logger.error(f"Cluster override feedback failed: {e}")

    # ── Step 2: Rule feedback ──
    if source_rule_id:
        try:
            from models.reconciliation_rule import ReconciliationRule
            result = await db.execute(
                select(ReconciliationRule).where(ReconciliationRule.id == source_rule_id)
            )
            rule = result.scalar_one_or_none()
            if rule:
                rule.record_override()
                summary["rule_override_recorded"] = True
                logger.info(
                    f"Override feedback: rule '{rule.name}' overridden "
                    f"({rule.times_overridden}/{rule.times_applied})"
                )
        except Exception as e:
            logger.error(f"Rule override feedback failed: {e}")

    # ── Step 3: Audit trail ──
    try:
        await log_domain_event(
            db=db,
            action="bilag:corrected",
            resource_type="bilag",
            resource_id=str(bilag.id),
            user_id=user_id,
            company_id=bilag.company_id,
            details=correction_details,
        )
        summary["audit_logged"] = True
    except Exception as e:
        logger.error(f"Audit logging for correction failed: {e}")

    return summary
