"""
Compliance tests for periodisering — Bokføringsloven and Regnskapsloven.
Validates that periodisering posteringer are balanced and correctly structured.
"""

import uuid
from decimal import Decimal
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select

from models import Postering, Bilag, Notification
from tests.factories import make_periodisering_bilag


class TestPeriodiseringBalance:
    """Bokføringsloven §6: All journal entries must balance (debit == credit)."""

    async def test_periodisering_posteringer_balanced(self, async_client, seed_company, db_session, auth_headers):
        """After accepting periodisering, sum of debits must equal sum of credits per journal."""
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Query all posteringer for this bilag
        result = await db_session.execute(
            select(Postering).where(Postering.bilag_id == bilag.id)
        )
        posteringer = result.scalars().all()
        assert len(posteringer) > 0

        total_debit = sum(p.debit_amount for p in posteringer)
        total_credit = sum(p.credit_amount for p in posteringer)

        # Must balance within 0.01 tolerance (sub-øre rounding)
        assert abs(total_debit - total_credit) <= Decimal("0.01"), (
            f"Journal unbalanced: debit={total_debit}, credit={total_credit}"
        )

    async def test_periodisering_total_matches_bilag_amount(self, async_client, seed_company, db_session, auth_headers):
        """Sum of all monthly expense debits must equal the bilag's total amount."""
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        total_amount = float(bilag.periodisering_suggestion["total_amount"])

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Get expense posteringer (debit to expense account, not balance account)
        expense_account = bilag.periodisering_suggestion["expense_account"]
        result = await db_session.execute(
            select(Postering).where(
                Postering.bilag_id == bilag.id,
                Postering.account_number == expense_account,
                Postering.debit_amount > 0,
            )
        )
        expense_posteringer = result.scalars().all()

        total_expense_debit = sum(float(p.debit_amount) for p in expense_posteringer)
        assert abs(total_expense_debit - total_amount) <= 0.01, (
            f"Expense total {total_expense_debit} != bilag total {total_amount}"
        )


class TestPeriodiseringScanning:
    """Verify scanned_at tracking prevents double-scanning."""

    async def test_scanned_at_set_after_assessment(self, db_session, seed_company):
        """Bilag's periodisering_scanned_at should be set after LLM assessment."""
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        # Auto-posted bilag from factory has scanned_at set
        assert bilag.periodisering_scanned_at is not None

    async def test_manual_bilag_has_no_scanned_at(self, db_session, seed_company):
        """Manual bilag should have periodisering_scanned_at = None before weekly scan."""
        from tests.factories import make_manual_bilag

        bilag = make_manual_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        assert bilag.periodisering_scanned_at is None
        assert bilag.created_by_ciri is False


class TestAcceptedSuggestionTracking:
    """Verify user override information is stored in suggestion."""

    async def test_user_override_stored_in_suggestion(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={"override_period_count": 6},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Refresh bilag from DB
        await db_session.refresh(bilag)
        suggestion = bilag.periodisering_suggestion

        assert suggestion["accepted"] is True
        assert suggestion["user_overrode"] is True
        assert suggestion["original_period_count"] == 12
        assert suggestion["period_count"] == 6
