"""
A-melding API Routes
Endpoints for generating, previewing, and submitting A-melding payroll reports.
"""

import logging
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.amelding_submission import AMeldingSubmission, AMeldingStatus
from services.amelding_service import (
    AMeldingService,
    AMeldingPayloadBuilder,
    AMeldingError,
    get_amelding_service,
    AMELDING_SCOPE,
    build_inntektsmottaker_from_payslip,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class AMeldingSubmitRequest(BaseModel):
    """Request to submit A-melding for a period."""
    periode: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2026-03"])
    company_id: str
    erstatter_meldings_id: Optional[str] = None


class AMeldingPreviewRequest(BaseModel):
    """Request to preview A-melding payload without submitting."""
    periode: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2026-03"])
    company_id: str


class AMeldingSubmitResponse(BaseModel):
    """Response after successful submission."""
    submission_id: str
    dialog_id: str
    forsendelse_id: str
    meldings_id: str
    status: str
    periode: str
    employee_count: int
    total_gross_salary: float
    total_tax_deduction: float
    total_employer_contributions: float


class AMeldingSubmissionResponse(BaseModel):
    """A-melding submission record for history."""
    id: str
    periode: str
    submission_type: str
    status: str
    employee_count: int
    total_gross_salary: float
    total_tax_deduction: float
    total_employer_contributions: float
    submission_reference: Optional[str] = None
    submitted_at: Optional[str] = None
    created_at: str


class AMeldingConfigResponse(BaseModel):
    """Configuration status for A-melding."""
    is_configured: bool
    scope: str
    endpoint: str
    maskinporten: dict


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/config/status", response_model=AMeldingConfigResponse)
async def get_config_status():
    """Check A-melding configuration status."""
    service = get_amelding_service()
    status = service.get_configuration_status()

    return AMeldingConfigResponse(
        is_configured=service.is_configured(),
        scope=AMELDING_SCOPE,
        endpoint=status.get("amelding_endpoint", ""),
        maskinporten=status.get("maskinporten", {}),
    )


@router.post("/preview")
async def preview_amelding(
    request: AMeldingPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate A-melding payload preview without submitting.
    Returns the JSON payload that would be sent to Skatteetaten.
    """
    from models.employee import Employee, Payslip
    from models.company import Company

    # Fetch company
    result = await db.execute(
        select(Company).where(Company.id == request.company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Selskap ikke funnet")

    year, month = int(request.periode[:4]), int(request.periode[5:7])

    # Fetch payslips
    result = await db.execute(
        select(Payslip)
        .where(Payslip.company_id == request.company_id)
        .where(Payslip.year == year)
        .where(Payslip.month == month)
    )
    payslips = result.scalars().all()

    if not payslips:
        raise HTTPException(
            status_code=404,
            detail=f"Ingen lnnslipper funnet for {request.periode}",
        )

    # Fetch employees
    employee_ids = {p.employee_id for p in payslips}
    result = await db.execute(
        select(Employee).where(Employee.id.in_(employee_ids))
    )
    employees_by_id = {e.id: e for e in result.scalars().all()}

    # Build payload
    builder = AMeldingPayloadBuilder(
        opplysningspliktig_orgnr=company.org_number,
        periode=request.periode,
    )

    total_forskuddstrekk = 0
    total_gross = 0
    total_aga = 0

    for payslip in payslips:
        employee = employees_by_id.get(payslip.employee_id)
        if not employee:
            continue

        data = build_inntektsmottaker_from_payslip(employee, payslip)
        builder.add_inntektsmottaker(
            personnummer=employee.personnummer,
            arbeidsforhold=data["arbeidsforhold"],
            inntekter=data["inntekter"],
            forskuddstrekk=data["forskuddstrekk"],
            identifiserende_informasjon=data["identifiserende_informasjon"],
        )
        total_forskuddstrekk += int(payslip.tax_deduction)
        total_gross += int(payslip.gross_salary)
        total_aga += int(payslip.arbeidsgiveravgift)

    builder.set_arbeidsgiveravgift({
        "loennOgGodtgjoerelse": [{
            "beregningskode": "generpisngsregler",
            "sone": "1",
            "avgiftsgrunnlagBeloep": total_gross,
            "prosentsats": 14.1,
        }],
    })
    builder.set_betalingsinformasjon(
        sum_forskuddstrekk=total_forskuddstrekk,
        sum_arbeidsgiveravgift=total_aga,
    )

    return {
        "payload": builder.build(),
        "summary": {
            "periode": request.periode,
            "opplysningspliktig": company.org_number,
            "employee_count": len(payslips),
            "total_gross": total_gross,
            "total_forskuddstrekk": total_forskuddstrekk,
            "total_arbeidsgiveravgift": total_aga,
            "meldings_id": builder.meldings_id,
        },
    }


@router.post("/submit", response_model=AMeldingSubmitResponse)
async def submit_amelding(
    request: AMeldingSubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit A-melding for a given period.
    Builds payload from payslips, submits to Skatteetaten, and records the result.
    """
    service = get_amelding_service()

    try:
        # Use the high-level method if it's the real service
        if isinstance(service, AMeldingService):
            bekreftelse = await service.submit_from_payslips(
                db=db,
                company_id=request.company_id,
                periode=request.periode,
                erstatter_meldings_id=request.erstatter_meldings_id,
            )
        else:
            # Mock service — build minimal payload and submit
            payload = AMeldingPayloadBuilder(
                opplysningspliktig_orgnr="999888777",
                periode=request.periode,
            ).build()
            bekreftelse = await service.submit(
                payload=payload,
                periode=request.periode,
                opplysningspliktig="999888777",
            )

        # Fetch the submission record
        result = await db.execute(
            select(AMeldingSubmission)
            .where(AMeldingSubmission.submission_reference == bekreftelse.meldings_id)
        )
        submission = result.scalar_one_or_none()

        return AMeldingSubmitResponse(
            submission_id=str(submission.id) if submission else "",
            dialog_id=bekreftelse.dialog_id,
            forsendelse_id=bekreftelse.forsendelse_id,
            meldings_id=bekreftelse.meldings_id,
            status="submitted",
            periode=request.periode,
            employee_count=submission.employee_count if submission else 0,
            total_gross_salary=float(submission.total_gross_salary) if submission else 0,
            total_tax_deduction=float(submission.total_tax_deduction) if submission else 0,
            total_employer_contributions=float(submission.total_employer_contributions) if submission else 0,
        )

    except AMeldingError as e:
        logger.error(f"A-melding submission failed: {e}")
        detail = str(e)
        if e.feil and e.feil.spesifisering:
            detail += " | Feltfeil: " + "; ".join(
                f"{s.sti}: {s.melding}" for s in e.feil.spesifisering
            )
        raise HTTPException(status_code=400, detail=detail)


@router.get("/history", response_model=list[AMeldingSubmissionResponse])
async def get_submission_history(
    company_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get A-melding submission history for a company."""
    result = await db.execute(
        select(AMeldingSubmission)
        .where(AMeldingSubmission.company_id == company_id)
        .order_by(desc(AMeldingSubmission.created_at))
        .limit(limit)
    )
    submissions = result.scalars().all()

    return [
        AMeldingSubmissionResponse(
            id=str(s.id),
            periode=f"{s.period_year}-{s.period_month:02d}",
            submission_type=s.submission_type.value,
            status=s.status.value,
            employee_count=s.employee_count,
            total_gross_salary=float(s.total_gross_salary),
            total_tax_deduction=float(s.total_tax_deduction),
            total_employer_contributions=float(s.total_employer_contributions),
            submission_reference=s.submission_reference,
            submitted_at=s.submitted_at.isoformat() if s.submitted_at else None,
            created_at=s.created_at.isoformat(),
        )
        for s in submissions
    ]


@router.get("/{submission_id}")
async def get_submission_detail(
    submission_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed A-melding submission including payload."""
    result = await db.execute(
        select(AMeldingSubmission).where(AMeldingSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(status_code=404, detail="Innsending ikke funnet")

    return {
        "id": str(submission.id),
        "periode": f"{submission.period_year}-{submission.period_month:02d}",
        "submission_type": submission.submission_type.value,
        "status": submission.status.value,
        "employee_count": submission.employee_count,
        "total_gross_salary": float(submission.total_gross_salary),
        "total_tax_deduction": float(submission.total_tax_deduction),
        "total_employer_contributions": float(submission.total_employer_contributions),
        "submission_reference": submission.submission_reference,
        "altinn_receipt_id": submission.altinn_receipt_id,
        "altinn_receipt_data": submission.altinn_receipt_data,
        "payload_json": submission.payload_json,
        "payload_hash_sha256": submission.payload_hash_sha256,
        "rejection_reason": submission.rejection_reason,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "created_at": submission.created_at.isoformat(),
    }
