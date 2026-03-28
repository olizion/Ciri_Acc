"""
A-melding Innrapportering Service
Handles generation and submission of A-melding payroll reports to Skatteetaten.

API: innrapportering-amelding (synchronous POST)
Scope: skatteetaten:innrapporteringamelding
Docs: https://skatteetaten.github.io/api-dokumentasjon/api/innrapportering-amelding
Swagger: https://app.swaggerhub.com/apis/skatteetaten/innrapportering-amelding-api/0.1.0
"""

import hashlib
import json
import logging
import uuid
from datetime import datetime, date
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

AMELDING_SCOPE = "skatteetaten:innrapporteringamelding"

KILDESYSTEM = "Ciri"

# Skatteetaten innrapportering-amelding API endpoints
AMELDING_ENDPOINTS = {
    "test": "https://innrapporteringamelding.api.skatteetaten-test.no/v1",
    "prod": "https://innrapporteringamelding.api.skatteetaten.no/v1",
}


# =============================================================================
# RESPONSE / ERROR MODELS
# =============================================================================

class Leveransebekreftelse(BaseModel):
    """Successful submission response from Skatteetaten."""
    dialog_id: str = Field(alias="dialogId")
    forsendelse_id: str = Field(alias="forsendelseId")
    meldings_id: str = Field(alias="meldingsId")

    class Config:
        populate_by_name = True


class FeilSpesifisering(BaseModel):
    """Field-level error detail."""
    kode: str = ""
    melding: str = ""
    sti: str = ""              # Path to field, separated by '/'
    angitt_verdi: str = Field("", alias="angittVerdi")


class AMeldingFeil(BaseModel):
    """Error response from Skatteetaten."""
    kode: str = ""
    melding: str = ""
    korrelasjonsid: str = ""
    spesifisering: list[FeilSpesifisering] = []


class AMeldingError(Exception):
    """Custom exception for A-melding errors."""
    def __init__(self, message: str, feil: Optional[AMeldingFeil] = None):
        super().__init__(message)
        self.feil = feil


# =============================================================================
# PAYLOAD BUILDER
# =============================================================================

class AMeldingPayloadBuilder:
    """
    Builds the A-melding JSON payload from payslip/employee data.

    Schema: urn:no:skatteetaten:innhenting:aordningen:v2
    Reference: https://app.swaggerhub.com/apis/skatteetaten/innrapportering-amelding-api/0.1.0

    The payload structure:
        Amelding
          leveranse
            leveringstidspunkt
            kalendermaaned (YYYY-MM)
            kildesystem
            meldingsId
            erstatterMeldingsId (for corrections)
            opplysningspliktig { norskIdentifikator }
            oppgave (JuridiskEntitet)
              virksomhet[]
                norskIdentifikator (underenhet org nr)
                inntektsmottaker[]
                  norskIdentifikator (personnummer)
                  arbeidsforhold[]
                  inntekt[]
                  forskuddstrekk[]
                arbeidsgiveravgift
              betalingsinformasjon
            spraakForTilbakemelding
    """

    def __init__(
        self,
        opplysningspliktig_orgnr: str,
        periode: str,  # YYYY-MM
        virksomhet_orgnr: Optional[str] = None,
    ):
        self.opplysningspliktig_orgnr = opplysningspliktig_orgnr
        self.virksomhet_orgnr = virksomhet_orgnr or opplysningspliktig_orgnr
        self.periode = periode
        self.meldings_id = str(uuid.uuid4()).replace("-", "")
        self._inntektsmottakere: list[dict] = []
        self._arbeidsgiveravgift: Optional[dict] = None
        self._betalingsinformasjon: Optional[dict] = None
        self._erstatter_meldings_id: Optional[str] = None

    def set_erstatter(self, meldings_id: str) -> "AMeldingPayloadBuilder":
        """Set the meldingsId this submission replaces (for corrections)."""
        self._erstatter_meldings_id = meldings_id
        return self

    def add_inntektsmottaker(
        self,
        personnummer: str,
        arbeidsforhold: list[dict],
        inntekter: list[dict],
        forskuddstrekk: list[dict],
        fradrag: Optional[list[dict]] = None,
        identifiserende_informasjon: Optional[dict] = None,
    ) -> "AMeldingPayloadBuilder":
        """
        Add an employee (inntektsmottaker) to the report.

        Args:
            personnummer: 11-digit Norwegian national ID
            arbeidsforhold: Employment relationships
            inntekter: Income entries
            forskuddstrekk: Tax withholdings
            fradrag: Deductions (optional)
            identifiserende_informasjon: Name, DOB etc (optional)
        """
        mottaker: dict = {
            "norskIdentifikator": personnummer,
        }

        if identifiserende_informasjon:
            mottaker["identifiserendeInformasjon"] = identifiserende_informasjon

        if arbeidsforhold:
            mottaker["arbeidsforhold"] = arbeidsforhold

        if inntekter:
            mottaker["inntekt"] = inntekter

        if forskuddstrekk:
            mottaker["forskuddstrekk"] = forskuddstrekk

        if fradrag:
            mottaker["fradrag"] = fradrag

        self._inntektsmottakere.append(mottaker)
        return self

    def set_arbeidsgiveravgift(self, avgift: dict) -> "AMeldingPayloadBuilder":
        """
        Set employer's national insurance contributions (arbeidsgiveravgift).

        Example avgift:
        {
            "loennOgGodtgjoerelse": [{
                "beregningskode": "generpisngsregler",
                "sone": "1",
                "avgiftsgrunnlagBeloep": 500000,
                "prosentsats": 14.1
            }]
        }
        """
        self._arbeidsgiveravgift = avgift
        return self

    def set_betalingsinformasjon(
        self,
        sum_forskuddstrekk: int,
        sum_arbeidsgiveravgift: int,
        sum_finansskatt_loenn: int = 0,
        utbetalingsdatoer: Optional[list[dict]] = None,
    ) -> "AMeldingPayloadBuilder":
        """
        Set payment summary information.

        Args:
            sum_forskuddstrekk: Total tax withholding (whole NOK)
            sum_arbeidsgiveravgift: Total employer contributions (whole NOK)
            sum_finansskatt_loenn: Financial tax on wages (whole NOK)
            utbetalingsdatoer: [{dato: "YYYY-MM-DD", beloep: int}]
        """
        info: dict = {
            "sumForskuddstrekk": sum_forskuddstrekk,
            "sumArbeidsgiveravgift": sum_arbeidsgiveravgift,
        }
        if sum_finansskatt_loenn:
            info["sumFinansskattLoenn"] = sum_finansskatt_loenn
        if utbetalingsdatoer:
            info["sumForskuddstrekkPerLoennsutbetalingsdato"] = utbetalingsdatoer

        self._betalingsinformasjon = info
        return self

    def build(self) -> dict:
        """Build the complete A-melding payload."""
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        # Build virksomhet (business unit)
        virksomhet: dict = {
            "norskIdentifikator": self.virksomhet_orgnr,
        }
        if self._inntektsmottakere:
            virksomhet["inntektsmottaker"] = self._inntektsmottakere
        if self._arbeidsgiveravgift:
            virksomhet["arbeidsgiveravgift"] = self._arbeidsgiveravgift

        # Build oppgave (JuridiskEntitet)
        oppgave: dict = {
            "virksomhet": [virksomhet],
        }
        if self._betalingsinformasjon:
            oppgave["betalingsinformasjon"] = self._betalingsinformasjon

        # Build leveranse
        leveranse: dict = {
            "leveringstidspunkt": now,
            "kalendermaaned": self.periode,
            "kildesystem": KILDESYSTEM,
            "meldingsId": self.meldings_id,
            "opplysningspliktig": {
                "norskIdentifikator": self.opplysningspliktig_orgnr,
            },
            "oppgave": oppgave,
            "spraakForTilbakemelding": "bokmaal",
        }

        if self._erstatter_meldings_id:
            leveranse["erstatterMeldingsId"] = self._erstatter_meldings_id

        return {"leveranse": leveranse}

    def build_json(self) -> str:
        """Build and return as JSON string."""
        return json.dumps(self.build(), ensure_ascii=False, default=str)


# =============================================================================
# HELPER: Build inntektsmottaker data from Employee + Payslip
# =============================================================================

def build_inntektsmottaker_from_payslip(employee, payslip) -> dict:
    """
    Convert an Employee + Payslip into A-melding inntektsmottaker components.

    Returns dict with keys: arbeidsforhold, inntekter, forskuddstrekk,
    identifiserende_informasjon.
    """
    # Arbeidsforhold
    arbeidsforhold = [{
        "typeArbeidsforhold": _map_employment_type(employee.employment_type.value),
        "startdato": employee.start_date.isoformat() if employee.start_date else None,
        "stillingsprosent": float(100),  # TODO: derive from employee data
        "avloenningstype": "fastloenn",
        "yrke": "2411",  # Default STYRK code — TODO: map from employee.position
    }]
    if employee.end_date:
        arbeidsforhold[0]["sluttdato"] = employee.end_date.isoformat()

    # Inntekt (income entries)
    inntekter = [{
        "fordel": "kontantytelse",
        "utloeserArbeidsgiveravgift": True,
        "inngaarIGrunnlagForTrekk": True,
        "beloep": str(payslip.gross_salary),
        "startdatoOpptjeningsperiode": date(payslip.year, payslip.month, 1).isoformat(),
        "sluttdatoOpptjeningsperiode": _last_day_of_month(payslip.year, payslip.month).isoformat(),
        "loennsinntekt": {
            "beskrivelse": "fastloenn",
        },
    }]

    # Forskuddstrekk (tax withholding)
    forskuddstrekk = [{
        "beskrivelse": "betaltTrygdeavgift" if False else "sumForskuddstrekk",  # noqa
        "beloep": int(payslip.tax_deduction),
    }]

    # Identifiserende informasjon
    identifiserende = {
        "fornavn": employee.first_name,
        "etternavn": employee.last_name,
    }

    return {
        "arbeidsforhold": arbeidsforhold,
        "inntekter": inntekter,
        "forskuddstrekk": forskuddstrekk,
        "identifiserende_informasjon": identifiserende,
    }


def _map_employment_type(emp_type: str) -> str:
    """Map internal employment type to A-melding typeArbeidsforhold code."""
    mapping = {
        "fast": "ordinaertArbeidsforhold",
        "deltid": "ordinaertArbeidsforhold",
        "vikar": "ordinaertArbeidsforhold",
        "laerling": "ordinaertArbeidsforhold",
    }
    return mapping.get(emp_type, "ordinaertArbeidsforhold")


def _last_day_of_month(year: int, month: int) -> date:
    """Return the last day of the given month."""
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1).replace(day=1) - __import__("datetime").timedelta(days=1)


# =============================================================================
# SERVICE
# =============================================================================

class AMeldingService:
    """
    Service for submitting A-melding reports to Skatteetaten.

    Uses the innrapportering-amelding API (synchronous POST, JSON payload).
    Authentication via Maskinporten with Altinn system user.

    Flow:
    1. Build payload from payslips using AMeldingPayloadBuilder
    2. POST /v1/innsending/{periode}/{opplysningspliktig}
    3. Receive Leveransebekreftelse (dialogId, forsendelseId, meldingsId)
    4. Store submission record in amelding_submissions table
    """

    def __init__(self):
        self.env = settings.maskinporten_env

    @property
    def base_url(self) -> str:
        return AMELDING_ENDPOINTS.get(self.env, AMELDING_ENDPOINTS["test"])

    async def submit(
        self,
        payload: dict,
        periode: str,
        opplysningspliktig: str,
        idempotency_key: Optional[str] = None,
    ) -> Leveransebekreftelse:
        """
        Submit an A-melding to Skatteetaten.

        Args:
            payload: Complete A-melding payload (from AMeldingPayloadBuilder.build())
            periode: Period in YYYY-MM format
            opplysningspliktig: 9-digit org number
            idempotency_key: UUID for idempotency (generated if not provided)

        Returns:
            Leveransebekreftelse with dialogId, forsendelseId, meldingsId

        Raises:
            AMeldingError: If submission fails
        """
        if not maskinporten.is_configured():
            raise AMeldingError(
                "Maskinporten er ikke konfigurert. "
                "Sjekk MASKINPORTEN_CLIENT_ID, MASKINPORTEN_KID, og MASKINPORTEN_PRIVATE_KEY_PATH."
            )

        # Validate periode format
        if not _valid_periode(periode):
            raise AMeldingError(f"Ugyldig periode: {periode}. Bruk format YYYY-MM (fra 2015-01).")

        # Validate org number
        opplysningspliktig = opplysningspliktig.strip()
        if len(opplysningspliktig) != 9 or not opplysningspliktig.isdigit():
            raise AMeldingError(f"Ugyldig organisasjonsnummer: {opplysningspliktig}")

        # Get Maskinporten token with A-melding scope
        try:
            token = await maskinporten.get_token(AMELDING_SCOPE)
        except MaskinportenError as e:
            raise AMeldingError(f"Kunne ikke hente Maskinporten-token: {e}")

        # Build request
        url = f"{self.base_url}/innsending/{periode}/{opplysningspliktig}"
        idempotency_key = idempotency_key or str(uuid.uuid4())

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "idempotencyKey": idempotency_key,
        }

        logger.info(
            f"Submitting A-melding for {periode} / org {opplysningspliktig} "
            f"(idempotencyKey={idempotency_key})"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.RequestError as e:
                raise AMeldingError(f"Nettverksfeil: Kunne ikke koble til Skatteetaten: {e}")

            if response.status_code == 200:
                data = response.json()
                bekreftelse = Leveransebekreftelse(**data)
                logger.info(
                    f"A-melding accepted: dialogId={bekreftelse.dialog_id}, "
                    f"meldingsId={bekreftelse.meldings_id}"
                )
                return bekreftelse

            # Error handling
            feil = None
            try:
                feil_data = response.json()
                feil = AMeldingFeil(**feil_data)
                error_msg = (
                    f"Skatteetaten avviste A-melding ({response.status_code}): "
                    f"{feil.kode} — {feil.melding}"
                )
                if feil.spesifisering:
                    field_errors = "; ".join(
                        f"{s.sti}: {s.melding} (verdi: {s.angitt_verdi})"
                        for s in feil.spesifisering
                    )
                    error_msg += f" | Felt: {field_errors}"
            except Exception:
                error_msg = (
                    f"Skatteetaten feil ({response.status_code}): {response.text[:500]}"
                )

            logger.error(error_msg)
            raise AMeldingError(error_msg, feil=feil)

    async def submit_from_payslips(
        self,
        db,
        company_id: str,
        periode: str,
        erstatter_meldings_id: Optional[str] = None,
    ) -> Leveransebekreftelse:
        """
        High-level: Build and submit A-melding from payslip data in the database.

        Args:
            db: AsyncSession
            company_id: UUID of the company
            periode: YYYY-MM
            erstatter_meldings_id: meldingsId to replace (for corrections)

        Returns:
            Leveransebekreftelse
        """
        from sqlalchemy import select
        from models.employee import Employee, Payslip, EmployeeStatus
        from models.company import Company
        from models.amelding_submission import (
            AMeldingSubmission, AMeldingType, AMeldingStatus,
        )

        # Fetch company
        result = await db.execute(
            select(Company).where(Company.id == company_id)
        )
        company = result.scalar_one_or_none()
        if not company:
            raise AMeldingError(f"Fant ikke selskap med id {company_id}")

        org_nr = company.org_number
        if not org_nr or len(org_nr) != 9:
            raise AMeldingError(f"Ugyldig organisasjonsnummer for selskapet: {org_nr}")

        # Parse periode
        year, month = int(periode[:4]), int(periode[5:7])

        # Fetch payslips for this period
        result = await db.execute(
            select(Payslip)
            .where(Payslip.company_id == company_id)
            .where(Payslip.year == year)
            .where(Payslip.month == month)
        )
        payslips = result.scalars().all()

        if not payslips:
            raise AMeldingError(f"Ingen lnnslipper funnet for {periode}")

        # Fetch employees for these payslips
        employee_ids = {p.employee_id for p in payslips}
        result = await db.execute(
            select(Employee).where(Employee.id.in_(employee_ids))
        )
        employees_by_id = {e.id: e for e in result.scalars().all()}

        # Build payload
        builder = AMeldingPayloadBuilder(
            opplysningspliktig_orgnr=org_nr,
            periode=periode,
        )

        if erstatter_meldings_id:
            builder.set_erstatter(erstatter_meldings_id)

        total_forskuddstrekk = 0
        total_gross = Decimal(0)
        total_tax = Decimal(0)
        total_aga = Decimal(0)

        for payslip in payslips:
            employee = employees_by_id.get(payslip.employee_id)
            if not employee:
                logger.warning(f"Employee {payslip.employee_id} not found, skipping")
                continue

            data = build_inntektsmottaker_from_payslip(employee, payslip)

            builder.add_inntektsmottaker(
                personnummer=employee.personnummer,
                arbeidsforhold=data["arbeidsforhold"],
                inntekter=data["inntekter"],
                forskuddstrekk=data["forskuddstrekk"],
                identifiserende_informasjon=data["identifiserende_informasjon"],
            )

            total_gross += payslip.gross_salary
            total_tax += payslip.tax_deduction
            total_forskuddstrekk += int(payslip.tax_deduction)
            total_aga += payslip.arbeidsgiveravgift

        # Set arbeidsgiveravgift
        builder.set_arbeidsgiveravgift({
            "loennOgGodtgjoerelse": [{
                "beregningskode": "generpisngsregler",
                "sone": "1",  # TODO: determine sone from company address
                "avgiftsgrunnlagBeloep": int(total_gross),
                "prosentsats": 14.1,
            }],
        })

        # Set payment summary
        builder.set_betalingsinformasjon(
            sum_forskuddstrekk=total_forskuddstrekk,
            sum_arbeidsgiveravgift=int(total_aga),
        )

        payload = builder.build()

        # Create submission record (DRAFT)
        submission_type = (
            AMeldingType.REPLACEMENT if erstatter_meldings_id
            else AMeldingType.ORDINARY
        )
        submission = AMeldingSubmission(
            company_id=company_id,
            period_year=year,
            period_month=month,
            submission_type=submission_type,
            payload_json=payload,
            payload_hash_sha256=hashlib.sha256(
                json.dumps(payload, sort_keys=True, default=str).encode()
            ).hexdigest(),
            employee_count=len(payslips),
            total_gross_salary=total_gross,
            total_tax_deduction=total_tax,
            total_employer_contributions=total_aga,
            status=AMeldingStatus.DRAFT,
        )
        submission.set_retention(fiscal_year=int(periode[:4]), category="amelding")
        db.add(submission)
        await db.flush()

        # Submit to Skatteetaten
        try:
            bekreftelse = await self.submit(
                payload=payload,
                periode=periode,
                opplysningspliktig=org_nr,
            )

            # Update submission record
            submission.status = AMeldingStatus.SUBMITTED
            submission.submission_reference = bekreftelse.meldings_id
            submission.altinn_receipt_id = bekreftelse.dialog_id
            submission.altinn_receipt_data = {
                "dialogId": bekreftelse.dialog_id,
                "forsendelseId": bekreftelse.forsendelse_id,
                "meldingsId": bekreftelse.meldings_id,
            }
            submission.submitted_at = datetime.utcnow()

            # Mark payslips as submitted
            for payslip in payslips:
                payslip.amelding_submitted = True
                payslip.amelding_reference = bekreftelse.meldings_id

            await db.commit()
            return bekreftelse

        except AMeldingError:
            submission.status = AMeldingStatus.REJECTED
            await db.commit()
            raise

    def is_configured(self) -> bool:
        """Check if A-melding submission is ready."""
        return maskinporten.is_configured()

    def get_configuration_status(self) -> dict:
        return {
            "maskinporten": maskinporten.get_configuration_status(),
            "amelding_scope": AMELDING_SCOPE,
            "amelding_endpoint": self.base_url,
            "is_configured": self.is_configured(),
        }


def _valid_periode(periode: str) -> bool:
    """Validate YYYY-MM format, >= 2015-01."""
    import re
    if not re.match(r"^(201[5-9]|20[2-9]\d)-(0[1-9]|1[0-2])$", periode):
        return False
    return True


# Singleton
amelding_service = AMeldingService()


# =============================================================================
# MOCK SERVICE FOR DEVELOPMENT
# =============================================================================

class MockAMeldingService:
    """Mock service for development when Maskinporten is not configured."""

    async def submit(
        self,
        payload: dict,
        periode: str,
        opplysningspliktig: str,
        idempotency_key: Optional[str] = None,
    ) -> Leveransebekreftelse:
        """Return mock submission response."""
        import asyncio
        await asyncio.sleep(0.3)

        return Leveransebekreftelse(
            dialogId=str(uuid.uuid4()),
            forsendelseId=str(uuid.uuid4()),
            meldingsId=str(uuid.uuid4()).replace("-", ""),
        )

    def is_configured(self) -> bool:
        return True

    def get_configuration_status(self) -> dict:
        return {"mode": "mock", "description": "Mock A-melding for development"}


mock_amelding_service = MockAMeldingService()


def get_amelding_service():
    """Get the appropriate service based on configuration."""
    if amelding_service.is_configured():
        return amelding_service
    return mock_amelding_service
