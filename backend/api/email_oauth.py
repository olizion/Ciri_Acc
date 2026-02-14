"""
Email OAuth API
OAuth endpoints for Google and Microsoft email integration
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from config.database import get_db
from models import Company
from models.email_connection import EmailConnection, EmailProvider, EmailConnectionStatus
from services.encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_company_id(db: AsyncSession) -> uuid.UUID:
    """Get current company ID (placeholder for auth integration)."""
    query = select(Company).limit(1)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return company.id


# =============================================================================
# Pydantic Models
# =============================================================================

class ConnectionResponse(BaseModel):
    """Response model for email connection."""
    id: str
    provider: str
    email_address: str
    status: str
    is_active: bool
    last_sync_at: str | None
    emails_processed: int
    invoices_created: int
    last_error: str | None
    created_at: str | None


class ConnectionsListResponse(BaseModel):
    """Response model for list of connections."""
    connections: list[ConnectionResponse]
    total: int


class SyncResponse(BaseModel):
    """Response model for sync operation."""
    success: bool
    message: str
    emails_found: int
    invoices_created: int


class OAuthStatusResponse(BaseModel):
    """Response for OAuth configuration status."""
    google_configured: bool
    microsoft_configured: bool
    google_scopes: list[str]
    microsoft_scopes: list[str]


# =============================================================================
# OAuth Configuration
# =============================================================================

# Google OAuth config
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]

# Microsoft OAuth config (Azure AD v2.0)
MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
MICROSOFT_SCOPES = [
    "Mail.Read",
    "User.Read",
    "offline_access",
]


# In-memory state storage (use Redis in production)
oauth_states: dict[str, dict] = {}


def get_google_redirect_uri() -> str:
    """Get Google OAuth redirect URI."""
    return settings.google_redirect_uri or f"{settings.backend_url}/api/email/oauth/google/callback"


def get_microsoft_redirect_uri() -> str:
    """Get Microsoft OAuth redirect URI."""
    return settings.microsoft_redirect_uri or f"{settings.backend_url}/api/email/oauth/microsoft/callback"


# =============================================================================
# OAuth Status
# =============================================================================

@router.get("/status", response_model=OAuthStatusResponse)
async def get_oauth_status():
    """Get OAuth configuration status."""
    return OAuthStatusResponse(
        google_configured=bool(settings.google_client_id and settings.google_client_secret),
        microsoft_configured=bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        google_scopes=GOOGLE_SCOPES,
        microsoft_scopes=MICROSOFT_SCOPES,
    )


# =============================================================================
# Google OAuth Endpoints
# =============================================================================

@router.get("/google/authorize")
async def google_authorize(
    company_id: Annotated[str | None, Query(description="Company ID to connect")] = None,
    return_url: Annotated[str | None, Query(description="URL to return after auth")] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Start Google OAuth flow.
    Redirects user to Google consent screen.
    """
    if not settings.google_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth ikke konfigurert. Kontakt administrator."
        )

    # Resolve company from DB (ignore frontend-passed company_id)
    resolved_company_id = await get_company_id(db)

    # Generate state token for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "company_id": str(resolved_company_id),
        "provider": "google",
        "return_url": return_url or "/dashboard/innstillinger/email",
        "created_at": datetime.utcnow().isoformat(),
    }

    # Build authorization URL
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": get_google_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "state": state,
        "access_type": "offline",  # Get refresh token
        "prompt": "consent",  # Always show consent to get refresh token
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/google/callback")
async def google_callback(
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Google OAuth callback.
    Exchanges authorization code for tokens and stores connection.
    """
    import httpx

    # Check for errors from Google
    if error:
        return RedirectResponse(
            url=f"/dashboard/innstillinger/email?error={error}",
            status_code=302
        )

    # Validate state
    if not state or state not in oauth_states:
        return RedirectResponse(
            url="/dashboard/innstillinger/email?error=invalid_state",
            status_code=302
        )

    state_data = oauth_states.pop(state)
    company_id = state_data["company_id"]
    return_url = state_data["return_url"]

    if not code:
        return RedirectResponse(
            url=f"{return_url}?error=no_code",
            status_code=302
        )

    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "redirect_uri": get_google_redirect_uri(),
                    "grant_type": "authorization_code",
                },
            )

            if token_response.status_code != 200:
                return RedirectResponse(
                    url=f"{return_url}?error=token_exchange_failed",
                    status_code=302
                )

            tokens = token_response.json()

            if "access_token" not in tokens:
                logger.error(f"Google token response missing access_token: {list(tokens.keys())}")
                return RedirectResponse(
                    url=f"{return_url}?error=token_exchange_failed",
                    status_code=302
                )

            # Get user email
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )

            if userinfo_response.status_code != 200:
                return RedirectResponse(
                    url=f"{return_url}?error=userinfo_failed",
                    status_code=302
                )

            userinfo = userinfo_response.json()
            email = userinfo.get("email")

        if not email:
            return RedirectResponse(
                url=f"{return_url}?error=no_email_from_provider",
                status_code=302
            )

        # Check if connection already exists
        result = await db.execute(
            select(EmailConnection).where(
                EmailConnection.company_id == uuid.UUID(company_id),
                EmailConnection.provider == EmailProvider.GOOGLE,
                EmailConnection.email_address == email,
            )
        )
        existing = result.scalar_one_or_none()

        # Calculate token expiry
        expires_in = tokens.get("expires_in", 3600)
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        if existing:
            # Update existing connection
            existing.access_token = encrypt_token(tokens["access_token"])
            existing.refresh_token = encrypt_token(tokens.get("refresh_token", existing.refresh_token))
            existing.token_expires_at = token_expires_at
            existing.scopes = " ".join(GOOGLE_SCOPES)
            existing.status = EmailConnectionStatus.ACTIVE
            existing.is_active = True
            existing.last_error = None
            existing.error_count = 0
            existing.updated_at = datetime.utcnow()
        else:
            # Create new connection
            connection = EmailConnection(
                company_id=uuid.UUID(company_id),
                provider=EmailProvider.GOOGLE,
                email_address=email,
                access_token=encrypt_token(tokens["access_token"]),
                refresh_token=encrypt_token(tokens.get("refresh_token", "")),
                token_expires_at=token_expires_at,
                scopes=" ".join(GOOGLE_SCOPES),
                status=EmailConnectionStatus.ACTIVE,
                is_active=True,
            )
            db.add(connection)

        await db.commit()

        return RedirectResponse(
            url=f"{return_url}?success=google_connected&email={email}",
            status_code=302
        )

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{return_url}?error=connection_failed",
            status_code=302
        )


# =============================================================================
# Microsoft OAuth Endpoints
# =============================================================================

@router.get("/microsoft/authorize")
async def microsoft_authorize(
    company_id: Annotated[str | None, Query(description="Company ID to connect")] = None,
    return_url: Annotated[str | None, Query(description="URL to return after auth")] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Start Microsoft OAuth flow.
    Redirects user to Microsoft consent screen.
    """
    if not settings.microsoft_client_id:
        raise HTTPException(
            status_code=503,
            detail="Microsoft OAuth ikke konfigurert. Kontakt administrator."
        )

    # Resolve company from DB (ignore frontend-passed company_id)
    resolved_company_id = await get_company_id(db)

    # Generate state token for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "company_id": str(resolved_company_id),
        "provider": "microsoft",
        "return_url": return_url or "/dashboard/innstillinger/email",
        "created_at": datetime.utcnow().isoformat(),
    }

    # Build authorization URL
    tenant = settings.microsoft_tenant_id or "common"
    auth_url = MICROSOFT_AUTH_URL.format(tenant=tenant)

    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": get_microsoft_redirect_uri(),
        "response_type": "code",
        "scope": " ".join(MICROSOFT_SCOPES),
        "state": state,
        "response_mode": "query",
    }

    full_url = f"{auth_url}?{urlencode(params)}"
    return RedirectResponse(url=full_url, status_code=302)


@router.get("/microsoft/callback")
async def microsoft_callback(
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
    error_description: Annotated[str | None, Query()] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Microsoft OAuth callback.
    Exchanges authorization code for tokens and stores connection.
    """
    import httpx

    # Check for errors from Microsoft
    if error:
        return RedirectResponse(
            url=f"/dashboard/innstillinger/email?error={error}",
            status_code=302
        )

    # Validate state
    if not state or state not in oauth_states:
        return RedirectResponse(
            url="/dashboard/innstillinger/email?error=invalid_state",
            status_code=302
        )

    state_data = oauth_states.pop(state)
    company_id = state_data["company_id"]
    return_url = state_data["return_url"]

    if not code:
        return RedirectResponse(
            url=f"{return_url}?error=no_code",
            status_code=302
        )

    try:
        tenant = settings.microsoft_tenant_id or "common"
        token_url = MICROSOFT_TOKEN_URL.format(tenant=tenant)

        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                token_url,
                data={
                    "client_id": settings.microsoft_client_id,
                    "client_secret": settings.microsoft_client_secret,
                    "code": code,
                    "redirect_uri": get_microsoft_redirect_uri(),
                    "grant_type": "authorization_code",
                    "scope": " ".join(MICROSOFT_SCOPES),
                },
            )

            if token_response.status_code != 200:
                return RedirectResponse(
                    url=f"{return_url}?error=token_exchange_failed",
                    status_code=302
                )

            tokens = token_response.json()

            if "access_token" not in tokens:
                logger.error(f"Microsoft token response missing access_token: {list(tokens.keys())}")
                return RedirectResponse(
                    url=f"{return_url}?error=token_exchange_failed",
                    status_code=302
                )

            # Get user email from Microsoft Graph
            me_response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )

            if me_response.status_code != 200:
                return RedirectResponse(
                    url=f"{return_url}?error=userinfo_failed",
                    status_code=302
                )

            userinfo = me_response.json()
            email = userinfo.get("mail") or userinfo.get("userPrincipalName")

        if not email:
            return RedirectResponse(
                url=f"{return_url}?error=no_email_from_provider",
                status_code=302
            )

        # Check if connection already exists
        result = await db.execute(
            select(EmailConnection).where(
                EmailConnection.company_id == uuid.UUID(company_id),
                EmailConnection.provider == EmailProvider.MICROSOFT,
                EmailConnection.email_address == email,
            )
        )
        existing = result.scalar_one_or_none()

        # Calculate token expiry
        expires_in = tokens.get("expires_in", 3600)
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        if existing:
            # Update existing connection
            existing.access_token = encrypt_token(tokens["access_token"])
            existing.refresh_token = encrypt_token(tokens.get("refresh_token", existing.refresh_token))
            existing.token_expires_at = token_expires_at
            existing.scopes = " ".join(MICROSOFT_SCOPES)
            existing.status = EmailConnectionStatus.ACTIVE
            existing.is_active = True
            existing.last_error = None
            existing.error_count = 0
            existing.updated_at = datetime.utcnow()
        else:
            # Create new connection
            connection = EmailConnection(
                company_id=uuid.UUID(company_id),
                provider=EmailProvider.MICROSOFT,
                email_address=email,
                access_token=encrypt_token(tokens["access_token"]),
                refresh_token=encrypt_token(tokens.get("refresh_token", "")),
                token_expires_at=token_expires_at,
                scopes=" ".join(MICROSOFT_SCOPES),
                status=EmailConnectionStatus.ACTIVE,
                is_active=True,
            )
            db.add(connection)

        await db.commit()

        return RedirectResponse(
            url=f"{return_url}?success=microsoft_connected&email={email}",
            status_code=302
        )

    except Exception as e:
        logger.error(f"Microsoft OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{return_url}?error=connection_failed",
            status_code=302
        )


# =============================================================================
# Connection Management Endpoints
# =============================================================================

@router.get("/connections", response_model=ConnectionsListResponse)
async def list_connections(
    company_id: Annotated[str | None, Query(description="Company ID")] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List all email connections for a company.
    """
    resolved_company_id = await get_company_id(db)
    result = await db.execute(
        select(EmailConnection)
        .where(EmailConnection.company_id == resolved_company_id)
        .order_by(EmailConnection.created_at.desc())
    )
    connections = result.scalars().all()

    return ConnectionsListResponse(
        connections=[
            ConnectionResponse(
                id=str(c.id),
                provider=c.provider.value,
                email_address=c.email_address,
                status=c.status.value,
                is_active=c.is_active,
                last_sync_at=c.last_sync_at.isoformat() if c.last_sync_at else None,
                emails_processed=c.emails_processed,
                invoices_created=c.invoices_created,
                last_error=c.last_error,
                created_at=c.created_at.isoformat() if c.created_at else None,
            )
            for c in connections
        ],
        total=len(connections),
    )


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete (disconnect) an email connection.
    Revokes tokens and removes from database.
    """
    result = await db.execute(
        select(EmailConnection).where(EmailConnection.id == uuid.UUID(connection_id))
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=404, detail="Tilkobling ikke funnet")

    # TODO: Revoke tokens with Google/Microsoft

    db.delete(connection)
    await db.commit()

    return {"success": True, "message": "E-posttilkobling fjernet"}


@router.post("/connections/{connection_id}/toggle")
async def toggle_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Toggle connection active/inactive status.
    """
    result = await db.execute(
        select(EmailConnection).where(EmailConnection.id == uuid.UUID(connection_id))
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=404, detail="Tilkobling ikke funnet")

    connection.is_active = not connection.is_active
    connection.updated_at = datetime.utcnow()
    await db.commit()

    status_text = "aktivert" if connection.is_active else "deaktivert"
    return {"success": True, "message": f"E-posttilkobling {status_text}", "is_active": connection.is_active}


@router.post("/connections/{connection_id}/sync", response_model=SyncResponse)
async def sync_connection(
    connection_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a manual sync for a connection.
    Processes emails in the background.
    """
    result = await db.execute(
        select(EmailConnection).where(EmailConnection.id == uuid.UUID(connection_id))
    )
    connection = result.scalar_one_or_none()

    if not connection:
        raise HTTPException(status_code=404, detail="Tilkobling ikke funnet")

    if not connection.is_active:
        raise HTTPException(status_code=400, detail="Tilkobling er deaktivert")

    # Queue background sync
    from tasks.email_monitor_task import sync_single_connection
    background_tasks.add_task(sync_single_connection, str(connection.id))

    return SyncResponse(
        success=True,
        message="Synkronisering startet",
        emails_found=0,
        invoices_created=0,
    )
