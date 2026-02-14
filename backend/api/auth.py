"""
Authentication API Routes
Login, register, password reset
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime

router = APIRouter()


# Request/Response models
class RegisterRequest(BaseModel):
    """Registration request."""
    email: EmailStr
    password: str
    company_org_number: str
    autonomy_level: str = "assistant"


class LoginRequest(BaseModel):
    """Login request."""
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User data response."""
    id: str
    email: str
    company_id: str | None
    company_name: str | None
    created_at: datetime


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new user and company.

    1. Validate email uniqueness
    2. Lookup company from Brønnøysund
    3. Create user with hashed password
    4. Create company record
    5. Send verification email
    """
    # TODO: Implement with actual database
    return {
        "message": "Registrering vellykket. Sjekk e-posten din for å verifisere kontoen.",
        "user": {
            "id": "uuid-placeholder",
            "email": request.email,
        },
        "company": {
            "org_number": request.company_org_number,
            "autonomy_level": request.autonomy_level,
        }
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return tokens.

    1. Verify email exists
    2. Check password hash
    3. Generate JWT tokens
    4. Log login event
    """
    # TODO: Implement with actual authentication
    return TokenResponse(
        access_token="eyJ...",
        refresh_token="eyJ...",
        expires_in=3600,
    )


@router.post("/logout")
async def logout():
    """
    Logout and invalidate tokens.

    1. Add token to blacklist
    2. Log logout event
    """
    return {"message": "Logget ut"}


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """
    Refresh access token.

    1. Validate refresh token
    2. Check token not blacklisted
    3. Generate new access token
    """
    # TODO: Implement token refresh
    return TokenResponse(
        access_token="eyJ...",
        refresh_token=refresh_token,
        expires_in=3600,
    )


@router.post("/forgot-password")
async def forgot_password(email: EmailStr):
    """
    Request password reset.

    1. Verify email exists
    2. Generate reset token
    3. Send reset email
    """
    return {"message": "Hvis e-posten finnes, har vi sendt en tilbakestillingslenke."}


@router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """
    Reset password with token.

    1. Validate reset token
    2. Update password hash
    3. Invalidate all sessions
    4. Log password change
    """
    return {"message": "Passord endret. Logg inn med nytt passord."}


@router.post("/verify-email")
async def verify_email(token: str):
    """
    Verify email address.

    1. Validate verification token
    2. Mark user as verified
    3. Log verification
    """
    return {"message": "E-post verifisert!"}
