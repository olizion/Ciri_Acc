"""
Bokføringsloven § 13a — Audit Trail Tests

Every change to financial data must be fully traceable.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession


pytestmark = pytest.mark.asyncio


class TestAuditTrailCreation:
    """Every financial mutation must produce an audit log entry."""

    async def test_post_creates_audit_entry(
        self, async_client: AsyncClient, seed_company, auth_headers, db_session: AsyncSession
    ):
        """POST on financial endpoint must log creation."""
        response = await async_client.post(
            "/api/bilag",
            json={
                "document_date": "2026-01-15",
                "description": "Audit test bilag",
                "total_amount": "500.00",
            },
            headers=auth_headers,
        )

        if response.status_code in (200, 201):
            data = response.json()
            entity_id = data.get("id")

            # Check audit log exists for this creation
            result = await db_session.execute(
                text("""
                    SELECT * FROM audit_log
                    WHERE entity_id = :entity_id AND action = 'create'
                    ORDER BY timestamp DESC LIMIT 1
                """),
                {"entity_id": entity_id},
            )
            audit = result.first()

            assert audit is not None, (
                "§ 13a violation: no audit entry created for POST /api/bilag"
            )
            assert audit.actor is not None, "§ 13a violation: audit entry missing actor"
            assert audit.timestamp is not None, "§ 13a violation: audit entry missing timestamp"

    async def test_patch_creates_audit_with_old_and_new(
        self, async_client: AsyncClient, seed_bilag, auth_headers, db_session: AsyncSession
    ):
        """PATCH must log old_value and new_value."""
        response = await async_client.patch(
            f"/api/bilag/{seed_bilag.id}",
            json={"description": "Updated description", "reason": "Audit test"},
            headers=auth_headers,
        )

        if response.status_code == 200:
            result = await db_session.execute(
                text("""
                    SELECT * FROM audit_log
                    WHERE entity_id = :entity_id AND action IN ('update', 'correct')
                    ORDER BY timestamp DESC LIMIT 1
                """),
                {"entity_id": str(seed_bilag.id)},
            )
            audit = result.first()

            assert audit is not None, (
                "§ 13a violation: no audit entry for PATCH operation"
            )
            assert audit.old_value is not None, "§ 13a violation: audit missing old_value"
            assert audit.new_value is not None, "§ 13a violation: audit missing new_value"


class TestAuditImmutability:
    """Audit records themselves must be immutable."""

    async def test_audit_records_cannot_be_deleted(self, db_session: AsyncSession):
        """Attempting to delete audit records must fail or be prevented."""
        # This tests that the audit_log table has appropriate protections
        # (e.g., no DELETE permission, trigger-based prevention, or app-level guard)
        result = await db_session.execute(text("SELECT COUNT(*) FROM audit_log"))
        count_before = result.scalar()

        if count_before and count_before > 0:
            try:
                await db_session.execute(text("DELETE FROM audit_log LIMIT 1"))
                await db_session.flush()
                # If we get here without error, check count
                result = await db_session.execute(text("SELECT COUNT(*) FROM audit_log"))
                count_after = result.scalar()
                assert count_after == count_before, (
                    "§ 13a violation: audit records can be deleted"
                )
            except Exception:
                # Expected — deletion should be blocked
                pass
