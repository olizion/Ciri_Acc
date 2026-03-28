"""
MVA (VAT) Reporting API Routes
Endpoints for generating, validating, previewing, and submitting MVA returns.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.mva_submission import MVASubmission, MVASubmissionStatus
from services.mva_service import (
    MVAService,
    MVAServiceError,
    get_mva_service,
    MVA_SCOPE,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class MVAConfigResponse(BaseModel):
    """Configuration status for MVA reporting."""
    is_configured: bool
    scope: str
    altinn_endpoint: str
    validation_endpoint: str
    maskinporten: dict


class MVASubmitRequest(BaseModel):
    """Request to submit MVA return."""
    company_id: str
    period_year: int
    period_description: str = Field(
        ..., examples=["januar-februar", "mars-april", "januar-mars", "aarlig"]
    )
    meldingskategori: str = Field(default="alminnelig", examples=[
        "alminnelig", "primaernaering", "kompensasjon", "omvendtAvgiftsplikt", "eHandel"
    ])


class MVAPreviewRequest(BaseModel):
    """Request to preview MVA melding without submitting."""
    company_id: str
    period_year: int
    period_description: str = Field(
        ..., examples=["januar-februar", "mars-april"]
    )
    meldingskategori: str = "alminnelig"


class MVAValidateRequest(BaseModel):
    """Request to validate MVA melding XML."""
    melding_xml: str


class MVASubmitResponse(BaseModel):
    """Response after successful submission."""
    submission_id: str
    instance_id: str
    status: str
    period_year: int
    period_description: str
    utgaaende_mva: float
    inngaaende_mva: float
    fastsatt_merverdiavgift: float
    is_accepted: bool


class MVASubmissionResponse(BaseModel):
    """MVA submission record for history."""
    id: str
    period_year: int
    period_description: str
    meldingskategori: str
    submission_type: str
    status: str
    utgaaende_mva: float
    inngaaende_mva: float
    fastsatt_merverdiavgift: float
    altinn_instance_id: Optional[str] = None
    submitted_at: Optional[str] = None
    created_at: str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/config/status", response_model=MVAConfigResponse)
async def get_config_status():
    """Check MVA reporting configuration status."""
    service = get_mva_service()
    status = service.get_configuration_status()

    return MVAConfigResponse(
        is_configured=service.is_configured(),
        scope=MVA_SCOPE,
        altinn_endpoint=status.get("altinn_instance_endpoint", ""),
        validation_endpoint=status.get("validation_endpoint", ""),
        maskinporten=status.get("maskinporten", {}),
    )


@router.post("/validate")
async def validate_melding(request: MVAValidateRequest):
    """
    Validate MVA melding XML against Skatteetaten's validation API.
    Returns validation status and any errors found.
    """
    service = get_mva_service()

    try:
        result = await service.validate(request.melding_xml)
        return {
            "status": result.status,
            "is_valid": result.status == "GYLDIG",
            "errors": result.errors,
            "error_count": len(result.errors),
        }
    except MVAServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/preview")
async def preview_mva(
    request: MVAPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate MVA melding preview without submitting.
    Returns the XML payloads and summary data.
    """
    from models.company import Company
    from models.bilag import Bilag
    from services.mva_xml_builder import (
        MvaMeldingXmlBuilder,
        MvaMeldingInnsendingXmlBuilder,
        MvaSpesifikasjonslinje,
    )
    from services.mva_service import _period_to_months, _aggregate_mva

    # Fetch company
    result = await db.execute(
        select(Company).where(Company.id == request.company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Selskap ikke funnet")

    if not company.mva_registered:
        raise HTTPException(status_code=400, detail="Selskapet er ikke MVA-registrert")

    month_range = _period_to_months(request.period_description)

    # Fetch bilag with MVA data
    from sqlalchemy import and_
    result = await db.execute(
        select(Bilag).where(
            and_(
                Bilag.company_id == request.company_id,
                Bilag.mva_amount != None,  # noqa: E711
                Bilag.mva_amount != 0,
            )
        )
    )
    bilag_list = result.scalars().all()

    # Filter to period
    period_bilag = [
        b for b in bilag_list
        if b.date and b.date.year == request.period_year
        and b.date.month in month_range
    ]

    # Aggregate
    mva_aggregated = _aggregate_mva(period_bilag)

    # Build XML
    melding_builder = MvaMeldingXmlBuilder(
        organisasjonsnummer=company.org_number,
        meldingskategori=request.meldingskategori,
        periode=request.period_description,
        aar=request.period_year,
    )

    total_utgaaende = Decimal(0)
    total_inngaaende = Decimal(0)
    linjer = []

    from services.mva_xml_builder import MVA_CODES
    for kode, amounts in mva_aggregated.items():
        linje = MvaSpesifikasjonslinje(
            mva_kode=kode,
            merverdiavgift=amounts["mva"],
            grunnlag=amounts.get("grunnlag"),
            sats=amounts.get("sats"),
        )
        melding_builder.add_linje(linje)
        linjer.append(linje.to_dict())

        code_info = MVA_CODES.get(kode, {})
        direction = code_info.get("direction", "")
        if direction in ("utgaaende", "begge"):
            total_utgaaende += amounts["mva"]
        if direction in ("inngaaende", "begge"):
            total_inngaaende += amounts["mva"]

    melding_xml = melding_builder.build_xml()
    fastsatt = melding_builder.compute_fastsatt_merverdiavgift()

    # Build innsending XML
    innsending_builder = MvaMeldingInnsendingXmlBuilder(
        organisasjonsnummer=company.org_number,
        meldingskategori=request.meldingskategori,
        periode=request.period_description,
        aar=request.period_year,
    )
    innsending_builder.add_melding_vedlegg()
    innsending_xml = innsending_builder.build_xml()

    return {
        "melding_xml": melding_xml,
        "innsending_xml": innsending_xml,
        "summary": {
            "period_year": request.period_year,
            "period_description": request.period_description,
            "meldingskategori": request.meldingskategori,
            "organisasjonsnummer": company.org_number,
            "bilag_count": len(period_bilag),
            "utgaaende_mva": float(total_utgaaende),
            "inngaaende_mva": float(total_inngaaende),
            "fastsatt_merverdiavgift": float(fastsatt),
            "spesifikasjonslinjer": linjer,
        },
    }


@router.post("/submit", response_model=MVASubmitResponse)
async def submit_mva(
    request: MVASubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit MVA return for a given period.
    Aggregates bilag data, builds XML, validates, and submits via Altinn3.
    """
    service = get_mva_service()

    try:
        if isinstance(service, MVAService):
            flow_result = await service.submit_from_database(
                db=db,
                company_id=request.company_id,
                period_year=request.period_year,
                period_description=request.period_description,
                meldingskategori=request.meldingskategori,
            )
        else:
            # Mock service
            flow_result = await service.submit_full_flow()

        # Fetch the submission record
        result = await db.execute(
            select(MVASubmission)
            .where(MVASubmission.company_id == request.company_id)
            .where(MVASubmission.period_year == request.period_year)
            .where(MVASubmission.period_description == request.period_description)
            .order_by(desc(MVASubmission.created_at))
            .limit(1)
        )
        submission = result.scalar_one_or_none()

        feedback = flow_result.get("feedback")
        is_accepted = feedback.is_accepted if feedback else False

        return MVASubmitResponse(
            submission_id=str(submission.id) if submission else "",
            instance_id=flow_result.get("instance_id", ""),
            status="accepted" if is_accepted else "submitted",
            period_year=request.period_year,
            period_description=request.period_description,
            utgaaende_mva=float(submission.utgaaende_mva) if submission else 0,
            inngaaende_mva=float(submission.inngaaende_mva) if submission else 0,
            fastsatt_merverdiavgift=float(submission.fastsatt_merverdiavgift) if submission else 0,
            is_accepted=is_accepted,
        )

    except MVAServiceError as e:
        logger.error(f"MVA submission failed at step '{e.step}': {e}")
        detail = str(e)
        if e.details:
            detail += f" | Detaljer: {e.details}"
        raise HTTPException(status_code=400, detail=detail)


@router.get("/history", response_model=list[MVASubmissionResponse])
async def get_submission_history(
    company_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get MVA submission history for a company."""
    result = await db.execute(
        select(MVASubmission)
        .where(MVASubmission.company_id == company_id)
        .order_by(desc(MVASubmission.created_at))
        .limit(limit)
    )
    submissions = result.scalars().all()

    return [
        MVASubmissionResponse(
            id=str(s.id),
            period_year=s.period_year,
            period_description=s.period_description,
            meldingskategori=s.meldingskategori.value,
            submission_type=s.submission_type.value,
            status=s.status.value,
            utgaaende_mva=float(s.utgaaende_mva),
            inngaaende_mva=float(s.inngaaende_mva),
            fastsatt_merverdiavgift=float(s.fastsatt_merverdiavgift),
            altinn_instance_id=s.altinn_instance_id,
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
    """Get detailed MVA submission including XML payloads."""
    result = await db.execute(
        select(MVASubmission).where(MVASubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(status_code=404, detail="MVA-innsending ikke funnet")

    return {
        "id": str(submission.id),
        "period_year": submission.period_year,
        "period_description": submission.period_description,
        "meldingskategori": submission.meldingskategori.value,
        "submission_type": submission.submission_type.value,
        "status": submission.status.value,
        "utgaaende_mva": float(submission.utgaaende_mva),
        "inngaaende_mva": float(submission.inngaaende_mva),
        "fastsatt_merverdiavgift": float(submission.fastsatt_merverdiavgift),
        "spesifikasjonslinjer": submission.spesifikasjonslinjer,
        "melding_xml": submission.melding_xml,
        "innsending_xml": submission.innsending_xml,
        "payload_hash_sha256": submission.payload_hash_sha256,
        "altinn_instance_id": submission.altinn_instance_id,
        "altinn_instance_url": submission.altinn_instance_url,
        "validation_result": submission.validation_result,
        "feedback_data": submission.feedback_data,
        "kid_number": submission.kid_number,
        "rejection_reason": submission.rejection_reason,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "created_at": submission.created_at.isoformat(),
    }


@router.get("/codes/mva")
async def get_mva_codes():
    """Get all valid MVA codes with descriptions and rates."""
    from services.mva_xml_builder import MVA_CODES
    return {
        "codes": [
            {
                "kode": kode,
                "beskrivelse": info["desc"],
                "sats": info["rate"],
                "retning": info["direction"],
            }
            for kode, info in sorted(MVA_CODES.items())
        ]
    }
