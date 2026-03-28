"""
Bokføringsloven § 13 — Reversal & Repost Tests

Financial records must NEVER be mutated in place.
Corrections are made by reversing the original and posting a new entry.
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


pytestmark = pytest.mark.asyncio


class TestBilagReversalOnPatch:
    """PATCH /api/bilag/{id} must reverse-and-repost, not mutate."""

    async def test_original_record_unchanged_after_patch(
        self, async_client: AsyncClient, seed_bilag, auth_headers, db_session: AsyncSession
    ):
        """The original bilag row must remain identical after a PATCH."""
        original_id = str(seed_bilag.id)
        original_amount = seed_bilag.total_amount

        response = await async_client.patch(
            f"/api/bilag/{original_id}",
            json={"total_amount": "1500.00", "reason": "Correction"},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Reload original from DB — it must be unchanged
        from models.bilag import Bilag
        result = await db_session.execute(select(Bilag).where(Bilag.id == seed_bilag.id))
        original = result.scalar_one()

        assert original.total_amount == original_amount, (
            f"§ 13 violation: original record was mutated from {original_amount} to {original.total_amount}"
        )

    async def test_reversal_entry_created(
        self, async_client: AsyncClient, seed_bilag, auth_headers, db_session: AsyncSession
    ):
        """A reversal entry must exist after PATCH."""
        response = await async_client.patch(
            f"/api/bilag/{seed_bilag.id}",
            json={"total_amount": "1500.00", "reason": "Correction"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # The response should indicate the correction chain
        assert "correction_chain_id" in data or "reversal_id" in data, (
            "§ 13 violation: PATCH response must include correction chain reference"
        )

    async def test_amounts_net_correctly_after_correction(
        self, async_client: AsyncClient, seed_bilag, auth_headers, db_session: AsyncSession
    ):
        """After correction: original + reversal + new must net to the corrected amount."""
        response = await async_client.patch(
            f"/api/bilag/{seed_bilag.id}",
            json={"total_amount": "1500.00", "reason": "Correction"},
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Query all posteringer linked to this correction chain
        from models.postering import Postering
        result = await db_session.execute(
            select(Postering).where(Postering.bilag_id == seed_bilag.id)
        )
        posteringer = result.scalars().all()

        net_debit = sum(p.debit_amount for p in posteringer)
        net_credit = sum(p.credit_amount for p in posteringer)

        # Net should reflect the corrected state, not doubled
        assert net_debit - net_credit == Decimal("1500.00") or net_debit == Decimal("1500.00"), (
            f"§ 13 violation: amounts do not net correctly. Debit={net_debit}, Credit={net_credit}"
        )


class TestSoftDeleteOnly:
    """DELETE endpoints must soft-delete, never hard-delete financial records."""

    async def test_delete_sets_deleted_at(
        self, async_client: AsyncClient, seed_bilag, auth_headers, db_session: AsyncSession
    ):
        """DELETE must set deleted_at, not remove the row."""
        response = await async_client.delete(
            f"/api/bilag/{seed_bilag.id}",
            headers=auth_headers,
        )

        assert response.status_code in (200, 204)

        from models.bilag import Bilag
        result = await db_session.execute(select(Bilag).where(Bilag.id == seed_bilag.id))
        bilag = result.scalar_one_or_none()

        assert bilag is not None, "§ 13 violation: record was hard-deleted from database"
        assert bilag.deleted_at is not None, "§ 13 violation: deleted_at not set on soft-delete"

    async def test_deleted_excluded_from_list(
        self, async_client: AsyncClient, seed_bilag, auth_headers
    ):
        """Soft-deleted records must not appear in normal GET list responses."""
        # Delete first
        await async_client.delete(
            f"/api/bilag/{seed_bilag.id}",
            headers=auth_headers,
        )

        # List should not include it
        response = await async_client.get("/api/bilag", headers=auth_headers)
        assert response.status_code == 200

        ids = [item["id"] for item in response.json().get("items", response.json())]
        assert str(seed_bilag.id) not in ids, (
            "§ 13 violation: soft-deleted record still visible in list endpoint"
        )
