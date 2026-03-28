"""
Authentication Dependencies
JWT-based authentication for all protected API endpoints.

Usage in routers:
    from dependencies.auth import get_current_user, AuthenticatedUser

    @router.get("/items")
    async def list_items(user: AuthenticatedUser = Depends(get_current_user)):
        # user.user_id, user.company_id are verified from JWT
        ...
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from utils.jwt_utils import decode_access_token

logger = logging.getLogger(__name__)

# Reusable security scheme — appears in OpenAPI docs
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    """Verified identity extracted from a valid JWT access token."""
    user_id: UUID
    company_id: UUID


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency that validates the JWT and returns the authenticated user.

    Raises 401 if:
      - No Authorization header
      - Token is expired or tampered
      - Token is missing required claims (sub, company_id)
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentisering kreves. Logg inn for å fortsette.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ugyldig eller utløpt token. Logg inn på nytt.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    company_id = payload.get("company_id")

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token mangler bruker-ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token mangler selskaps-ID. Velg selskap og logg inn på nytt.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return AuthenticatedUser(
            user_id=UUID(sub),
            company_id=UUID(company_id),
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ugyldig token-format.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Optional[AuthenticatedUser]:
    """
    Like get_current_user, but returns None instead of raising 401.
    Use for endpoints that work both authenticated and unauthenticated
    (e.g., public invoice view with optional owner features).
    """
    if credentials is None:
        return None

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None

    sub = payload.get("sub")
    company_id = payload.get("company_id")
    if not sub or not company_id:
        return None

    try:
        return AuthenticatedUser(user_id=UUID(sub), company_id=UUID(company_id))
    except ValueError:
        return None
