"""
Altinn System User Service
Handles system registration, per-customer system user requests, and approval tracking.

This is the API-integrated version of the standalone scripts in scripts/.

Flow:
1. register_system() — One-time: register Ciri in Altinn system registry
2. create_request() — Per-customer: create system user request, get confirmUrl
3. Customer opens confirmUrl and approves in Altinn portal
4. check_request_status() — Poll or callback to detect approval
5. Maskinporten tokens can now include authorization_details for that customer

Docs:
- https://skatteetaten.github.io/api-dokumentasjon/om/systembruker
- https://docs.altinn.studio/authentication/what-do-you-get/systemuser/
"""

import logging
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import httpx

from config.settings import settings
from services.maskinporten import maskinporten, MaskinportenError

logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

# Scopes needed for system user management
SCOPE_REGISTER = "altinn:authentication/systemregister.write"
SCOPE_REQUEST_WRITE = "altinn:authentication/systemuser.request.write"
SCOPE_REQUEST_READ = "altinn:authentication/systemuser.request.read"

# Altinn platform endpoints
ALTINN_ENDPOINTS = {
    "test": "https://platform.tt02.altinn.no",
    "prod": "https://platform.altinn.no",
}

# Our system ID
SYSTEM_ID_TEMPLATE = "{org_number}_ciri"

# ─────────────────────────────────────────────────────────────────────────────
# TRACK DEFINITIONS
#
# Two distinct authorization tracks to keep concerns separated.
# Each track has its own access packages, scopes, and redirect paths.
# A customer approves each track independently via separate confirmUrls.
# ─────────────────────────────────────────────────────────────────────────────

TRACK_CONFIG = {
    "lonn": {
        "label_nb": "Lønn — skattekort og A-melding",
        "label_en": "Payroll — tax cards and A-melding",
        "access_packages": [
            {"urn": "urn:altinn:accesspackage:skattnaering"},
        ],
        "scopes": [
            "skatteetaten:skattekorttilarbeidsgiver",
            "skatteetaten:innrapporteringamelding",
        ],
        "redirect_path": "/dashboard/lonn?altinn=approved",
        "external_ref_suffix": "lonn",
    },
    "mva": {
        "label_nb": "MVA-melding",
        "label_en": "VAT returns",
        "access_packages": [
            {"urn": "urn:altinn:accesspackage:regnskapsforer-med-signeringsrettighet"},
        ],
        "scopes": [
            "skatteetaten:mvameldinginnsending",
        ],
        "redirect_path": "/dashboard/mva?altinn=approved",
        "external_ref_suffix": "mva",
    },
}

# Combined access packages for system registration (all tracks)
ALL_ACCESS_PACKAGES = []
_seen_urns = set()
for _cfg in TRACK_CONFIG.values():
    for _pkg in _cfg["access_packages"]:
        if _pkg["urn"] not in _seen_urns:
            ALL_ACCESS_PACKAGES.append(_pkg)
            _seen_urns.add(_pkg["urn"])


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class SystemRegistrationResult(BaseModel):
    """Result from registering system in Altinn."""
    system_id: str
    success: bool
    response_data: Optional[dict] = None
    error: Optional[str] = None


class SystemUserRequestResult(BaseModel):
    """Result from creating a system user request."""
    request_id: str
    confirm_url: str
    external_ref: str
    status: str


class SystemUserStatusResult(BaseModel):
    """Status check result for a system user request."""
    request_id: str
    status: str  # New, Accepted, Denied, Rejected, Timedout
    external_ref: Optional[str] = None
    system_id: Optional[str] = None


class AltinnSystemUserError(Exception):
    """Custom exception for Altinn system user errors."""
    pass


# =============================================================================
# SERVICE
# =============================================================================

class AltinnSystemUserService:
    """
    Service for managing Altinn system user delegations.

    Handles the full lifecycle: system registration, per-customer
    request creation, approval tracking, and status polling.
    """

    def __init__(self):
        self.env = settings.maskinporten_env
        self.org_number = settings.maskinporten_issuer

    @property
    def altinn_base(self) -> str:
        return ALTINN_ENDPOINTS.get(self.env, ALTINN_ENDPOINTS["test"])

    @property
    def system_id(self) -> str:
        return SYSTEM_ID_TEMPLATE.format(org_number=self.org_number)

    # -------------------------------------------------------------------------
    # Step 1: Register system (one-time setup)
    # -------------------------------------------------------------------------

    async def register_system(
        self,
        client_id: Optional[str] = None,
        redirect_urls: Optional[list[str]] = None,
    ) -> SystemRegistrationResult:
        """
        Register Ciri as a system in Altinn's system registry.

        Only needs to be done once (or to update the registration).
        """
        token = await self._get_token(SCOPE_REGISTER)
        url = f"{self.altinn_base}/authentication/api/v1/systemregister/vendor"

        payload = {
            "id": self.system_id,
            "vendor": {
                "authority": "iso6523-actorid-upis",
                "ID": f"0192:{self.org_number}",
            },
            "name": {
                "nb": "Ciri Regnskapssystem",
                "en": "Ciri Accounting System",
            },
            "description": {
                "nb": "AI-drevet regnskapssystem for norske småbedrifter. "
                      "Håndterer MVA-melding, A-melding, skattekort og regnskap.",
                "en": "AI-powered accounting system for Norwegian small businesses. "
                      "Handles VAT returns, payroll reporting, tax cards and bookkeeping.",
            },
            "accessPackages": ALL_ACCESS_PACKAGES,
            "clientId": [client_id or settings.maskinporten_client_id],
            "allowedredirecturls": redirect_urls or [
                f"{settings.backend_url}/api/altinn/callback",
                f"{settings.frontend_url}/dashboard/lonn",
                f"{settings.frontend_url}/dashboard/mva",
                f"{settings.frontend_url}/dashboard/innstillinger/altinn",
            ],
            "isVisible": True,
        }

        logger.info(f"Registering system '{self.system_id}' at {url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

            if response.status_code in (200, 201):
                data = response.json()
                logger.info(f"System '{self.system_id}' registered successfully")
                return SystemRegistrationResult(
                    system_id=self.system_id,
                    success=True,
                    response_data=data,
                )

            error_msg = f"Registration failed ({response.status_code}): {response.text[:500]}"
            logger.error(error_msg)
            return SystemRegistrationResult(
                system_id=self.system_id,
                success=False,
                error=error_msg,
            )

    # -------------------------------------------------------------------------
    # Step 2: Create system user request for a customer
    # -------------------------------------------------------------------------

    async def create_request(
        self,
        customer_org_number: str,
        track: str,
        external_ref: Optional[str] = None,
        redirect_url: Optional[str] = None,
        access_packages: Optional[list[dict]] = None,
    ) -> SystemUserRequestResult:
        """
        Create a system user request for a customer organization on a specific track.

        Returns a confirmUrl that the customer must open to approve.

        Args:
            customer_org_number: 9-digit org number of the customer
            track: Authorization track ("lonn" or "mva")
            external_ref: Your internal reference (auto-generated if not provided)
            redirect_url: Where to redirect after approval
            access_packages: Override access packages (defaults to track packages)
        """
        track_cfg = TRACK_CONFIG.get(track)
        if not track_cfg:
            raise AltinnSystemUserError(f"Ukjent autorisasjonsspor: {track}")

        token = await self._get_token(SCOPE_REQUEST_WRITE)

        external_ref = external_ref or f"ciri-{customer_org_number}-{track_cfg['external_ref_suffix']}"
        redirect_url = redirect_url or f"{settings.frontend_url}{track_cfg['redirect_path']}"
        packages = access_packages or track_cfg["access_packages"]

        url = f"{self.altinn_base}/authentication/api/v1/systemuser/request/vendor/agent"

        payload = {
            "externalRef": external_ref,
            "systemId": self.system_id,
            "partyOrgNo": customer_org_number,
            "accessPackages": packages,
            "redirectUrl": redirect_url,
        }

        logger.info(
            f"Creating system user request for org {customer_org_number} "
            f"track={track} (externalRef={external_ref})"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

            if response.status_code not in (200, 201):
                error_text = response.text[:500]
                raise AltinnSystemUserError(
                    f"Kunne ikke opprette systembruker-forespørsel ({response.status_code}): "
                    f"{error_text}"
                )

            data = response.json()
            confirm_url = data.get("confirmUrl", "")
            request_id = data.get("id", "")

            logger.info(
                f"System user request created: id={request_id}, "
                f"confirmUrl={confirm_url[:80]}..."
            )

            return SystemUserRequestResult(
                request_id=request_id,
                confirm_url=confirm_url,
                external_ref=external_ref,
                status=data.get("status", "New"),
            )

    # -------------------------------------------------------------------------
    # Step 3: Check request status
    # -------------------------------------------------------------------------

    async def check_status_by_id(self, request_id: str) -> SystemUserStatusResult:
        """Check status of a system user request by its Altinn ID."""
        token = await self._get_token(SCOPE_REQUEST_READ)
        url = (
            f"{self.altinn_base}/authentication/api/v1/"
            f"systemuser/request/vendor/agent/{request_id}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )

            if response.status_code != 200:
                raise AltinnSystemUserError(
                    f"Kunne ikke sjekke status ({response.status_code}): {response.text[:300]}"
                )

            data = response.json()
            return SystemUserStatusResult(
                request_id=request_id,
                status=data.get("status", "Unknown"),
                external_ref=data.get("externalRef"),
                system_id=data.get("systemId"),
            )

    async def check_status_by_external_ref(
        self,
        customer_org_number: str,
        external_ref: str,
    ) -> SystemUserStatusResult:
        """Check status by external reference (our internal ref)."""
        token = await self._get_token(SCOPE_REQUEST_READ)
        url = (
            f"{self.altinn_base}/authentication/api/v1/"
            f"systemuser/request/vendor/agent/byexternalref/"
            f"{self.system_id}/{customer_org_number}/{external_ref}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )

            if response.status_code != 200:
                raise AltinnSystemUserError(
                    f"Kunne ikke sjekke status ({response.status_code}): {response.text[:300]}"
                )

            data = response.json()
            return SystemUserStatusResult(
                request_id=data.get("id", ""),
                status=data.get("status", "Unknown"),
                external_ref=external_ref,
                system_id=data.get("systemId"),
            )

    async def list_requests(self) -> list[dict]:
        """List all system user requests for our system."""
        token = await self._get_token(SCOPE_REQUEST_READ)
        url = (
            f"{self.altinn_base}/authentication/api/v1/"
            f"systemuser/request/vendor/agent/bysystem/{self.system_id}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )

            if response.status_code != 200:
                raise AltinnSystemUserError(
                    f"Kunne ikke hente forespørsler ({response.status_code}): {response.text[:300]}"
                )

            return response.json()

    async def delete_request(self, request_id: str) -> bool:
        """Delete/cancel a pending system user request."""
        token = await self._get_token(SCOPE_REQUEST_WRITE)
        url = (
            f"{self.altinn_base}/authentication/api/v1/"
            f"systemuser/request/vendor/{request_id}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                url,
                headers={"Authorization": f"Bearer {token}"},
            )

            return response.status_code in (200, 204)

    # -------------------------------------------------------------------------
    # Database-integrated flow
    # -------------------------------------------------------------------------

    async def create_and_track(
        self,
        db,
        company_id: str,
        customer_org_number: str,
        track: str,
    ) -> dict:
        """
        Create a system user request for a specific track and store it in the database.

        Args:
            db: AsyncSession
            company_id: Company UUID
            customer_org_number: 9-digit org number
            track: "lonn" or "mva"

        Returns dict with confirm_url for the customer.
        """
        from sqlalchemy import select
        from models.system_user import SystemUser, SystemUserStatus, AuthorizationTrack

        track_enum = AuthorizationTrack(track)
        track_cfg = TRACK_CONFIG[track]
        external_ref = f"ciri-{customer_org_number}-{track_cfg['external_ref_suffix']}"

        # Check if we already have an active request for this org + track
        result = await db.execute(
            select(SystemUser).where(
                SystemUser.customer_org_number == customer_org_number,
                SystemUser.track == track_enum,
                SystemUser.status.in_([
                    SystemUserStatus.NEW,
                    SystemUserStatus.ACCEPTED,
                ]),
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            if existing.status == SystemUserStatus.ACCEPTED:
                return {
                    "status": "already_approved",
                    "track": track,
                    "message": f"Autorisasjon for {track_cfg['label_nb']} allerede godkjent",
                    "system_user_id": str(existing.id),
                }
            else:
                return {
                    "status": "pending",
                    "track": track,
                    "message": f"Forespørsel for {track_cfg['label_nb']} venter på godkjenning",
                    "confirm_url": existing.confirm_url,
                    "request_id": existing.altinn_request_id,
                }

        # Create request via Altinn API
        request_result = await self.create_request(
            customer_org_number=customer_org_number,
            track=track,
            external_ref=external_ref,
        )

        # Store in database
        system_user = SystemUser(
            company_id=company_id,
            customer_org_number=customer_org_number,
            track=track_enum,
            external_ref=external_ref,
            altinn_request_id=request_result.request_id,
            confirm_url=request_result.confirm_url,
            status=SystemUserStatus.NEW,
            system_id=self.system_id,
            access_packages=track_cfg["access_packages"],
            redirect_url=f"{settings.frontend_url}{track_cfg['redirect_path']}",
        )
        db.add(system_user)
        await db.flush()

        return {
            "status": "created",
            "track": track,
            "confirm_url": request_result.confirm_url,
            "request_id": request_result.request_id,
            "external_ref": external_ref,
            "system_user_id": str(system_user.id),
        }

    async def refresh_status(self, db, system_user_id: str) -> dict:
        """Check the current status of a system user request from Altinn."""
        from sqlalchemy import select
        from models.system_user import SystemUser, SystemUserStatus

        result = await db.execute(
            select(SystemUser).where(SystemUser.id == system_user_id)
        )
        su = result.scalar_one_or_none()
        if not su:
            raise AltinnSystemUserError(f"Systembruker {system_user_id} ikke funnet")

        if not su.altinn_request_id:
            raise AltinnSystemUserError("Ingen Altinn-forespørsel registrert")

        # Check status via Altinn API
        status_result = await self.check_status_by_id(su.altinn_request_id)

        # Update database
        old_status = su.status
        su.status = SystemUserStatus(status_result.status)
        su.status_checked_at = datetime.utcnow()

        if status_result.status == "Accepted" and old_status != SystemUserStatus.ACCEPTED:
            su.approved_at = datetime.utcnow()
            logger.info(f"System user for org {su.customer_org_number} approved!")

        await db.commit()

        return {
            "status": status_result.status,
            "previous_status": old_status.value,
            "track": su.track.value,
            "customer_org_number": su.customer_org_number,
            "approved_at": su.approved_at.isoformat() if su.approved_at else None,
        }

    # -------------------------------------------------------------------------
    # Token helper: get Maskinporten token for a specific customer
    # -------------------------------------------------------------------------

    async def get_customer_token(self, customer_org_number: str, scope: str) -> str:
        """
        Get a Maskinporten token authorized for a specific customer org.

        This creates a JWT assertion with authorization_details targeting
        the customer's org number, allowing API calls on their behalf.

        Requires that the customer has an approved system user.
        """
        from services.maskinporten import MaskinportenService

        # Build custom JWT with customer-specific authorization_details
        service = MaskinportenService()

        # Override the default authorization_details to target this customer
        import time
        import uuid as _uuid
        import jwt as _jwt

        now = int(time.time())
        payload = {
            "aud": service.endpoints["issuer"],
            "iss": service.client_id,
            "scope": scope,
            "iat": now,
            "exp": now + 120,
            "jti": str(_uuid.uuid4()),
            "authorization_details": [
                {
                    "type": "urn:altinn:systemuser",
                    "systemuser_org": {
                        "authority": "iso6523-actorid-upis",
                        "ID": f"0192:{customer_org_number}",
                    },
                }
            ],
        }

        if service.issuer:
            payload["consumer_org"] = service.issuer

        private_key = service._load_private_key()
        from cryptography.hazmat.primitives import serialization as _ser
        private_key_pem = private_key.private_bytes(
            encoding=_ser.Encoding.PEM,
            format=_ser.PrivateFormat.PKCS8,
            encryption_algorithm=_ser.NoEncryption(),
        )

        headers = {}
        if service.kid:
            headers["kid"] = service.kid

        assertion = _jwt.encode(payload, private_key_pem, algorithm="RS256", headers=headers)

        # Exchange assertion for token
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                service.endpoints["token"],
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code != 200:
                raise AltinnSystemUserError(
                    f"Token request failed for customer {customer_org_number} "
                    f"({response.status_code}): {response.text[:300]}"
                )

            return response.json()["access_token"]

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    async def _get_token(self, scope: str) -> str:
        """Get a Maskinporten token for Altinn management operations."""
        try:
            return await maskinporten.get_token(scope)
        except MaskinportenError as e:
            raise AltinnSystemUserError(f"Maskinporten-feil: {e}")

    def is_configured(self) -> bool:
        return maskinporten.is_configured() and bool(self.org_number)

    def get_configuration_status(self) -> dict:
        return {
            "is_configured": self.is_configured(),
            "system_id": self.system_id,
            "altinn_base": self.altinn_base,
            "environment": self.env,
            "org_number": self.org_number,
            "tracks": {
                track: {
                    "label": cfg["label_nb"],
                    "scopes": cfg["scopes"],
                    "access_packages": cfg["access_packages"],
                }
                for track, cfg in TRACK_CONFIG.items()
            },
        }


# Singleton
altinn_systemuser = AltinnSystemUserService()
