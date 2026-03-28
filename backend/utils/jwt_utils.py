"""
JWT Utilities
Shared JWT encode/decode for authentication and audit middleware.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from jose import jwt, JWTError

from config.settings import settings

logger = logging.getLogger(__name__)


def create_access_token(
    user_id: UUID,
    company_id: Optional[UUID] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token."""
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
    }
    if company_id:
        payload["company_id"] = str(company_id)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: UUID) -> str:
    """Create a signed JWT refresh token."""
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.

    Returns the payload dict with 'sub' (user_id), 'company_id', 'exp'
    or None if the token is invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") not in ("access", None):
            return None
        return payload
    except JWTError as e:
        logger.debug(f"JWT decode failed: {e}")
        return None
