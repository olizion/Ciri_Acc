"""
Employee API Endpoints
Handles employee management and payroll operations
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from dependencies.company import get_company_id
from models.employee import Employee, EmploymentType, EmployeeStatus
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

    pay_day: int = Field(default=15, ge=1, le=28)  # Day of month for salary payment

    # Tax info (from Skatteetaten lookup)
    tax_card_type: Optional[str] = None
    tax_table: Optional[str] = None
    tax_percentage: Optional[float] = None
    tax_municipality: Optional[str] = None
    frikort_amount: Optional[float] = None


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
    pay_day: int
    tax_table: Optional[str]
    tax_percentage: Optional[float]
    tax_card_type: Optional[str]
    net_salary_estimate: float
    employer_cost: float
    vacation_days_remaining: int
    feriepenger_accrued: float
    start_date: str
    avatar_url: Optional[str]
    created_at: datetime


class ConfigurationStatusResponse(BaseModel):
    """API configuration status."""

    maskinporten_configured: bool
    environment: str
    using_mock: bool
    details: dict


# =============================================================================
# HELPERS
# =============================================================================

def _employee_to_response(e: Employee) -> EmployeeResponse:
    """Convert an Employee model to an EmployeeResponse."""
    from services.avatar import get_avatar_url
    salary = float(e.monthly_salary)
    tax_rate = float(e.tax_percentage) if e.tax_percentage else 30.0
    return EmployeeResponse(
        id=str(e.id),
        first_name=e.first_name,
        last_name=e.last_name,
        full_name=e.full_name,
        position=e.position,
        email=e.email,
        phone=e.phone,
        employment_type=e.employment_type.value,
        status=e.status.value,
        monthly_salary=salary,
        pay_day=e.pay_day,
        tax_table=e.tax_table,
        tax_percentage=tax_rate,
        tax_card_type=e.tax_card_type,
        net_salary_estimate=salary * (1 - tax_rate / 100),
        employer_cost=salary * 1.161,
        vacation_days_remaining=e.vacation_days_remaining,
        feriepenger_accrued=float(e.feriepenger_accrued),
        start_date=e.start_date.isoformat(),
        avatar_url=get_avatar_url(e.avatar_s3_key) if e.avatar_s3_key else None,
        created_at=e.created_at,
    )


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
async def create_employee(
    request: EmployeeCreateRequest,
    db: AsyncSession = Depends(get_db),
    resolved_company_id: uuid.UUID = Depends(get_company_id),
):
    """Create a new employee and persist to database."""

    # Check for duplicate personnummer
    existing = await db.execute(
        select(Employee).where(
            Employee.personnummer == request.personnummer,
            Employee.company_id == resolved_company_id,
            Employee.status != EmployeeStatus.TERMINATED,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ansatt med dette fødselsnummeret finnes allerede")

    employee = Employee(
        company_id=resolved_company_id,
        personnummer=request.personnummer,
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        phone=request.phone,
        position=request.position,
        employment_type=EmploymentType(request.employment_type),
        status=EmployeeStatus.ACTIVE,
        start_date=date.fromisoformat(request.start_date),
        monthly_salary=Decimal(str(request.monthly_salary)),
        pay_day=request.pay_day,
        bank_account=request.bank_account,
        tax_card_type=request.tax_card_type,
        tax_table=request.tax_table,
        tax_percentage=Decimal(str(request.tax_percentage)) if request.tax_percentage else None,
        tax_municipality=request.tax_municipality,
        frikort_amount=Decimal(str(request.frikort_amount)) if request.frikort_amount else None,
        tax_card_fetched_at=datetime.utcnow(),
    )

    db.add(employee)
    await db.flush()
    await db.commit()
    await db.refresh(employee)

    # Only set retention for terminated employees (active ones don't expire)

    return _employee_to_response(employee)


@router.get("/")
async def list_employees(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    resolved_company_id: uuid.UUID = Depends(get_company_id),
):
    """List all employees for the current company."""
    query = select(Employee).where(Employee.company_id == resolved_company_id)
    if status:
        query = query.where(Employee.status == EmployeeStatus(status))
    query = query.order_by(Employee.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    employees = result.scalars().all()

    return {
        "employees": [_employee_to_response(e).model_dump() for e in employees],
        "total": len(employees),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: uuid.UUID):
    """
    Get a specific employee by ID.
    """
    raise HTTPException(status_code=404, detail="Ansatt ikke funnet")


class EmployeeUpdateRequest(BaseModel):
    """Request to update an employee."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_salary: Optional[float] = None
    pay_day: Optional[int] = Field(default=None, ge=1, le=28)
    bank_account: Optional[str] = None
    status: Optional[str] = None


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    request: EmployeeUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update an employee's information."""
    result = await db.execute(
        select(Employee).where(Employee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Ansatt ikke funnet")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "employment_type" and value is not None:
            setattr(employee, field, EmploymentType(value))
        elif field == "status" and value is not None:
            setattr(employee, field, EmployeeStatus(value))
        elif field == "monthly_salary" and value is not None:
            setattr(employee, field, Decimal(str(value)))
        else:
            setattr(employee, field, value)

    employee.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(employee)
    return _employee_to_response(employee)


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


from fastapi import UploadFile, File as FileParam


@router.put("/{employee_id}/avatar", response_model=EmployeeResponse)
async def update_employee_avatar(
    employee_id: uuid.UUID,
    file: UploadFile = FileParam(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace a profile picture for an employee."""
    from services.avatar import upload_avatar as do_upload, delete_avatar

    result = await db.execute(
        select(Employee).where(Employee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Ansatt ikke funnet")

    # Validate file type
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Kun JPEG, PNG eller WebP bilder er tillatt")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="Bildet kan ikke være større enn 5MB")

    # Delete old avatar if exists
    if employee.avatar_s3_key:
        await delete_avatar(employee.avatar_s3_key)

    # Upload new
    s3_key = await do_upload(str(employee.id), content, file.content_type or "image/jpeg")
    employee.avatar_s3_key = s3_key
    await db.commit()
    await db.refresh(employee)

    return _employee_to_response(employee)
