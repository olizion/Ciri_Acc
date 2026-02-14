"""
Company API Routes
Company lookup, setup, and management
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()


class CompanyLookupResponse(BaseModel):
    """Company data from Brønnøysund."""
    org_number: str
    name: str
    address: dict
    industry: dict
    registered_date: str
    employees: int | None
    revenue_range: str | None


class CompanyResponse(BaseModel):
    """Full company response."""
    id: str
    org_number: str
    name: str
    address: dict | None
    industry: dict | None
    mva_registered: bool
    mva_period: str
    autonomy_level: str
    settings: dict


@router.get("/lookup/{org_number}", response_model=CompanyLookupResponse)
async def lookup_company(org_number: str):
    """
    Look up company from Brønnøysund Enhetsregisteret.

    Uses the public API: https://data.brreg.no/enhetsregisteret/api
    """
    # TODO: Implement actual Brønnøysund API call
    # Example response
    return CompanyLookupResponse(
        org_number=org_number,
        name="Eksempel AS",
        address={
            "street": "Gateveien 1",
            "postal_code": "0123",
            "city": "Oslo"
        },
        industry={
            "code": "62.020",
            "description": "Konsulentvirksomhet innen datateknikk"
        },
        registered_date="2020-01-15",
        employees=5,
        revenue_range="1-5M NOK"
    )


@router.get("/me", response_model=CompanyResponse)
async def get_current_company():
    """
    Get current user's company details.
    """
    # TODO: Get from authenticated user context
    return CompanyResponse(
        id="uuid-placeholder",
        org_number="123456789",
        name="Mitt Konsulentselskap AS",
        address={
            "street": "Gateveien 1",
            "postal_code": "0123",
            "city": "Oslo"
        },
        industry={
            "code": "62.020",
            "description": "Konsulentvirksomhet innen datateknikk"
        },
        mva_registered=True,
        mva_period="bi_monthly",
        autonomy_level="assistant",
        settings={
            "email_integration": True,
            "bilag_email": "bilag-abc123@ciri.no"
        }
    )


@router.patch("/me")
async def update_company(updates: dict):
    """
    Update company settings.

    Allowed updates:
    - autonomy_level
    - mva_period
    - email_integration settings
    """
    # TODO: Implement company update
    return {"message": "Innstillinger oppdatert"}


@router.post("/setup")
async def setup_company(org_number: str, autonomy_level: str = "assistant"):
    """
    Complete company setup after registration.

    1. Fetch data from Brønnøysund
    2. Create initial kontoplan (NS 4102)
    3. Set up bilag email forwarding
    4. Configure autonomy level
    """
    return {
        "message": "Selskap konfigurert",
        "bilag_email": f"bilag-{org_number}@ciri.no"
    }
