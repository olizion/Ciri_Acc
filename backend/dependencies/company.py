"""
Company Resolution Dependency
Resolves company_id from JWT (production) or fallback (development).

This replaces the per-router _resolve_company_id() pattern with a single,
secure dependency that prefers the JWT-verified company_id and only falls
back to query params or the default company in debug mode.
"""

from __future__ import annotations

import logging
import uuid as _uuid
from typing import Optional

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from dependencies.auth import get_optional_user, AuthenticatedUser

logger = logging.getLogger(__name__)

# Deterministic default company for dev (matches seed_data)
_DEFAULT_COMPANY_ID = _uuid.UUID("00000000-0000-0000-0000-000000000001")


async def get_company_id(
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    company_id: Optional[str] = Query(None, alias="company_id", include_in_schema=False),
    db: AsyncSession = Depends(get_db),
) -> _uuid.UUID:
    """
    Resolve the active company_id for the current request.

    Priority:
      1. JWT claim (production — always trusted)
      2. Query param (debug mode only — logged as warning)
      3. Default seeded company (debug mode only)

    In non-debug mode, unauthenticated requests are rejected with 401.
    """
    # 1. JWT takes priority — verified, trusted
    if user is not None:
        return user.company_id

    # 2. In production, require authentication
    if not settings.debug:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentisering kreves.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Debug fallback — accept query param
    if company_id:
        try:
            cid = _uuid.UUID(company_id)
            from models.company import Company
            result = await db.execute(select(Company.id).where(Company.id == cid))
            if result.scalar_one_or_none():
                return cid
        except ValueError:
            pass

    # 4. Last resort — default seeded company
    logger.debug("Using default company (debug mode, no auth)")
    return _DEFAULT_COMPANY_ID
