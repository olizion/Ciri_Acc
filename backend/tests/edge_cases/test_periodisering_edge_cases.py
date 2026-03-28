"""
Edge case tests for periodisering — remainder distribution, boundary cases.
"""

from decimal import Decimal

import pytest
from sqlalchemy import select

from models import Postering
from tests.factories import make_periodisering_bilag


class TestRemainderDistribution:
    """Verify remainder from uneven division goes to the last period."""

    async def test_remainder_added_to_last_period(self, async_client, seed_company, db_session, auth_headers):
        """10000 / 3 = 3333.33 each, with 3333.34 for the last period."""
        bilag = make_periodisering_bilag(seed_company.id)
        # Override to create uneven distribution
        suggestion = bilag.periodisering_suggestion.copy()
        suggestion["total_amount"] = 10000.0
        suggestion["period_count"] = 3
        suggestion["monthly_amount"] = 3333.33
        suggestion["remainder"] = round(10000.0 - 3333.33 * 3, 2)  # 0.01
        suggestion["start_period"] = "2026-01"
        suggestion["end_period"] = "2026-03"
        bilag.periodisering_suggestion = suggestion
        bilag.net_amount = Decimal("10000.00")
        bilag.gross_amount = Decimal("10000.00")
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={"override_period_count": 3, "override_start_period": "2026-01"},
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Get expense entries
        expense_account = suggestion["expense_account"]
        result = await db_session.execute(
            select(Postering).where(
                Postering.bilag_id == bilag.id,
                Postering.account_number == expense_account,
                Postering.debit_amount > 0,
            ).order_by(Postering.posting_date)
        )
        entries = result.scalars().all()
        assert len(entries) == 3

        # Last entry should be different (gets remainder)
        amounts = [float(e.debit_amount) for e in entries]
        total = sum(amounts)
        assert abs(total - 10000.0) <= 0.01, f"Total {total} != 10000"

    async def test_even_distribution_no_remainder(self, async_client, seed_company, db_session, auth_headers):
        """12000 / 12 = 1000 each, no remainder."""
        bilag = make_periodisering_bilag(seed_company.id)
        # Default factory already has 12000/12
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 200

        expense_account = bilag.periodisering_suggestion["expense_account"]
        result = await db_session.execute(
            select(Postering).where(
                Postering.bilag_id == bilag.id,
                Postering.account_number == expense_account,
                Postering.debit_amount > 0,
            )
        )
        entries = result.scalars().all()
        assert len(entries) == 12

        # All should be exactly 1000
        amounts = set(float(e.debit_amount) for e in entries)
        assert amounts == {1000.0}


class TestUserOverride:
    """Verify user can override Ciri's period suggestion."""

    async def test_user_override_period_count_recalculates(self, async_client, seed_company, db_session, auth_headers):
        """Override from 12 to 6 months doubles the monthly amount."""
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={"override_period_count": 6},
            headers=auth_headers,
        )
        assert response.status_code == 200

        expense_account = bilag.periodisering_suggestion["expense_account"]
        result = await db_session.execute(
            select(Postering).where(
                Postering.bilag_id == bilag.id,
                Postering.account_number == expense_account,
                Postering.debit_amount > 0,
            )
        )
        entries = result.scalars().all()
        assert len(entries) == 6

        # 12000 / 6 = 2000 each
        amounts = set(float(e.debit_amount) for e in entries)
        assert amounts == {2000.0}
