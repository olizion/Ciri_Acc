"""
Altinn System User API Routes
Endpoints for managing per-track system user delegations (customer authorization).

Two distinct tracks:
  - lonn: Skattekort + A-melding (payroll)
  - mva: MVA-melding (VAT returns)

Each track is authorized independently. A customer can approve lønn
without MVA (or vice versa). The missing track surfaces as a
connect-button in the relevant dashboard section.
"""

import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from models.system_user import SystemUser, SystemUserStatus, AuthorizationTrack
from services.altinn_systemuser import (
    altinn_systemuser,
    AltinnSystemUserError,
    TRACK_CONFIG,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class SystemUserCreateRequest(BaseModel):
    """Request to create system user delegation for a specific track."""
    company_id: str
    customer_org_number: str = Field(..., min_length=9, max_length=9, pattern=r"^\d{9}$")
    track: str = Field(..., description="Authorization track: 'lonn' or 'mva'")


class SystemUserResponse(BaseModel):
    """System user delegation record."""
    id: str
    customer_org_number: str
    track: str
    track_label: str
    status: str
    confirm_url: Optional[str] = None
    external_ref: str
    altinn_request_id: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str


class SystemUserCreateResponse(BaseModel):
    """Response after creating a system user request."""
    status: str  # "created", "pending", "already_approved"
    track: str
    message: Optional[str] = None
    confirm_url: Optional[str] = None
    request_id: Optional[str] = None
    system_user_id: Optional[str] = None


class TrackStatusResponse(BaseModel):
    """Status of a specific track for a customer org."""
    track: str
    track_label: str
    is_approved: bool
    status: Optional[str] = None
    confirm_url: Optional[str] = None
    approved_at: Optional[str] = None
    system_user_id: Optional[str] = None


class OrgAuthStatusResponse(BaseModel):
    """Full authorization status for a customer org across all tracks."""
    org_number: str
    tracks: list[TrackStatusResponse]
    all_approved: bool


class ConfigStatusResponse(BaseModel):
    """Altinn system user configuration status."""
    is_configured: bool
    system_id: str
    environment: str
    altinn_base: str
    tracks: dict


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/config/status", response_model=ConfigStatusResponse)
async def get_config_status():
    """Check Altinn system user configuration."""
    status = altinn_systemuser.get_configuration_status()
    return ConfigStatusResponse(**status)


@router.post("/system/register")
async def register_system():
    """
    Register Ciri in Altinn's system registry.
    One-time setup — call this once per environment.
    Registers access packages for ALL tracks.
    """
    if not altinn_systemuser.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Maskinporten er ikke konfigurert. Sjekk .env-innstillinger.",
        )

    try:
        result = await altinn_systemuser.register_system()
        if result.success:
            return {
                "status": "registered",
                "system_id": result.system_id,
                "data": result.response_data,
            }
        else:
            raise HTTPException(status_code=400, detail=result.error)
    except AltinnSystemUserError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/request", response_model=SystemUserCreateResponse)
async def create_system_user_request(
    request: SystemUserCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a system user request for a specific authorization track.

    Each track (lonn, mva) is a separate Altinn approval. The customer
    gets a distinct confirmUrl for each track they need to authorize.
    """
    if request.track not in TRACK_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Ugyldig track: '{request.track}'. Gyldige verdier: {list(TRACK_CONFIG.keys())}",
        )

    if not altinn_systemuser.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Altinn-integrasjon er ikke konfigurert.",
        )

    try:
        result = await altinn_systemuser.create_and_track(
            db=db,
            company_id=request.company_id,
            customer_org_number=request.customer_org_number,
            track=request.track,
        )
        return SystemUserCreateResponse(**result)
    except AltinnSystemUserError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/request/{system_user_id}/refresh")
async def refresh_request_status(
    system_user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Check the current approval status from Altinn.
    Call this after sending the customer the confirm_url.
    """
    try:
        result = await altinn_systemuser.refresh_status(db, system_user_id)
        return result
    except AltinnSystemUserError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/callback")
async def altinn_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Callback endpoint for Altinn approval redirect.

    After the customer approves in Altinn's portal, they are redirected here.
    We redirect to the appropriate frontend page based on query params.
    """
    # Altinn doesn't pass status — frontend will poll /refresh
    track = request.query_params.get("track", "")
    track_cfg = TRACK_CONFIG.get(track)

    if track_cfg:
        redirect_path = track_cfg["redirect_path"]
    else:
        redirect_path = "/dashboard/innstillinger/altinn?callback=true"

    return RedirectResponse(url=f"{settings.frontend_url}{redirect_path}")


@router.get("/requests", response_model=list[SystemUserResponse])
async def list_system_users(
    company_id: Optional[str] = None,
    track: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List system user delegations, optionally filtered by company and/or track."""
    query = select(SystemUser).order_by(desc(SystemUser.created_at))

    if company_id:
        query = query.where(SystemUser.company_id == company_id)
    if track:
        query = query.where(SystemUser.track == AuthorizationTrack(track))

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        SystemUserResponse(
            id=str(su.id),
            customer_org_number=su.customer_org_number,
            track=su.track.value,
            track_label=su.track_label,
            status=su.status.value,
            confirm_url=su.confirm_url if su.status == SystemUserStatus.NEW else None,
            external_ref=su.external_ref,
            altinn_request_id=su.altinn_request_id,
            approved_at=su.approved_at.isoformat() if su.approved_at else None,
            created_at=su.created_at.isoformat(),
        )
        for su in users
    ]


@router.get("/status/{org_number}", response_model=OrgAuthStatusResponse)
async def get_org_auth_status(
    org_number: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get the full authorization status for a customer org across all tracks.

    Used by:
    - Onboarding flow to show which tracks are pending/approved
    - Lønn page to show "Koble til Skatteetaten" button if lonn track missing
    - MVA page to show "Koble til Altinn" button if mva track missing
    - Pre-submission checks in amelding/mva services
    """
    result = await db.execute(
        select(SystemUser).where(
            SystemUser.customer_org_number == org_number,
        ).order_by(desc(SystemUser.created_at))
    )
    all_users = result.scalars().all()

    # Build status per track (most recent request wins)
    track_statuses: dict[str, SystemUser] = {}
    for su in all_users:
        track_key = su.track.value
        if track_key not in track_statuses:
            track_statuses[track_key] = su

    tracks = []
    for track_name, cfg in TRACK_CONFIG.items():
        su = track_statuses.get(track_name)
        if su:
            tracks.append(TrackStatusResponse(
                track=track_name,
                track_label=cfg["label_nb"],
                is_approved=su.status == SystemUserStatus.ACCEPTED,
                status=su.status.value,
                confirm_url=su.confirm_url if su.status == SystemUserStatus.NEW else None,
                approved_at=su.approved_at.isoformat() if su.approved_at else None,
                system_user_id=str(su.id),
            ))
        else:
            tracks.append(TrackStatusResponse(
                track=track_name,
                track_label=cfg["label_nb"],
                is_approved=False,
                status=None,
            ))

    return OrgAuthStatusResponse(
        org_number=org_number,
        tracks=tracks,
        all_approved=all(t.is_approved for t in tracks),
    )


@router.get("/status/{org_number}/{track}")
async def get_track_status(
    org_number: str,
    track: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Quick check: is a specific track approved for a customer org?

    Used by submission services to verify before calling Skatteetaten/Altinn3:
    - GET /api/altinn/status/999888777/lonn → before skattekort/A-melding
    - GET /api/altinn/status/999888777/mva  → before MVA submission
    """
    if track not in TRACK_CONFIG:
        raise HTTPException(status_code=400, detail=f"Ugyldig track: {track}")

    result = await db.execute(
        select(SystemUser).where(
            SystemUser.customer_org_number == org_number,
            SystemUser.track == AuthorizationTrack(track),
            SystemUser.status == SystemUserStatus.ACCEPTED,
        )
    )
    approved = result.scalar_one_or_none()

    return {
        "org_number": org_number,
        "track": track,
        "track_label": TRACK_CONFIG[track]["label_nb"],
        "is_approved": approved is not None,
        "approved_at": approved.approved_at.isoformat() if approved and approved.approved_at else None,
        "system_user_id": str(approved.id) if approved else None,
    }


@router.delete("/request/{system_user_id}")
async def delete_request(
    system_user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending system user request."""
    result = await db.execute(
        select(SystemUser).where(SystemUser.id == system_user_id)
    )
    su = result.scalar_one_or_none()

    if not su:
        raise HTTPException(status_code=404, detail="Systembruker ikke funnet")

    if su.status != SystemUserStatus.NEW:
        raise HTTPException(
            status_code=400,
            detail=f"Kan bare slette forespørsler med status 'New' (nåværende: {su.status.value})",
        )

    # Delete from Altinn
    if su.altinn_request_id:
        try:
            await altinn_systemuser.delete_request(su.altinn_request_id)
        except AltinnSystemUserError as e:
            logger.warning(f"Could not delete from Altinn: {e}")

    # Mark as rejected in our DB (don't actually delete for audit trail)
    su.status = SystemUserStatus.DENIED
    su.status_message = "Slettet av bruker"
    await db.commit()

    return {"status": "deleted", "system_user_id": system_user_id}
