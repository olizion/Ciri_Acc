"""
Contract tests for periodisering endpoints.
Validates response shapes, status codes, and error handling.
"""

import uuid
import pytest
import pytest_asyncio

from tests.factories import make_periodisering_bilag, make_bilag


class TestAcceptPeriodisering:
    """POST /api/bilag/{id}/periodisering/accept response contract."""

    async def test_accept_returns_expected_shape(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "bilag_id" in data
        assert "posteringer_count" in data
        assert data["posteringer_count"] > 0

    async def test_accept_nonexistent_bilag_404(self, async_client, auth_headers):
        fake_id = str(uuid.uuid4())
        response = await async_client.post(
            f"/api/bilag/{fake_id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_accept_bilag_without_suggestion_400(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 400

    async def test_accept_already_accepted_400(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_periodisering_bilag(seed_company.id)
        # Mark as already accepted
        suggestion = bilag.periodisering_suggestion.copy()
        suggestion["accepted"] = True
        bilag.periodisering_suggestion = suggestion
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 400

    async def test_accept_with_user_override(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/accept",
            json={"override_period_count": 6, "override_start_period": "2026-03"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["posteringer_count"] > 0


class TestDismissPeriodisering:
    """POST /api/bilag/{id}/periodisering/dismiss response contract."""

    async def test_dismiss_returns_expected_shape(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.post(
            f"/api/bilag/{bilag.id}/periodisering/dismiss",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Periodiseringsforslag avvist"
        assert data["bilag_id"] == str(bilag.id)


class TestCandidatesEndpoint:
    """GET /api/bilag/periodisering/candidates response contract."""

    async def test_candidates_returns_paginated_list(self, async_client, seed_company, db_session, auth_headers):
        bilag = make_periodisering_bilag(seed_company.id)
        db_session.add(bilag)
        await db_session.flush()

        response = await async_client.get(
            f"/api/bilag/periodisering/candidates?company_id={seed_company.id}&status=pending",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert data["total"] >= 1

        item = data["items"][0]
        assert "id" in item
        assert "bilag_number" in item
        assert "periodisering_suggestion" in item
        assert "created_by_ciri" in item
