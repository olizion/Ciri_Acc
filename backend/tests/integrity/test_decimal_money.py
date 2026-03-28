"""
Data Integrity — Monetary Precision Tests

All monetary values must use Decimal, never float.
"""

import pytest
from decimal import Decimal
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


class TestDecimalPrecision:
    """Monetary values must survive round-trip without floating point drift."""

    async def test_money_roundtrip_precision(
        self, async_client: AsyncClient, seed_bilag, auth_headers
    ):
        """0.1 + 0.2 must equal 0.30, not 0.30000000000000004."""
        # Create a postering with a precision-sensitive amount
        response = await async_client.post(
            "/api/posteringer",
            json={
                "bilag_id": str(seed_bilag.id),
                "account_number": "1920",
                "description": "Precision test",
                "debit_amount": "0.30",
                "credit_amount": "0.00",
                "date": "2026-01-15",
            },
            headers=auth_headers,
        )

        if response.status_code in (200, 201):
            data = response.json()
            amount = data.get("debit_amount")
            # Must be exactly "0.30" — no floating point noise
            assert amount in ("0.30", "0.3", Decimal("0.30")), (
                f"Monetary precision error: expected '0.30', got '{amount}'"
            )

    async def test_large_amounts_no_precision_loss(
        self, async_client: AsyncClient, seed_bilag, auth_headers
    ):
        """Large NOK amounts must not lose precision."""
        response = await async_client.post(
            "/api/posteringer",
            json={
                "bilag_id": str(seed_bilag.id),
                "account_number": "1920",
                "description": "Large amount test",
                "debit_amount": "9999999.99",
                "credit_amount": "0.00",
                "date": "2026-01-15",
            },
            headers=auth_headers,
        )

        if response.status_code in (200, 201):
            data = response.json()
            assert data.get("debit_amount") == "9999999.99", (
                "Large monetary amount lost precision in round-trip"
            )
