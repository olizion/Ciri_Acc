"""
Skatteetaten API Service
Handles communication with Norwegian Tax Authority APIs

API: skattekorttilarbeidsgiver (async bestill/svar pattern)
Scope: skatteetaten:skattekorttilarbeidsgiver
Docs: https://skatteetaten.github.io/api-dokumentasjon/anvendelsesomraader/skattekorttilarbeidsgiver
Swagger: https://app.swaggerhub.com/apis/skatteetaten/skattekort-til-arbeidsgiver/1.0.1
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import httpx

from config.settings import settings
from services.maskinporten import maskinporten, MaskinportenError

logger = logging.getLogger(__name__)


class SkatteetatenError(Exception):
    """Custom exception for Skatteetaten API errors."""
    pass


class TaxCard(BaseModel):
    """Tax card (skattekort) information for an employee."""

    personnummer: str
    name: Optional[str] = None

    # Tax deduction type: "tabelltrekk", "prosenttrekk", or "frikort"
    tax_card_type: str

    # For table-based deduction (tabelltrekk)
    tax_table: Optional[str] = None  # e.g., "7100"
    tax_class: Optional[str] = None

    # For percentage-based deduction (prosenttrekk)
    tax_percentage: Optional[float] = None

    # Additional info
    tax_municipality: Optional[str] = None
    frikort_amount: Optional[float] = None
    frikort_used: Optional[float] = None

    # Result status from Skatteetaten
    result_status: Optional[str] = None  # e.g., "skattekortopplysningerOK"

    # Metadata
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "personnummer": "12345678901",
                "tax_card_type": "tabelltrekk",
                "tax_table": "7100",
                "tax_municipality": "0301",
                "result_status": "skattekortopplysningerOK",
                "fetched_at": "2026-02-01T10:00:00Z",
            }
        }


class FolkeregisterPerson(BaseModel):
    """Basic person information from Folkeregisteret."""

    personnummer: str
    first_name: str
    last_name: str
    birth_date: Optional[str] = None
    address: Optional[dict] = None


class SkatteetatenService:
    """
    Service for the skattekorttilarbeidsgiver API (async bestill/svar pattern).

    Flow:
    1. POST /api/forskudd/bestillSkattekort — submit order
    2. GET  /api/forskudd/skattekortTilArbeidsgiver/svar/{id} — poll for response

    Prerequisites:
    1. Maskinporten integration with scope skatteetaten:skattekorttilarbeidsgiver
    2. Kid (key ID) registered in Samarbeidsportalen
    """

    ENDPOINTS = {
        "test": {
            "forskudd": "https://api-test.sits.no/api/forskudd",
            "folkeregister": "https://folkeregisteret-api-konsument.sits.no/folkeregisteret/offentlig-med-hjemmel/api/v1",
        },
        "prod": {
            "forskudd": "https://api.skatteetaten.no/api/forskudd",
            "folkeregister": "https://folkeregisteret.api.skatteetaten.no/folkeregisteret/offentlig-med-hjemmel/api/v1",
        },
    }

    # Max time to wait for async response
    POLL_MAX_ATTEMPTS = 20
    POLL_INTERVAL_SECONDS = 3

    def __init__(self):
        self.env = settings.maskinporten_env

    @property
    def endpoints(self) -> dict:
        return self.ENDPOINTS.get(self.env, self.ENDPOINTS["test"])

    async def fetch_tax_card(
        self,
        personnummer: str,
        year: Optional[int] = None,
        employer_org: Optional[str] = None,
    ) -> TaxCard:
        """
        Fetch tax card (skattekort) for an employee via the async bestill/svar API.

        Args:
            personnummer: 11-digit Norwegian personal ID
            year: Tax year (defaults to current year)
            employer_org: Employer org number (defaults to MASKINPORTEN_ISSUER)

        Returns:
            TaxCard with tax deduction information

        Raises:
            SkatteetatenError: If the API call fails
        """
        if not maskinporten.is_configured():
            raise SkatteetatenError(
                "Maskinporten er ikke konfigurert. Sjekk .env:\n"
                "  - MASKINPORTEN_CLIENT_ID\n"
                "  - MASKINPORTEN_KID\n"
                "  - MASKINPORTEN_PRIVATE_KEY_PATH"
            )

        personnummer = personnummer.replace(" ", "").replace("-", "")
        if len(personnummer) != 11 or not personnummer.isdigit():
            raise SkatteetatenError("Ugyldig fødselsnummer. Må være 11 siffer.")

        year = year or datetime.now().year
        org_nr = employer_org or settings.maskinporten_issuer
        if not org_nr:
            raise SkatteetatenError("Mangler organisasjonsnummer (MASKINPORTEN_ISSUER).")

        token = await maskinporten.get_token(settings.skatteetaten_scopes)
        base = self.endpoints["forskudd"]

        # Step 1: Submit order
        bestilling = {
            "inntektsaar": year,
            "bestillingstype": "HENT_ALLE_OPPGITTE",
            "kontaktinformasjon": {"epostadresse": settings.smtp_from_email or "ciri@ciri.no"},
            "varslingstype": "INGEN_VARSEL",
            "forespoerselOmSkattekortTilArbeidsgiver": {
                "arbeidsgiver": [{
                    "arbeidsgiveridentifikator": {"organisasjonsnummer": org_nr},
                    "arbeidstakeridentifikator": [personnummer],
                }]
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }

            idempotens_id = str(uuid.uuid4())
            url = f"{base}/bestillSkattekort?idempotensid={idempotens_id}"

            try:
                response = await client.post(url, json=bestilling, headers=headers)
            except httpx.RequestError as e:
                raise SkatteetatenError(f"Nettverksfeil: Kunne ikke koble til Skatteetaten: {e}")

            if response.status_code == 403:
                raise SkatteetatenError(
                    "Mangler tilgang til Skattekort API. "
                    "Sjekk scopes i Maskinporten."
                )
            if response.status_code == 400:
                detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
                raise SkatteetatenError(f"Ugyldig forespørsel: {detail}")
            if response.status_code != 200:
                raise SkatteetatenError(
                    f"Skatteetaten API feil ({response.status_code}): {response.text[:500]}"
                )

            kvittering = response.json()
            bestillingsid = kvittering.get("bestillingsreferanse") or kvittering.get("dialogreferanse")
            if not bestillingsid:
                raise SkatteetatenError(f"Mangler bestillingsreferanse i svar: {kvittering}")

            logger.info(f"Skattekort bestilling submitted: {bestillingsid}")

            # Step 2: Poll for response
            svar_url = f"{base}/skattekortTilArbeidsgiver/svar/{bestillingsid}"

            for attempt in range(self.POLL_MAX_ATTEMPTS):
                await asyncio.sleep(self.POLL_INTERVAL_SECONDS)

                try:
                    response = await client.get(svar_url, headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json",
                    })
                except httpx.RequestError as e:
                    logger.warning(f"Poll attempt {attempt+1} network error: {e}")
                    continue

                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Skattekort received for {personnummer[:6]}*****")
                    return self._parse_svar_response(personnummer, data)
                elif response.status_code == 204:
                    logger.debug(f"Poll attempt {attempt+1}/{self.POLL_MAX_ATTEMPTS}: not ready")
                    continue
                else:
                    raise SkatteetatenError(
                        f"Feil ved henting av svar ({response.status_code}): {response.text[:500]}"
                    )

            raise SkatteetatenError(
                f"Tidsavbrudd: Fikk ikke svar fra Skatteetaten etter {self.POLL_MAX_ATTEMPTS * self.POLL_INTERVAL_SECONDS}s"
            )

    def _parse_svar_response(self, personnummer: str, data: dict) -> TaxCard:
        """Parse the SkattekortTilArbeidsgiver svar into a TaxCard."""

        status = data.get("status")
        if status and status != "FORESPOERSEL_OK":
            raise SkatteetatenError(f"Skatteetaten avviste forespørselen: {status}")

        # Navigate: arbeidsgiver[0] -> arbeidstaker[0] -> skattekort
        arbeidsgivere = data.get("arbeidsgiver", [])
        if not arbeidsgivere:
            raise SkatteetatenError("Ingen arbeidsgiverdata i svar fra Skatteetaten.")

        arbeidstakere = arbeidsgivere[0].get("arbeidstaker", [])
        if not arbeidstakere:
            raise SkatteetatenError(
                f"Fant ikke skattekort for {personnummer[:6]}*****."
            )

        melding = arbeidstakere[0]
        result_status = melding.get("resultatForSkattekort", "")
        skattekort = melding.get("skattekort", {})
        forskuddstrekk = skattekort.get("forskuddstrekk", [])

        # Build TaxCard
        tax_card = TaxCard(
            personnummer=personnummer,
            tax_card_type="ukjent",
            result_status=result_status,
            fetched_at=datetime.now(),
        )

        if result_status in ("ikkeSkattekort", "ikkeTrekkplikt"):
            tax_card.tax_card_type = "ingen"
            return tax_card

        if not forskuddstrekk:
            tax_card.tax_card_type = "ukjent"
            return tax_card

        # Prioritize loennFraHovedarbeidsgiver, fall back to first entry
        hovedarbeidsgiver = None
        for entry in forskuddstrekk:
            if entry.get("trekkode") == "loennFraHovedarbeidsgiver":
                hovedarbeidsgiver = entry
                break
        target = hovedarbeidsgiver or forskuddstrekk[0]

        frikort = target.get("frikort")
        trekktabell = target.get("trekktabell")
        trekkprosent = target.get("trekkprosent")

        if frikort:
            tax_card.tax_card_type = "frikort"
            tax_card.frikort_amount = frikort.get("frikortbeloep")
        elif trekktabell:
            tax_card.tax_card_type = "tabelltrekk"
            tax_card.tax_table = trekktabell.get("tabellnummer")
            tax_card.tax_percentage = trekktabell.get("prosentsats")
        elif trekkprosent:
            tax_card.tax_card_type = "prosenttrekk"
            tax_card.tax_percentage = trekkprosent.get("prosentsats")

        return tax_card

    async def fetch_person_info(self, personnummer: str) -> Optional[FolkeregisterPerson]:
        """Fetch basic person information from Folkeregisteret (requires special access)."""
        if not settings.folkeregister_enabled:
            return None

        if not maskinporten.is_configured():
            return None

        personnummer = personnummer.replace(" ", "").replace("-", "")

        try:
            token = await maskinporten.get_token(settings.folkeregister_scopes)
            url = f"{self.endpoints['folkeregister']}/personer/{personnummer}"

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                navn = data.get("navn", {})
                return FolkeregisterPerson(
                    personnummer=personnummer,
                    first_name=navn.get("fornavn", ""),
                    last_name=navn.get("etternavn", ""),
                    birth_date=data.get("foedselsdato"),
                )

        except Exception as e:
            logger.warning(f"Folkeregister lookup failed for {personnummer[:6]}***: {e}")
            return None

    def is_configured(self) -> bool:
        return maskinporten.is_configured()

    def get_configuration_status(self) -> dict:
        return {
            "maskinporten": maskinporten.get_configuration_status(),
            "forskudd_endpoint": self.endpoints["forskudd"],
            "folkeregister_enabled": settings.folkeregister_enabled,
        }


# Singleton instance
skatteetaten = SkatteetatenService()


# =============================================================================
# MOCK SERVICE FOR DEVELOPMENT
# =============================================================================

class MockSkatteetatenService:
    """
    Mock service for development/testing when Maskinporten is not configured.

    Returns realistic test data for development purposes.
    """

    # Test tax tables based on income ranges
    TAX_TABLES = {
        "low": {"table": "7100", "percentage": 25.0},
        "medium": {"table": "7100", "percentage": 32.0},
        "high": {"table": "7100", "percentage": 38.0},
    }

    # Mock names for test personnummer
    MOCK_NAMES = {
        "01": "Erik",
        "02": "Kristian",
        "03": "Maria",
        "04": "Sofie",
        "05": "Henrik",
        "06": "Anna",
        "07": "Lars",
        "08": "Ingrid",
        "09": "Magnus",
        "10": "Emma",
        "11": "Ole",
        "12": "Kari",
    }

    MOCK_SURNAMES = [
        "Hansen", "Johansen", "Olsen", "Larsen", "Andersen",
        "Pedersen", "Nilsen", "Kristiansen", "Berg", "Haugen"
    ]

    async def fetch_tax_card(self, personnummer: str, year: Optional[int] = None) -> TaxCard:
        """Return mock tax card data."""
        personnummer = personnummer.replace(" ", "").replace("-", "")

        if len(personnummer) != 11:
            raise SkatteetatenError("Ugyldig fødselsnummer. Må være 11 siffer.")

        # Simulate network delay
        import asyncio
        await asyncio.sleep(0.5)

        # Generate deterministic mock data based on personnummer
        day = personnummer[:2]
        last_digit = int(personnummer[-1])

        first_name = self.MOCK_NAMES.get(day, "Ola")
        last_name = self.MOCK_SURNAMES[last_digit]

        # Determine tax bracket based on personnummer
        bracket = "medium"
        if last_digit < 3:
            bracket = "low"
        elif last_digit > 7:
            bracket = "high"

        tax_info = self.TAX_TABLES[bracket]

        return TaxCard(
            personnummer=personnummer,
            name=f"{first_name} {last_name}",
            tax_card_type="tabelltrekk",
            tax_table=tax_info["table"],
            tax_percentage=tax_info["percentage"],
            tax_municipality="0301",  # Oslo
            fetched_at=datetime.now(),
        )

    async def fetch_person_info(self, personnummer: str) -> Optional[FolkeregisterPerson]:
        """Return mock person info."""
        personnummer = personnummer.replace(" ", "").replace("-", "")

        day = personnummer[:2]
        month = personnummer[2:4]
        year_short = personnummer[4:6]
        last_digit = int(personnummer[-1])

        first_name = self.MOCK_NAMES.get(day, "Ola")
        last_name = self.MOCK_SURNAMES[last_digit]

        # Determine century
        year_int = int(year_short)
        if year_int > 24:
            birth_year = f"19{year_short}"
        else:
            birth_year = f"20{year_short}"

        return FolkeregisterPerson(
            personnummer=personnummer,
            first_name=first_name,
            last_name=last_name,
            birth_date=f"{birth_year}-{month}-{day}",
        )

    def is_configured(self) -> bool:
        return True

    def get_configuration_status(self) -> dict:
        return {
            "mode": "mock",
            "description": "Using mock data for development",
        }


# Singleton mock instance
mock_skatteetaten = MockSkatteetatenService()


def get_skatteetaten_service():
    """
    Get the appropriate Skatteetaten service based on configuration.

    Returns the real service if Maskinporten is configured,
    otherwise returns the mock service for development.
    """
    if skatteetaten.is_configured():
        return skatteetaten
    return mock_skatteetaten
