"""
Employee API Endpoints
Handles employee management and payroll operations
"""

import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from services.skatteetaten import (
    get_skatteetaten_service,
    TaxCard,
    SkatteetatenError,
)
from services.maskinporten import maskinporten

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class PersonnummerLookupRequest(BaseModel):
    """Request to lookup employee info by personnummer."""

    personnummer: str = Field(
        ...,
        description="11-digit Norwegian personal ID (fødselsnummer)",
        min_length=11,
        max_length=11,
        pattern=r"^\d{11}$",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "personnummer": "12345678901"
            }
        }


class PersonnummerLookupResponse(BaseModel):
    """Response with employee information from public registries."""

    # Basic info
    personnummer_masked: str  # e.g., "123456 *****"
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    # Tax information
    tax_card_type: str  # "tabelltrekk" or "prosenttrekk"
    tax_table: Optional[str] = None
    tax_percentage: Optional[float] = None
    tax_municipality: Optional[str] = None

    # Frikort
    has_frikort: bool = False
    frikort_amount: Optional[float] = None
    frikort_remaining: Optional[float] = None

    # Metadata
    fetched_at: datetime
    source: str  # "skatteetaten" or "mock"

    class Config:
        json_schema_extra = {
            "example": {
                "personnummer_masked": "150485 *****",
                "name": "Kristian Johansen",
                "tax_card_type": "tabelltrekk",
                "tax_table": "7100",
                "tax_percentage": 32.0,
                "tax_municipality": "0301",
                "has_frikort": False,
                "fetched_at": "2026-02-01T10:00:00Z",
                "source": "skatteetaten",
            }
        }


class EmployeeCreateRequest(BaseModel):
    """Request to create a new employee."""

    personnummer: str = Field(..., min_length=11, max_length=11)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    position: str = Field(..., min_length=1, max_length=200)
    employment_type: str = Field(default="fast")
    monthly_salary: float = Field(..., gt=0)
    start_date: str  # ISO format date
    bank_account: Optional[str] = None

    # Tax info (from lookup)
    tax_table: Optional[str] = None
    tax_percentage: Optional[float] = None


class EmployeeResponse(BaseModel):
    """Employee data response."""

    id: str
    first_name: str
    last_name: str
    full_name: str
    position: str
    email: Optional[str]
    phone: Optional[str]
    employment_type: str
    status: str
    monthly_salary: float
    tax_table: Optional[str]
    tax_percentage: Optional[float]
    net_salary_estimate: float
    employer_cost: float
    vacation_days_remaining: int
    feriepenger_accrued: float
    start_date: str
    created_at: datetime


class ConfigurationStatusResponse(BaseModel):
    """API configuration status."""

    maskinporten_configured: bool
    environment: str
    using_mock: bool
    details: dict


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/config/status", response_model=ConfigurationStatusResponse)
async def get_configuration_status():
    """
    Check the current API configuration status.

    Use this to verify that Maskinporten is properly configured
    before attempting to fetch real data from Skatteetaten.
    """
    service = get_skatteetaten_service()

    return ConfigurationStatusResponse(
        maskinporten_configured=maskinporten.is_configured(),
        environment=maskinporten.env,
        using_mock=not maskinporten.is_configured(),
        details=service.get_configuration_status(),
    )


@router.post("/lookup", response_model=PersonnummerLookupResponse)
async def lookup_personnummer(request: PersonnummerLookupRequest):
    """
    Look up employee information by personnummer.

    This endpoint fetches tax card information from Skatteetaten
    and optionally person info from Folkeregisteret.

    If Maskinporten is not configured, returns mock data for development.

    **Required scopes:** `skatteetaten:skattekort`

    **Process:**
    1. Validates the personnummer format
    2. Authenticates with Maskinporten
    3. Fetches tax card from Skatteetaten
    4. Returns tax deduction info

    **Note:** The personnummer is masked in the response for security.
    """
    service = get_skatteetaten_service()

    try:
        # Fetch tax card
        tax_card = await service.fetch_tax_card(request.personnummer)

        # Try to get person info (may not be available)
        person_info = await service.fetch_person_info(request.personnummer)

        # Determine name
        name = tax_card.name
        first_name = None
        last_name = None

        if person_info:
            first_name = person_info.first_name
            last_name = person_info.last_name
            name = f"{first_name} {last_name}"
        elif tax_card.name:
            # Try to split the name
            parts = tax_card.name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""

        # Mask personnummer for response
        pnr = request.personnummer
        masked = f"{pnr[:6]} *****"

        # Calculate frikort remaining
        frikort_remaining = None
        if tax_card.frikort_amount:
            used = tax_card.frikort_used or 0
            frikort_remaining = tax_card.frikort_amount - used

        return PersonnummerLookupResponse(
            personnummer_masked=masked,
            name=name,
            first_name=first_name,
            last_name=last_name,
            tax_card_type=tax_card.tax_card_type,
            tax_table=tax_card.tax_table,
            tax_percentage=tax_card.tax_percentage,
            tax_municipality=tax_card.tax_municipality,
            has_frikort=tax_card.frikort_amount is not None,
            frikort_amount=tax_card.frikort_amount,
            frikort_remaining=frikort_remaining,
            fetched_at=tax_card.fetched_at,
            source="skatteetaten" if maskinporten.is_configured() else "mock",
        )

    except SkatteetatenError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Kunne ikke hente informasjon: {str(e)}"
        )


@router.post("/", response_model=EmployeeResponse)
async def create_employee(request: EmployeeCreateRequest):
    """
    Create a new employee.

    The employee's tax information should be fetched first using
    the `/lookup` endpoint to get the correct tax table/percentage.

    **Process:**
    1. Validates the request
    2. Creates employee record
    3. Stores tax information
    4. Returns the created employee

    **Note:** In production, this would store to the database.
    Currently returns a mock response.
    """
    # In production, this would:
    # 1. Validate the company_id from the authenticated user
    # 2. Create the employee in the database
    # 3. Store encrypted personnummer and bank account
    # 4. Return the created employee

    # Mock response for now
    salary = request.monthly_salary
    tax_rate = request.tax_percentage or 30.0

    return EmployeeResponse(
        id=str(uuid.uuid4()),
        first_name=request.first_name,
        last_name=request.last_name,
        full_name=f"{request.first_name} {request.last_name}",
        position=request.position,
        email=request.email,
        phone=request.phone,
        employment_type=request.employment_type,
        status="active",
        monthly_salary=salary,
        tax_table=request.tax_table,
        tax_percentage=tax_rate,
        net_salary_estimate=salary * (1 - tax_rate / 100),
        employer_cost=salary * 1.161,  # +14.1% AGA + 2% OTP
        vacation_days_remaining=25,
        feriepenger_accrued=0,
        start_date=request.start_date,
        created_at=datetime.now(),
    )


@router.get("/")
async def list_employees(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List all employees for the current company.

    **Note:** In production, this would fetch from the database
    based on the authenticated user's company.
    """
    # Mock response
    return {
        "employees": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: uuid.UUID):
    """
    Get a specific employee by ID.
    """
    raise HTTPException(status_code=404, detail="Ansatt ikke funnet")


@router.put("/{employee_id}")
async def update_employee(employee_id: uuid.UUID):
    """
    Update an employee's information.
    """
    raise HTTPException(status_code=404, detail="Ansatt ikke funnet")


@router.delete("/{employee_id}")
async def delete_employee(employee_id: uuid.UUID):
    """
    Terminate/delete an employee.

    Note: Employees are soft-deleted (status set to 'terminated')
    to maintain payroll history.
    """
    raise HTTPException(status_code=404, detail="Ansatt ikke funnet")


@router.post("/{employee_id}/refresh-tax-card")
async def refresh_employee_tax_card(employee_id: uuid.UUID):
    """
    Refresh an employee's tax card from Skatteetaten.

    This should be done at the start of each year, or when
    an employee reports changes to their tax situation.
    """
    raise HTTPException(status_code=404, detail="Ansatt ikke funnet")
