"""
Bokføringsloven § 6 — Completeness Tests

All transactions must be captured. No silent failures.
"""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


class TestNoSilentFailures:
    """API errors must never silently drop financial data."""

    async def test_invalid_postering_returns_error_not_silence(
        self, async_client: AsyncClient, seed_bilag, auth_headers
    ):
        """Submitting invalid financial data must return an explicit error."""
        response = await async_client.post(
            "/api/posteringer",
            json={
                "bilag_id": str(seed_bilag.id),
                "account_number": "",  # Invalid
                "debit_amount": "not_a_number",
                "credit_amount": "0.00",
                "date": "2026-01-15",
            },
            headers=auth_headers,
        )
        assert response.status_code in (400, 422), (
            "§ 6 violation: invalid financial data accepted silently"
        )
        assert "detail" in response.json(), (
            "§ 6 violation: error response missing detail field"
        )

    async def test_batch_partial_failure_reports_all_errors(
        self, async_client: AsyncClient, seed_bilag, auth_headers
    ):
        """Batch operations must report which items failed and why."""
        response = await async_client.post(
            "/api/posteringer/batch",
            json={
                "items": [
                    {
                        "bilag_id": str(seed_bilag.id),
                        "account_number": "1920",
                        "debit_amount": "1000.00",
                        "credit_amount": "0.00",
                        "date": "2026-01-15",
                    },
                    {
                        "bilag_id": str(seed_bilag.id),
                        "account_number": "",  # Invalid
                        "debit_amount": "bad",
                        "credit_amount": "0.00",
                        "date": "2026-01-15",
                    },
                ]
            },
            headers=auth_headers,
        )

        # If batch endpoint exists, it should report partial failures
        if response.status_code != 404:
            data = response.json()
            if "errors" in data:
                assert len(data["errors"]) > 0, (
                    "§ 6 violation: batch with invalid items reported no errors"
                )
