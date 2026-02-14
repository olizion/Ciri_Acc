"""
Skatteetaten API Service
Handles communication with Norwegian Tax Authority APIs

Documentation: https://skatteetaten.github.io/api-dokumentasjon/
"""

import logging
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

    # Personal info
    personnummer: str
    name: Optional[str] = None  # May not always be returned

    # Tax deduction type
    tax_card_type: str  # "tabelltrekk" or "prosenttrekk"

    # For table-based deduction (tabelltrekk)
    tax_table: Optional[str] = None  # e.g., "7100"
    tax_class: Optional[str] = None  # Skatteklasse

    # For percentage-based deduction (prosenttrekk)
    tax_percentage: Optional[float] = None

    # Additional info
    tax_municipality: Optional[str] = None  # Kommune code
    frikort_amount: Optional[float] = None  # For frikort holders
    frikort_used: Optional[float] = None  # Amount already used

    # Metadata
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "personnummer": "12345678901",
                "name": "Ola Nordmann",
                "tax_card_type": "tabelltrekk",
                "tax_table": "7100",
                "tax_municipality": "0301",
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
    Service for interacting with Skatteetaten (Norwegian Tax Authority) APIs.

    Available APIs:
    - Skattekort API: Fetch employee tax cards
    - A-melding API: Submit monthly payroll reports (separate service)

    Prerequisites:
    1. Register as employer in Enhetsregisteret
    2. Set up Maskinporten integration with required scopes
    3. Apply for API access at skatteetaten.github.io
    """

    # API endpoints
    ENDPOINTS = {
        "test": {
            "skattekort": "https://api-test.sits.no/api/innkreving/skattekort/v1",
            "folkeregister": "https://folkeregisteret-api-konsument.sits.no/folkeregisteret/offentlig-med-hjemmel/api/v1",
        },
        "prod": {
            "skattekort": "https://api.skatteetaten.no/api/innkreving/skattekort/v1",
            "folkeregister": "https://folkeregisteret.api.skatteetaten.no/folkeregisteret/offentlig-med-hjemmel/api/v1",
        },
    }

    def __init__(self):
        self.env = settings.maskinporten_env

    @property
    def endpoints(self) -> dict:
        """Get endpoints for current environment."""
        return self.ENDPOINTS.get(self.env, self.ENDPOINTS["test"])

    async def fetch_tax_card(self, personnummer: str, year: Optional[int] = None) -> TaxCard:
        """
        Fetch tax card (skattekort) for an employee.

        The tax card contains the employee's tax deduction rate/table,
        which is required for calculating correct tax withholding.

        Args:
            personnummer: 11-digit Norwegian personal ID
            year: Tax year (defaults to current year)

        Returns:
            TaxCard object with tax information

        Raises:
            SkatteetatenError: If the API call fails
            MaskinportenError: If authentication fails
        """
        if not maskinporten.is_configured():
            raise SkatteetatenError(
                "Maskinporten is not configured. Cannot fetch tax card.\n"
                "Configure the following in your .env file:\n"
                "  - MASKINPORTEN_CLIENT_ID\n"
                "  - MASKINPORTEN_PRIVATE_KEY_PATH or MASKINPORTEN_PRIVATE_KEY_BASE64\n"
                "  - MASKINPORTEN_ISSUER (your organization number)"
            )

        # Validate personnummer format
        personnummer = personnummer.replace(" ", "").replace("-", "")
        if len(personnummer) != 11 or not personnummer.isdigit():
            raise SkatteetatenError("Ugyldig fødselsnummer. Må være 11 siffer.")

        year = year or datetime.now().year

        # Get access token
        token = await maskinporten.get_token(settings.skatteetaten_scopes)

        # Make API request
        url = f"{self.endpoints['skattekort']}/personer/{personnummer}/skattekort/{year}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )

                if response.status_code == 404:
                    raise SkatteetatenError(
                        f"Fant ikke skattekort for {personnummer[:6]}*****. "
                        "Personen er kanskje ikke skattepliktig i Norge."
                    )

                if response.status_code == 403:
                    raise SkatteetatenError(
                        "Mangler tilgang til Skattekort API. "
                        "Sjekk at du har riktige scopes i Maskinporten."
                    )

                if response.status_code != 200:
                    raise SkatteetatenError(
                        f"Skatteetaten API feil ({response.status_code}): {response.text}"
                    )

                data = response.json()

                # Parse response into TaxCard
                return self._parse_tax_card_response(personnummer, data)

            except httpx.RequestError as e:
                raise SkatteetatenError(f"Nettverksfeil: Kunne ikke koble til Skatteetaten: {e}")

    def _parse_tax_card_response(self, personnummer: str, data: dict) -> TaxCard:
        """Parse the Skatteetaten API response into a TaxCard object."""

        # The actual response structure varies, this is a simplified parser
        # Real implementation needs to handle the full XML/JSON schema

        skattekort = data.get("skattekort", data)
        trekktype = skattekort.get("trekktype", "tabelltrekk")

        tax_card = TaxCard(
            personnummer=personnummer,
            name=skattekort.get("navn"),
            tax_card_type=trekktype,
        )

        if trekktype == "tabelltrekk":
            tax_card.tax_table = skattekort.get("tabellnummer")
            tax_card.tax_class = skattekort.get("skatteklasse")
        else:
            tax_card.tax_percentage = skattekort.get("trekkprosent")

        tax_card.tax_municipality = skattekort.get("skattekommune")

        # Frikort handling
        frikort = skattekort.get("frikort", {})
        if frikort:
            tax_card.frikort_amount = frikort.get("frikortbeloep")
            tax_card.frikort_used = frikort.get("bruktBeloep")

        return tax_card

    async def fetch_person_info(self, personnummer: str) -> Optional[FolkeregisterPerson]:
        """
        Fetch basic person information from Folkeregisteret.

        NOTE: This requires special approval from Skatteetaten.
        Most payroll systems won't have access to this.

        Args:
            personnummer: 11-digit Norwegian personal ID

        Returns:
            FolkeregisterPerson or None if not available
        """
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
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json",
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return None

                data = response.json()

                # Parse response
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
        """Check if the service is properly configured."""
        return maskinporten.is_configured()

    def get_configuration_status(self) -> dict:
        """Get configuration status for debugging."""
        return {
            "maskinporten": maskinporten.get_configuration_status(),
            "skattekort_endpoint": self.endpoints["skattekort"],
            "folkeregister_enabled": settings.folkeregister_enabled,
            "folkeregister_endpoint": self.endpoints["folkeregister"],
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
