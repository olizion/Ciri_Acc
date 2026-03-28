"""
MVA Reporting Service
Handles validation and submission of MVA (VAT) returns via Altinn3.

The MVA flow is multi-step via Altinn3 Instance API:
1. (Optional) Validate via Skatteetaten validation API
2. Create Altinn3 instance
3. Upload MvaMeldingInnsending metadata XML
4. Upload MvaMelding XML
5. Upload binary attachments (optional)
6. Complete filing step (process/next)
7. Complete confirmation step (process/next)
8. Poll for feedback
9. Retrieve feedback

Authentication:
- Maskinporten token → exchange for Altinn3 token
- Scope: skatteetaten:mvameldinginnsending

Docs:
- https://skatteetaten.github.io/mva-meldingen/documentation/api/
- https://github.com/Skatteetaten/mva-meldingen
"""

import asyncio
import hashlib
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
import httpx

from config.settings import settings
from services.maskinporten import maskinporten, MaskinportenError

logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

MVA_SCOPE = "skatteetaten:mvameldinginnsending"

# Altinn3 Instance API endpoints
ALTINN_INSTANCE_ENDPOINTS = {
    "test": "https://skd.apps.tt02.altinn.no/skd/mva-melding-innsending-etm2/instances",
    "prod": "https://skd.apps.altinn.no/skd/mva-melding-innsending-v1/instances",
}

# Altinn3 token exchange endpoints
ALTINN_TOKEN_EXCHANGE = {
    "test": "https://platform.tt02.altinn.no/authentication/api/v1/exchange/maskinporten",
    "prod": "https://platform.altinn.no/authentication/api/v1/exchange/maskinporten",
}

# Skatteetaten validation API
VALIDATION_ENDPOINTS = {
    "test": "https://idporten-api-sbstest.sits.no/api/mva/grensesnittstoette/mva-melding/valider",
    "prod": "https://idporten.api.skatteetaten.no/api/mva/grensesnittstoette/mva-melding/valider",
}

# Feedback poll settings
FEEDBACK_POLL_MAX_ATTEMPTS = 30
FEEDBACK_POLL_INTERVAL_SECONDS = 5


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class ValidationResult(BaseModel):
    """Result from Skatteetaten's validation API."""
    status: str  # "GYLDIG" or "UGYLDIG_SKATTEMELDING"
    errors: list[dict] = []


class AltinnInstance(BaseModel):
    """Altinn3 instance tracking data."""
    instance_id: str         # "{partyId}/{instanceGuid}"
    instance_url: str        # selfLinks.apps URL
    party_id: str
    data_guid: str           # First data element GUID (for metadata upload)
    data_url: str            # URL for the first data element


class FeedbackResult(BaseModel):
    """Feedback from Skatteetaten after processing."""
    is_accepted: bool
    validation_result: Optional[dict] = None
    payment_info: Optional[dict] = None
    receipt_data: Optional[dict] = None


class MVAServiceError(Exception):
    """Custom exception for MVA service errors."""
    def __init__(self, message: str, step: str = "", details: Optional[dict] = None):
        super().__init__(message)
        self.step = step
        self.details = details or {}


# =============================================================================
# SERVICE
# =============================================================================

class MVAService:
    """
    Service for submitting MVA returns to Skatteetaten via Altinn3.

    Orchestrates the full multi-step Altinn3 flow.
    """

    def __init__(self):
        self.env = settings.maskinporten_env

    @property
    def instance_url(self) -> str:
        return ALTINN_INSTANCE_ENDPOINTS.get(self.env, ALTINN_INSTANCE_ENDPOINTS["test"])

    @property
    def token_exchange_url(self) -> str:
        return ALTINN_TOKEN_EXCHANGE.get(self.env, ALTINN_TOKEN_EXCHANGE["test"])

    @property
    def validation_url(self) -> str:
        return VALIDATION_ENDPOINTS.get(self.env, VALIDATION_ENDPOINTS["test"])

    # -------------------------------------------------------------------------
    # Step 0: Get Altinn3 token (Maskinporten → Altinn exchange)
    # -------------------------------------------------------------------------

    async def _get_altinn_token(self) -> str:
        """
        Exchange Maskinporten token for an Altinn3 bearer token.

        Altinn3 requires its own token format, obtained by exchanging
        a valid Maskinporten token.
        """
        maskinporten_token = await maskinporten.get_token(MVA_SCOPE)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                self.token_exchange_url,
                headers={
                    "Authorization": f"Bearer {maskinporten_token}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code != 200:
                raise MVAServiceError(
                    f"Kunne ikke veksle Maskinporten-token til Altinn-token "
                    f"({response.status_code}): {response.text[:300]}",
                    step="token_exchange",
                )

            return response.text.strip('"')  # Altinn returns token as plain string

    # -------------------------------------------------------------------------
    # Step 1: Validate MVA melding (optional pre-check)
    # -------------------------------------------------------------------------

    async def validate(self, melding_xml: str) -> ValidationResult:
        """
        Validate MVA melding XML against Skatteetaten's validation API.

        This is an optional pre-check before submission.
        """
        token = await self._get_altinn_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.validation_url,
                content=melding_xml.encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/xml",
                    "Accept": "application/xml",
                },
            )

            if response.status_code != 200:
                raise MVAServiceError(
                    f"Validering feilet ({response.status_code}): {response.text[:500]}",
                    step="validate",
                )

            # Parse XML response
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.text)
            status = root.findtext("status", "")
            errors = []

            for feil in root.findall(".//valideringsfeil"):
                errors.append({
                    "sti": feil.findtext("stiTilFeil", ""),
                    "feilmelding": feil.findtext(".//feilmelding", ""),
                    "alvorlighetsgrad": feil.findtext(".//alvorlighetsgrad", ""),
                    "avvikKode": feil.findtext(".//avvikKode", ""),
                })

            return ValidationResult(status=status, errors=errors)

    # -------------------------------------------------------------------------
    # Step 2: Create Altinn3 instance
    # -------------------------------------------------------------------------

    async def create_instance(self, org_number: str) -> AltinnInstance:
        """Create a new Altinn3 instance for MVA melding submission."""
        token = await self._get_altinn_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.instance_url}/",
                json={"instanceOwner": {"organisationNumber": org_number}},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

            if response.status_code not in (200, 201):
                raise MVAServiceError(
                    f"Kunne ikke opprette Altinn-instans ({response.status_code}): "
                    f"{response.text[:500]}",
                    step="create_instance",
                )

            data = response.json()
            instance_id = data["id"]
            party_id = instance_id.split("/")[0]

            # Extract first data element (for metadata upload)
            data_elements = data.get("data", [])
            if not data_elements:
                raise MVAServiceError(
                    "Altinn-instans opprettet, men ingen dataelement returnert",
                    step="create_instance",
                )

            first_data = data_elements[0]

            return AltinnInstance(
                instance_id=instance_id,
                instance_url=data["selfLinks"]["apps"],
                party_id=party_id,
                data_guid=first_data["id"],
                data_url=first_data["selfLinks"]["apps"],
            )

    # -------------------------------------------------------------------------
    # Step 3: Upload MvaMeldingInnsending metadata XML
    # -------------------------------------------------------------------------

    async def upload_metadata(self, instance: AltinnInstance, innsending_xml: str) -> None:
        """Upload the MvaMeldingInnsending metadata XML to the instance."""
        token = await self._get_altinn_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                instance.data_url,
                content=innsending_xml.encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/xml",
                },
            )

            if response.status_code not in (200, 201):
                raise MVAServiceError(
                    f"Kunne ikke laste opp innsendingsmetadata ({response.status_code}): "
                    f"{response.text[:500]}",
                    step="upload_metadata",
                )

        logger.info(f"Metadata uploaded for instance {instance.instance_id}")

    # -------------------------------------------------------------------------
    # Step 4: Upload MvaMelding XML
    # -------------------------------------------------------------------------

    async def upload_melding(self, instance: AltinnInstance, melding_xml: str) -> None:
        """Upload the actual MvaMelding XML to the instance."""
        token = await self._get_altinn_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{instance.instance_url}/data?datatype=mvamelding",
                content=melding_xml.encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "text/xml",
                    "Content-Disposition": 'attachment; filename="mvaMelding.xml"',
                },
            )

            if response.status_code not in (200, 201):
                raise MVAServiceError(
                    f"Kunne ikke laste opp MVA-melding ({response.status_code}): "
                    f"{response.text[:500]}",
                    step="upload_melding",
                )

        logger.info(f"MVA melding uploaded for instance {instance.instance_id}")

    # -------------------------------------------------------------------------
    # Step 5: Upload binary attachments (optional)
    # -------------------------------------------------------------------------

    async def upload_attachment(
        self,
        instance: AltinnInstance,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> None:
        """Upload a binary attachment to the instance."""
        token = await self._get_altinn_token()

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{instance.instance_url}/data?datatype=binaerVedlegg",
                content=content,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": content_type,
                    "Content-Disposition": f'attachment; filename="{filename}"',
                },
            )

            if response.status_code not in (200, 201):
                raise MVAServiceError(
                    f"Kunne ikke laste opp vedlegg '{filename}' ({response.status_code}): "
                    f"{response.text[:300]}",
                    step="upload_attachment",
                )

        logger.info(f"Attachment '{filename}' uploaded for instance {instance.instance_id}")

    # -------------------------------------------------------------------------
    # Steps 6-7: Complete filing and confirmation
    # -------------------------------------------------------------------------

    async def complete_filing(self, instance: AltinnInstance) -> None:
        """Complete the filing step (first process/next). Triggers validation."""
        await self._process_next(instance, "filing")

    async def complete_confirmation(self, instance: AltinnInstance) -> None:
        """Complete the confirmation step (second process/next). Finalizes submission."""
        await self._process_next(instance, "confirmation")

    async def _process_next(self, instance: AltinnInstance, step_name: str) -> None:
        """Advance the Altinn3 process to the next step."""
        token = await self._get_altinn_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{instance.instance_url}/process/next",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code == 409:
                detail = response.text[:500]
                raise MVAServiceError(
                    f"Valideringsfeil ved {step_name}: {detail}",
                    step=step_name,
                    details={"response": detail},
                )

            if response.status_code not in (200, 204):
                raise MVAServiceError(
                    f"Kunne ikke fullføre {step_name} ({response.status_code}): "
                    f"{response.text[:500]}",
                    step=step_name,
                )

        logger.info(f"Process step '{step_name}' completed for instance {instance.instance_id}")

    # -------------------------------------------------------------------------
    # Steps 8-9: Poll for and retrieve feedback
    # -------------------------------------------------------------------------

    async def poll_feedback(self, instance: AltinnInstance) -> FeedbackResult:
        """
        Poll for feedback from Skatteetaten and retrieve it when available.

        Polls the feedback/status endpoint until feedback is provided,
        then retrieves the full feedback.
        """
        token = await self._get_altinn_token()
        base = instance.instance_url

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Poll until feedback is available
            for attempt in range(FEEDBACK_POLL_MAX_ATTEMPTS):
                status_response = await client.get(
                    f"{base}/feedback/status",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json",
                    },
                )

                if status_response.status_code == 200:
                    status_data = status_response.json()
                    if status_data.get("isFeedbackProvided"):
                        break
                elif status_response.status_code == 404:
                    pass  # Not ready yet
                else:
                    logger.warning(
                        f"Feedback poll attempt {attempt+1}: "
                        f"status {status_response.status_code}"
                    )

                if attempt < FEEDBACK_POLL_MAX_ATTEMPTS - 1:
                    await asyncio.sleep(FEEDBACK_POLL_INTERVAL_SECONDS)
            else:
                raise MVAServiceError(
                    f"Tidsavbrudd: Fikk ikke tilbakemelding fra Skatteetaten etter "
                    f"{FEEDBACK_POLL_MAX_ATTEMPTS * FEEDBACK_POLL_INTERVAL_SECONDS}s",
                    step="poll_feedback",
                )

            # Retrieve full feedback
            feedback_response = await client.get(
                f"{base}/feedback",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )

            if feedback_response.status_code != 200:
                raise MVAServiceError(
                    f"Kunne ikke hente tilbakemelding ({feedback_response.status_code}): "
                    f"{feedback_response.text[:500]}",
                    step="retrieve_feedback",
                )

            feedback_data = feedback_response.json()
            return self._parse_feedback(feedback_data)

    def _parse_feedback(self, data: dict) -> FeedbackResult:
        """Parse Altinn3 feedback response into FeedbackResult."""
        # Feedback contains data elements with different datatypes
        data_elements = data.get("data", [])

        validation = None
        payment = None
        receipt = None
        is_accepted = True

        for el in data_elements:
            dtype = el.get("dataType", "")
            if dtype == "valideringsresultat":
                validation = el
                # Check if validation indicates rejection
                # TODO: download and parse the validation XML to determine acceptance
            elif dtype == "betalingsinformasjon":
                payment = el
            elif dtype == "kvittering":
                receipt = el

        return FeedbackResult(
            is_accepted=is_accepted,
            validation_result=validation,
            payment_info=payment,
            receipt_data=receipt,
        )

    # -------------------------------------------------------------------------
    # High-level: Full submission flow
    # -------------------------------------------------------------------------

    async def submit_full_flow(
        self,
        org_number: str,
        melding_xml: str,
        innsending_xml: str,
        validate_first: bool = True,
        attachments: Optional[list[dict]] = None,
    ) -> dict:
        """
        Execute the complete MVA submission flow.

        Args:
            org_number: 9-digit organization number
            melding_xml: MvaMelding XML content
            innsending_xml: MvaMeldingInnsending metadata XML
            validate_first: Whether to pre-validate (recommended)
            attachments: Optional list of {"filename": str, "content": bytes, "content_type": str}

        Returns:
            Dict with instance_id, feedback, and step results
        """
        result = {"steps": {}}

        # Step 1: Validate (optional)
        if validate_first:
            validation = await self.validate(melding_xml)
            result["steps"]["validate"] = {
                "status": validation.status,
                "errors": validation.errors,
            }
            if validation.status == "UGYLDIG_SKATTEMELDING":
                raise MVAServiceError(
                    f"MVA-meldingen er ugyldig: {len(validation.errors)} feil funnet",
                    step="validate",
                    details={"errors": validation.errors},
                )

        # Step 2: Create instance
        instance = await self.create_instance(org_number)
        result["instance_id"] = instance.instance_id
        result["instance_url"] = instance.instance_url
        result["steps"]["create_instance"] = {"instance_id": instance.instance_id}

        # Step 3: Upload metadata
        await self.upload_metadata(instance, innsending_xml)
        result["steps"]["upload_metadata"] = {"status": "ok"}

        # Step 4: Upload melding
        await self.upload_melding(instance, melding_xml)
        result["steps"]["upload_melding"] = {"status": "ok"}

        # Step 5: Upload attachments
        if attachments:
            for att in attachments:
                await self.upload_attachment(
                    instance, att["filename"], att["content"], att["content_type"]
                )
            result["steps"]["upload_attachments"] = {"count": len(attachments)}

        # Step 6: Complete filing
        await self.complete_filing(instance)
        result["steps"]["complete_filing"] = {"status": "ok"}

        # Step 7: Complete confirmation
        await self.complete_confirmation(instance)
        result["steps"]["complete_confirmation"] = {"status": "ok"}

        # Steps 8-9: Poll for feedback
        feedback = await self.poll_feedback(instance)
        result["steps"]["feedback"] = {
            "is_accepted": feedback.is_accepted,
            "validation_result": feedback.validation_result,
            "payment_info": feedback.payment_info,
        }
        result["feedback"] = feedback

        return result

    # -------------------------------------------------------------------------
    # Database-integrated submission
    # -------------------------------------------------------------------------

    async def submit_from_database(
        self,
        db,
        company_id: str,
        period_year: int,
        period_description: str,
        meldingskategori: str = "alminnelig",
    ) -> dict:
        """
        High-level: Build MVA melding from database records and submit.

        Aggregates bilag MVA data for the given period, builds XML,
        and runs the full Altinn3 submission flow.

        Args:
            db: AsyncSession
            company_id: Company UUID
            period_year: Year
            period_description: e.g. "januar-februar"
            meldingskategori: e.g. "alminnelig"

        Returns:
            Submission result dict
        """
        from sqlalchemy import select, and_
        from models.company import Company
        from models.bilag import Bilag
        from models.mva_submission import (
            MVASubmission, MVASubmissionStatus, MVASubmissionType,
            MVAMeldingskategori,
        )
        from services.mva_xml_builder import (
            MvaMeldingXmlBuilder,
            MvaMeldingInnsendingXmlBuilder,
            MvaSpesifikasjonslinje,
            BIMONTHLY_PERIODS,
        )

        # Fetch company
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        if not company:
            raise MVAServiceError(f"Fant ikke selskap med id {company_id}", step="prepare")
        if not company.mva_registered:
            raise MVAServiceError("Selskapet er ikke MVA-registrert", step="prepare")

        org_nr = company.org_number

        # Determine month range from period description
        month_range = _period_to_months(period_description)

        # Fetch bilag with MVA data for this period
        result = await db.execute(
            select(Bilag).where(
                and_(
                    Bilag.company_id == company_id,
                    Bilag.mva_amount != None,  # noqa: E711
                    Bilag.mva_amount != 0,
                )
            )
        )
        bilag_list = result.scalars().all()

        # Filter to period (using bilag date)
        period_bilag = [
            b for b in bilag_list
            if b.date and b.date.year == period_year
            and b.date.month in month_range
        ]

        # Aggregate MVA by code
        mva_aggregated = _aggregate_mva(period_bilag)

        # Build MvaMelding XML
        melding_builder = MvaMeldingXmlBuilder(
            organisasjonsnummer=org_nr,
            meldingskategori=meldingskategori,
            periode=period_description,
            aar=period_year,
        )

        total_utgaaende = Decimal(0)
        total_inngaaende = Decimal(0)
        linjer_json = []

        for kode, amounts in mva_aggregated.items():
            linje = MvaSpesifikasjonslinje(
                mva_kode=kode,
                merverdiavgift=amounts["mva"],
                grunnlag=amounts.get("grunnlag"),
                sats=amounts.get("sats"),
            )
            melding_builder.add_linje(linje)
            linjer_json.append(linje.to_dict())

            from services.mva_xml_builder import MVA_CODES
            code_info = MVA_CODES.get(kode, {})
            direction = code_info.get("direction", "")
            if direction in ("utgaaende", "begge"):
                total_utgaaende += amounts["mva"]
            if direction in ("inngaaende", "begge"):
                total_inngaaende += amounts["mva"]

        melding_xml = melding_builder.build_xml()
        fastsatt = melding_builder.compute_fastsatt_merverdiavgift()

        # Build MvaMeldingInnsending XML
        innsending_builder = MvaMeldingInnsendingXmlBuilder(
            organisasjonsnummer=org_nr,
            meldingskategori=meldingskategori,
            periode=period_description,
            aar=period_year,
        )
        innsending_builder.add_melding_vedlegg()
        innsending_xml = innsending_builder.build_xml()

        # Create submission record
        submission = MVASubmission(
            company_id=company_id,
            period_year=period_year,
            period_description=period_description,
            meldingskategori=MVAMeldingskategori(meldingskategori),
            submission_type=MVASubmissionType.ORIGINAL,
            melding_xml=melding_xml,
            innsending_xml=innsending_xml,
            payload_hash_sha256=hashlib.sha256(melding_xml.encode()).hexdigest(),
            utgaaende_mva=total_utgaaende,
            inngaaende_mva=total_inngaaende,
            fastsatt_merverdiavgift=fastsatt,
            spesifikasjonslinjer=linjer_json,
            status=MVASubmissionStatus.DRAFT,
        )
        submission.set_retention(fiscal_year=period_year, category="mva")
        db.add(submission)
        await db.flush()

        # Run the full submission flow
        try:
            flow_result = await self.submit_full_flow(
                org_number=org_nr,
                melding_xml=melding_xml,
                innsending_xml=innsending_xml,
                validate_first=True,
            )

            # Update submission
            submission.status = MVASubmissionStatus.CONFIRMED
            submission.altinn_instance_id = flow_result.get("instance_id")
            submission.altinn_instance_url = flow_result.get("instance_url")
            submission.submitted_at = datetime.utcnow()

            feedback = flow_result.get("feedback")
            if feedback:
                submission.feedback_data = {
                    "is_accepted": feedback.is_accepted,
                    "validation_result": feedback.validation_result,
                    "payment_info": feedback.payment_info,
                }
                if feedback.is_accepted:
                    submission.status = MVASubmissionStatus.ACCEPTED
                else:
                    submission.status = MVASubmissionStatus.REJECTED

            await db.commit()
            return flow_result

        except MVAServiceError as e:
            submission.status = MVASubmissionStatus.ERROR
            submission.rejection_reason = str(e)
            await db.commit()
            raise

    def is_configured(self) -> bool:
        """Check if MVA submission is ready."""
        return maskinporten.is_configured()

    def get_configuration_status(self) -> dict:
        return {
            "maskinporten": maskinporten.get_configuration_status(),
            "mva_scope": MVA_SCOPE,
            "altinn_instance_endpoint": self.instance_url,
            "validation_endpoint": self.validation_url,
            "is_configured": self.is_configured(),
        }


# =============================================================================
# HELPERS
# =============================================================================

def _period_to_months(period_description: str) -> list[int]:
    """Convert period description to list of month numbers."""
    mapping = {
        "januar": [1], "februar": [2], "mars": [3], "april": [4],
        "mai": [5], "juni": [6], "juli": [7], "august": [8],
        "september": [9], "oktober": [10], "november": [11], "desember": [12],
        "januar-februar": [1, 2], "mars-april": [3, 4],
        "mai-juni": [5, 6], "juli-august": [7, 8],
        "september-oktober": [9, 10], "november-desember": [11, 12],
        "januar-mars": [1, 2, 3], "april-juni": [4, 5, 6],
        "juli-september": [7, 8, 9], "oktober-desember": [10, 11, 12],
        "januar-juni": [1, 2, 3, 4, 5, 6], "juli-desember": [7, 8, 9, 10, 11, 12],
        "aarlig": list(range(1, 13)),
    }
    months = mapping.get(period_description)
    if not months:
        raise MVAServiceError(
            f"Ukjent periodebeskriving: {period_description}",
            step="prepare",
        )
    return months


def _aggregate_mva(bilag_list) -> dict:
    """
    Aggregate MVA amounts from bilag by MVA code.

    Returns: {mva_code: {"mva": Decimal, "grunnlag": Decimal, "sats": float}}
    """
    aggregated: dict = {}

    for bilag in bilag_list:
        mva_code = bilag.mva_code if hasattr(bilag, "mva_code") and bilag.mva_code else 3
        mva_amount = Decimal(str(bilag.mva_amount)) if bilag.mva_amount else Decimal(0)
        grunnlag = Decimal(str(bilag.total_amount)) if hasattr(bilag, "total_amount") and bilag.total_amount else None

        if mva_code not in aggregated:
            aggregated[mva_code] = {"mva": Decimal(0), "grunnlag": Decimal(0)}

        aggregated[mva_code]["mva"] += mva_amount
        if grunnlag:
            aggregated[mva_code]["grunnlag"] += grunnlag

    # Derive sats from code info
    from services.mva_xml_builder import MVA_CODES
    for kode, amounts in aggregated.items():
        code_info = MVA_CODES.get(kode, {})
        if code_info.get("rate") is not None:
            amounts["sats"] = code_info["rate"]

    return aggregated


# Singleton
mva_service = MVAService()


# =============================================================================
# MOCK SERVICE
# =============================================================================

class MockMVAService:
    """Mock service for development when Maskinporten is not configured."""

    async def validate(self, melding_xml: str) -> ValidationResult:
        await asyncio.sleep(0.2)
        return ValidationResult(status="GYLDIG", errors=[])

    async def submit_full_flow(self, **kwargs) -> dict:
        await asyncio.sleep(0.5)
        instance_id = f"50000000/{uuid.uuid4()}"
        return {
            "instance_id": instance_id,
            "instance_url": f"https://mock.altinn.no/instances/{instance_id}",
            "steps": {
                "validate": {"status": "GYLDIG", "errors": []},
                "create_instance": {"instance_id": instance_id},
                "upload_metadata": {"status": "ok"},
                "upload_melding": {"status": "ok"},
                "complete_filing": {"status": "ok"},
                "complete_confirmation": {"status": "ok"},
                "feedback": {"is_accepted": True},
            },
            "feedback": FeedbackResult(is_accepted=True),
        }

    def is_configured(self) -> bool:
        return True

    def get_configuration_status(self) -> dict:
        return {"mode": "mock", "description": "Mock MVA for development"}


mock_mva_service = MockMVAService()


def get_mva_service():
    """Get the appropriate service based on configuration."""
    if mva_service.is_configured():
        return mva_service
    return mock_mva_service
