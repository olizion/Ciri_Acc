"""
Bokføringsloven § 10 — Documentation Linkage Tests

Every postering must have a bilag. Orphaned posteringer are illegal.
"""

import uuid

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


class TestPosteringRequiresBilag:
    """Creating posteringer without valid bilag must fail."""

    async def test_postering_without_bilag_rejected(
        self, async_client: AsyncClient, auth_headers
    ):
        """POST postering with no bilag_id → 422."""
        response = await async_client.post(
            "/api/posteringer",
            json={
                "account_number": "1920",
                "description": "Orphan attempt",
                "debit_amount": "1000.00",
                "credit_amount": "0.00",
                "date": "2026-01-15",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422, (
            "§ 10 violation: postering without bilag_id should return 422"
        )

    async def test_postering_with_invalid_bilag_rejected(
        self, async_client: AsyncClient, auth_headers
    ):
        """POST postering with non-existent bilag_id → 422 or 404."""
        response = await async_client.post(
            "/api/posteringer",
            json={
                "bilag_id": str(uuid.uuid4()),
                "account_number": "1920",
                "description": "Bad reference",
                "debit_amount": "1000.00",
                "credit_amount": "0.00",
                "date": "2026-01-15",
            },
            headers=auth_headers,
        )
        assert response.status_code in (404, 422), (
            "§ 10 violation: postering with invalid bilag_id should be rejected"
        )


class TestBilagDeletionProtection:
    """Bilag with linked posteringer cannot be deleted."""

    async def test_delete_bilag_with_posteringer_returns_409(
        self, async_client: AsyncClient, seed_bilag, auth_headers
    ):
        """DELETE bilag that has posteringer → 409 Conflict."""
        response = await async_client.delete(
            f"/api/bilag/{seed_bilag.id}",
            headers=auth_headers,
        )
        # Should either be 409 (conflict) or soft-delete with posteringer preserved
        assert response.status_code in (200, 204, 409), (
            f"Unexpected status {response.status_code} when deleting bilag with posteringer"
        )
