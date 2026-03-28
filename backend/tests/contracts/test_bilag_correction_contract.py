"""
Contract tests for bilag correction endpoint.
Validates POST /api/bilag/{id}/correct response shapes and error handling.
"""

import uuid
import pytest


class TestBilagCorrectionContract:
    """POST /api/bilag/{id}/correct response contract."""

    async def test_correct_nonexistent_bilag_404(self, async_client, auth_headers):
        fake_id = str(uuid.uuid4())
        response = await async_client.post(
            f"/api/bilag/{fake_id}/correct",
            json={
                "new_amount": 1500,
                "new_mva_amount": 375,
                "reason": "Feil beløp",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    async def test_correct_bilag_missing_reason_422(self, async_client, seed_bilag, auth_headers):
        """Correction without reason should fail validation."""
        response = await async_client.post(
            f"/api/bilag/{seed_bilag.id}/correct",
            json={
                "new_amount": 1500,
                "new_mva_amount": 375,
                # Missing "reason"
            },
            headers=auth_headers,
        )
        assert response.status_code == 422
