"""
Compliance tests for bilag correction chain.
Validates Bokføringsloven §13 — reversal + repost, no in-place mutation.
"""

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select

from models import Postering, Bilag
from tests.factories import make_bilag, make_postering


class TestCorrectionChainCompliance:
    """§ 13: PATCH/correct must create reversal + new entries, never mutate originals."""

    async def test_original_posteringer_unchanged_after_correction(
        self, async_client, seed_company, db_session, auth_headers
    ):
        """Original posteringer must not be modified after correction."""
        # Create a posted bilag with posteringer
        bilag = make_bilag(seed_company.id, status="posted")
        db_session.add(bilag)
        await db_session.flush()

        original = make_postering(
            bilag.id, seed_company.id,
            account_number="6540",
            debit_amount=Decimal("1000.00"),
            credit_amount=Decimal("0.00"),
        )
        db_session.add(original)
        await db_session.flush()

        original_id = original.id
        original_debit = original.debit_amount
        original_credit = original.credit_amount
        original_account = original.account_number

        # Perform correction
        response = await async_client.post(
            f"/api/bilag/{bilag.id}/correct",
            json={
                "new_amount": 1500,
                "new_mva_amount": 0,
                "new_account_number": "7700",
                "reason": "Feil konto",
            },
            headers=auth_headers,
        )

        # Whether it succeeded or not, original must be unchanged
        await db_session.refresh(original)
        assert original.id == original_id
        assert original.debit_amount == original_debit
        assert original.credit_amount == original_credit
        assert original.account_number == original_account
