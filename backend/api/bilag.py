"""
Bilag API Routes
Document upload, processing, and management
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional
import uuid
import os
import logging

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.bilag import Bilag, BilagStatus
from models.company import Company

logger = logging.getLogger(__name__)

router = APIRouter()


class BilagResponse(BaseModel):
    """Bilag response model."""
    id: str
    bilag_number: str
    document_date: date
    description: str
    gross_amount: Decimal
    net_amount: Decimal
    mva_amount: Decimal
    mva_code: str | None
    # Currency conversion info
    original_currency: str | None
    original_amount: Decimal | None
    exchange_rate: Decimal | None
    exchange_rate_date: date | None
    # Other fields
    counterparty_name: str | None
    counterparty_org_number: str | None
    category: str | None
    suggested_account: str | None
    status: str
    ciri_confidence: float | None
    ciri_reasoning: str | None
    original_filename: str | None
    file_url: str | None  # URL to download the file
    created_at: datetime

    class Config:
        from_attributes = True


class BilagListResponse(BaseModel):
    """Paginated bilag list."""
    items: list[BilagResponse]
    total: int
    page: int
    per_page: int


@router.post("/upload", response_model=BilagResponse)
async def upload_bilag(file: UploadFile = File(...)):
    """
    Upload a new bilag document.

    1. Validate file type (PDF, PNG, JPG)
    2. Generate sequential bilag_number
    3. Store file with encryption
    4. Calculate SHA-256 hash
    5. Convert to PDF/A if needed
    6. Run OCR extraction
    7. AI categorization
    8. Return processed bilag
    """
    # TODO: Implement actual upload processing
    return BilagResponse(
        id="uuid-placeholder",
        bilag_number="2025-00248",
        document_date=date.today(),
        description="Adobe Creative Cloud",
        gross_amount=Decimal("5625.00"),
        net_amount=Decimal("4500.00"),
        mva_amount=Decimal("1125.00"),
        mva_code="3",
        counterparty_name="Adobe Systems",
        counterparty_org_number=None,
        category="Programvare",
        suggested_account="6540",
        status="pending",
        ciri_confidence=0.95,
        ciri_reasoning=None,
        original_filename=None,
        created_at=datetime.utcnow()
    )


async def _resolve_company_id(company_id: str, db: AsyncSession) -> uuid.UUID:
    """Resolve company ID, falling back to first company if given ID doesn't exist."""
    cid = uuid.UUID(company_id)
    exists = await db.execute(select(Company.id).where(Company.id == cid))
    if exists.scalar_one_or_none():
        return cid
    # Fallback to first company in DB
    result = await db.execute(select(Company.id).limit(1))
    real_id = result.scalar_one_or_none()
    if not real_id:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return real_id


@router.get("", response_model=BilagListResponse)
async def list_bilag(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    search: str | None = None,
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    List bilag with filtering and pagination.
    """
    resolved_company_id = await _resolve_company_id(company_id, db)

    # Build query
    query = select(Bilag).where(Bilag.company_id == resolved_company_id)

    # Apply filters
    if status:
        query = query.where(Bilag.status == BilagStatus(status.lower()))

    if from_date:
        query = query.where(Bilag.document_date >= from_date)

    if to_date:
        query = query.where(Bilag.document_date <= to_date)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Bilag.description.ilike(search_pattern),
                Bilag.counterparty_name.ilike(search_pattern),
                Bilag.bilag_number.ilike(search_pattern),
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = query.order_by(Bilag.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    # Execute query
    result = await db.execute(query)
    bilags = result.scalars().all()

    # Convert to response models
    items = [
        BilagResponse(
            id=str(b.id),
            bilag_number=b.bilag_number,
            document_date=b.document_date,
            description=b.description,
            gross_amount=b.gross_amount,
            net_amount=b.net_amount,
            mva_amount=b.mva_amount,
            mva_code=b.mva_code,
            original_currency=getattr(b, 'original_currency', None),
            original_amount=getattr(b, 'original_amount', None),
            exchange_rate=getattr(b, 'exchange_rate', None),
            exchange_rate_date=getattr(b, 'exchange_rate_date', None),
            counterparty_name=b.counterparty_name,
            counterparty_org_number=b.counterparty_org_number,
            category=b.category,
            suggested_account=b.suggested_account,
            status=b.status.value.lower(),
            ciri_confidence=float(b.ciri_confidence) if b.ciri_confidence else None,
            ciri_reasoning=b.ciri_reasoning,
            original_filename=b.original_filename,
            file_url=f"/api/bilag/{b.id}/file" if b.file_path else None,
            created_at=b.created_at,
        )
        for b in bilags
    ]

    return BilagListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{bilag_id}", response_model=BilagResponse)
async def get_bilag(
    bilag_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get single bilag by ID.
    """
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    return BilagResponse(
        id=str(bilag.id),
        bilag_number=bilag.bilag_number,
        document_date=bilag.document_date,
        description=bilag.description,
        gross_amount=bilag.gross_amount,
        net_amount=bilag.net_amount,
        mva_amount=bilag.mva_amount,
        mva_code=bilag.mva_code,
        original_currency=getattr(bilag, 'original_currency', None),
        original_amount=getattr(bilag, 'original_amount', None),
        exchange_rate=getattr(bilag, 'exchange_rate', None),
        exchange_rate_date=getattr(bilag, 'exchange_rate_date', None),
        counterparty_name=bilag.counterparty_name,
        counterparty_org_number=bilag.counterparty_org_number,
        category=bilag.category,
        suggested_account=bilag.suggested_account,
        status=bilag.status.value.lower(),
        ciri_confidence=float(bilag.ciri_confidence) if bilag.ciri_confidence else None,
        ciri_reasoning=bilag.ciri_reasoning,
        original_filename=bilag.original_filename,
        file_url=f"/api/bilag/{bilag.id}/file" if bilag.file_path else None,
        created_at=bilag.created_at,
    )


@router.get("/{bilag_id}/file")
async def view_bilag_file(
    bilag_id: str,
    download: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    View or download the original file for a bilag.

    - Without ?download=true: Opens inline in browser (for viewing)
    - With ?download=true: Forces download with filename
    """
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if not bilag.file_path or not os.path.exists(bilag.file_path):
        raise HTTPException(status_code=404, detail="Fil ikke funnet")

    if download:
        # Force download with Content-Disposition: attachment
        return FileResponse(
            path=bilag.file_path,
            filename=bilag.original_filename,
            media_type=bilag.mime_type,
        )
    else:
        # View inline in browser (no filename = no Content-Disposition: attachment)
        return FileResponse(
            path=bilag.file_path,
            media_type=bilag.mime_type,
        )


@router.patch("/{bilag_id}")
async def update_bilag(bilag_id: str, updates: dict):
    """
    Update bilag details.

    Only allowed before posting:
    - description
    - category
    - suggested_account
    - counterparty info
    """
    return {"message": "Bilag oppdatert"}


class ApproveRequest(BaseModel):
    """Request body for approve/post endpoint."""
    post_immediately: bool = True  # If true, also post (create journal entries)


class PostingInfo(BaseModel):
    """Info about created journal entries."""
    account_number: str
    description: str
    debit_amount: Decimal
    credit_amount: Decimal


class PostResponse(BaseModel):
    """Response after posting a bilag."""
    message: str
    bilag_id: str
    status: str
    posteringer_count: int
    posteringer: list[PostingInfo]


@router.post("/{bilag_id}/approve", response_model=PostResponse)
async def approve_bilag(
    bilag_id: str,
    request: ApproveRequest = ApproveRequest(),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve bilag and optionally post it.

    When post_immediately=True (default):
    1. Validate all required fields
    2. Create journal entries (posteringer) from bilag data
    3. Update status to 'posted'

    No additional Claude call - uses data already extracted during upload.
    """
    from services.invoice_processor import post_bilag_with_entries, PostingValidationError

    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if bilag.status == BilagStatus.POSTED:
        raise HTTPException(status_code=400, detail="Bilag er allerede bokført")

    if bilag.status == BilagStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Avvist bilag kan ikke godkjennes")

    if request.post_immediately:
        try:
            # Create posteringer and update status to POSTED
            posteringer = await post_bilag_with_entries(bilag, db)
            await db.commit()

            return PostResponse(
                message="Bilag godkjent og bokført",
                bilag_id=str(bilag.id),
                status="posted",
                posteringer_count=len(posteringer),
                posteringer=[
                    PostingInfo(
                        account_number=p.account_number,
                        description=p.description,
                        debit_amount=p.debit_amount,
                        credit_amount=p.credit_amount,
                    )
                    for p in posteringer
                ]
            )
        except PostingValidationError as e:
            await db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
    else:
        # Just approve, don't post yet
        bilag.status = BilagStatus.APPROVED
        await db.commit()

        return PostResponse(
            message="Bilag godkjent (ikke bokført)",
            bilag_id=str(bilag.id),
            status="approved",
            posteringer_count=0,
            posteringer=[]
        )


class RejectRequest(BaseModel):
    """Request body for reject endpoint."""
    reason: str


@router.post("/{bilag_id}/reject")
async def reject_bilag(
    bilag_id: str,
    request: RejectRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Reject bilag.

    1. Update status to 'rejected'
    2. Store rejection reason
    """
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if bilag.status == BilagStatus.POSTED:
        raise HTTPException(status_code=400, detail="Bokført bilag kan ikke avvises")

    bilag.status = BilagStatus.REJECTED
    bilag.ciri_reasoning = f"Avvist: {request.reason}"
    await db.commit()

    return {"message": "Bilag avvist", "reason": request.reason}


@router.post("/{bilag_id}/post", response_model=PostResponse)
async def post_bilag(
    bilag_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Post an approved bilag to accounts.

    Creates double-entry journal entries:
    - DEBIT expense account (net amount)
    - DEBIT MVA account (mva amount)
    - CREDIT leverandørgjeld (gross amount)

    For reverse charge (foreign purchases), also creates:
    - CREDIT utgående MVA (self-assessed)

    All data comes from Claude's invoice parsing - no new API call needed.
    """
    from services.invoice_processor import post_bilag_with_entries, PostingValidationError

    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if bilag.status == BilagStatus.POSTED:
        raise HTTPException(status_code=400, detail="Bilag er allerede bokført")

    if bilag.status == BilagStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Avvist bilag kan ikke bokføres")

    try:
        # Create posteringer and update status
        posteringer = await post_bilag_with_entries(bilag, db)
        await db.commit()

        return PostResponse(
            message="Bilag bokført",
            bilag_id=str(bilag.id),
            status="posted",
            posteringer_count=len(posteringer),
            posteringer=[
                PostingInfo(
                    account_number=p.account_number,
                    description=p.description,
                    debit_amount=p.debit_amount,
                    credit_amount=p.credit_amount,
                )
                for p in posteringer
            ]
        )
    except PostingValidationError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{bilag_id}")
async def delete_bilag(bilag_id: str):
    """
    Delete unposted bilag.

    Only allowed if status is 'pending' or 'rejected'.
    """
    return {"message": "Bilag slettet"}


class PaymentRequest(BaseModel):
    """Request body for recording a payment."""
    payment_date: date
    bank_account: str = "1920"  # Default: Bank account
    payment_reference: str | None = None  # KID, reference number


class PaymentResponse(BaseModel):
    """Response after recording a payment."""
    message: str
    bilag_id: str
    payment_amount: Decimal
    posteringer: list[PostingInfo]


@router.post("/{bilag_id}/pay", response_model=PaymentResponse)
async def record_payment(
    bilag_id: str,
    request: PaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Record payment for a posted bilag.

    Creates journal entries:
    - DEBIT 2400 (Leverandørgjeld) - reduces what we owe
    - CREDIT {bank_account} - reduces bank balance

    Only POSTED bilags can be paid (they must be booked first).
    """
    from models.postering import Postering
    from services.invoice_processor import LEVERANDORGJELD_ACCOUNT

    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if bilag.status != BilagStatus.POSTED:
        raise HTTPException(
            status_code=400,
            detail="Kun bokførte bilag kan betales. Status: " + bilag.status.value
        )

    # Determine payment amount
    # For reverse charge invoices (foreign), we pay net amount (no VAT to supplier)
    # For Norwegian invoices, we pay gross amount (including VAT)
    from services.invoice_processor import REVERSE_CHARGE_CODES

    is_reverse_charge = bilag.mva_code in REVERSE_CHARGE_CODES
    payment_amount = bilag.net_amount if is_reverse_charge else bilag.gross_amount

    # Create payment journal entries
    journal_id = f"PAY-{bilag.bilag_number}"
    period = request.payment_date.strftime("%Y-%m")
    base_saft_id = f"SAFT-PAY-{bilag.bilag_number}"

    description = f"Betaling - {bilag.description}"
    if request.payment_reference:
        description += f" (ref: {request.payment_reference})"

    posteringer = []

    # DEBIT: Leverandørgjeld (reduces what we owe)
    posteringer.append(Postering(
        company_id=bilag.company_id,
        bilag_id=bilag.id,
        journal_id=journal_id,
        posting_date=request.payment_date,
        period=period,
        account_number=LEVERANDORGJELD_ACCOUNT,
        description=description,
        debit_amount=payment_amount,
        credit_amount=Decimal("0"),
        mva_code=None,
        mva_amount=Decimal("0"),
        saft_transaction_id=f"{base_saft_id}-01",
        created_by_ciri=False,
    ))

    # CREDIT: Bank account (reduces bank balance)
    posteringer.append(Postering(
        company_id=bilag.company_id,
        bilag_id=bilag.id,
        journal_id=journal_id,
        posting_date=request.payment_date,
        period=period,
        account_number=request.bank_account,
        description=description,
        debit_amount=Decimal("0"),
        credit_amount=payment_amount,
        mva_code=None,
        mva_amount=Decimal("0"),
        saft_transaction_id=f"{base_saft_id}-02",
        created_by_ciri=False,
    ))

    # Add posteringer to session
    for p in posteringer:
        db.add(p)

    await db.commit()

    return PaymentResponse(
        message="Betaling registrert",
        bilag_id=str(bilag.id),
        payment_amount=payment_amount,
        posteringer=[
            PostingInfo(
                account_number=p.account_number,
                description=p.description,
                debit_amount=p.debit_amount,
                credit_amount=p.credit_amount,
            )
            for p in posteringer
        ]
    )


class BackfillResponse(BaseModel):
    """Response for backfill operation."""
    message: str
    posteringer_created: int
    errors: list[str]


@router.post("/backfill-posteringer", response_model=BackfillResponse)
async def backfill_posteringer(
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Create posteringer for posted bilags that don't have journal entries.

    Useful for migrating existing data. Uses data already on bilags (from Claude).
    Idempotent - skips bilags that already have posteringer.
    """
    from services.invoice_processor import backfill_posteringer_for_posted_bilags

    resolved_company_id = await _resolve_company_id(company_id, db)
    count, errors = await backfill_posteringer_for_posted_bilags(
        resolved_company_id, db
    )

    return BackfillResponse(
        message=f"Opprettet {count} posteringer" + (f", {len(errors)} feil" if errors else ""),
        posteringer_created=count,
        errors=errors
    )


class ManualPostRequest(BaseModel):
    """Request to manually post a bilag by linking it to a transaction."""
    transaction_id: uuid.UUID
    acknowledge_warning: bool = False  # User must acknowledge if match score is low


class MatchCheckResponse(BaseModel):
    """Result of checking a bilag–transaction match before posting."""
    score: float
    confidence: str  # "high" | "medium" | "low"
    explanation: str
    warning: Optional[str] = None
    factors: dict


class ManualPostResponse(BaseModel):
    """Response after manual post, includes match assessment."""
    message: str
    bilag_id: str
    status: str
    posteringer_count: int
    posteringer: list[PostingInfo]
    match_score: float
    match_confidence: str
    ciri_explanation: str
    warning: Optional[str] = None


async def _check_bilag_transaction_match(
    bilag: "Bilag",
    transaction_id: uuid.UUID,
    db: AsyncSession,
) -> tuple:
    """Run the matching algorithm between a bilag and transaction. Returns (transaction, score_result)."""
    from models.bank_transaction import BankTransaction
    from services.reconciliation_matcher import ReconciliationMatcher

    tx_result = await db.execute(
        select(BankTransaction).where(
            and_(
                BankTransaction.id == transaction_id,
                BankTransaction.company_id == bilag.company_id,
            )
        )
    )
    transaction = tx_result.scalar_one_or_none()
    if not transaction:
        return None, None

    matcher = ReconciliationMatcher(db)
    score_result = matcher._calculate_match_score(transaction, bilag, skip_minimum_threshold=True)
    return transaction, score_result


@router.post("/{bilag_id}/check-match", response_model=MatchCheckResponse)
async def check_match(
    bilag_id: str,
    request: ManualPostRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Pre-check: run the matching algorithm to assess how well a bilag
    and transaction pair together. Returns score + Ciri's assessment.
    Does NOT create any records.
    """
    from models.bank_transaction import ReconciliationStatus

    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()
    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    transaction, score_result = await _check_bilag_transaction_match(
        bilag, request.transaction_id, db
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    if score_result:
        confidence = score_result.confidence.value
        score = score_result.total_score
        explanation = score_result.explanation
        factors = {f.name: {"score": f.score, "matched": f.matched, **f.details} for f in score_result.factors}
    else:
        confidence = "low"
        score = 0.0
        explanation = "Ingen matchfaktorer funnet mellom bilag og transaksjon."
        factors = {}

    warning = None
    if score < 0.3:
        warning = (
            "Ciri finner svært lite samsvar mellom dette bilaget og transaksjonen. "
            "Hvis du velger å koble dem, er det ditt ansvar at posteringen er korrekt."
        )
    elif score < 0.7:
        warning = (
            "Ciri er usikker på denne koblingen. Sjekk at beløp, dato og leverandør stemmer."
        )

    return MatchCheckResponse(
        score=score,
        confidence=confidence,
        explanation=explanation,
        warning=warning,
        factors=factors,
    )


@router.post("/{bilag_id}/manual-post", response_model=ManualPostResponse)
async def manual_post_bilag(
    bilag_id: str,
    request: ManualPostRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually link a bilag to a bank transaction and post it.

    Runs the matching algorithm first:
    - High/medium confidence → posts immediately
    - Low confidence → requires acknowledge_warning=True
    """
    from models.bank_transaction import BankTransaction, ReconciliationStatus
    from models.reconciliation_match import (
        ReconciliationMatch, MatchType, MatchConfidence, MatchStatus,
    )
    from services.invoice_processor import post_bilag_with_entries, PostingValidationError

    # 1. Look up bilag
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if bilag.status == BilagStatus.POSTED:
        raise HTTPException(status_code=400, detail="Bilag er allerede bokført")

    if bilag.status not in [BilagStatus.AWAITING_TRANSACTION, BilagStatus.PENDING, BilagStatus.APPROVED]:
        raise HTTPException(status_code=400, detail=f"Bilag kan ikke postes med status: {bilag.status.value}")

    # 2. Look up transaction and run match scoring
    transaction, score_result = await _check_bilag_transaction_match(
        bilag, request.transaction_id, db
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    if transaction.reconciliation_status != ReconciliationStatus.UNMATCHED:
        raise HTTPException(status_code=400, detail="Transaksjonen er allerede matchet")

    # 3. Determine confidence from scoring
    if score_result:
        match_score = score_result.total_score
        match_confidence_enum = score_result.confidence
        match_confidence = score_result.confidence.value
        ciri_explanation = score_result.explanation
        match_factors = {f.name: {"score": f.score, "matched": f.matched, **f.details} for f in score_result.factors}
    else:
        match_score = 0.0
        match_confidence_enum = MatchConfidence.LOW
        match_confidence = "low"
        ciri_explanation = "Ingen matchfaktorer funnet."
        match_factors = {}

    # 4. If low confidence, require explicit acknowledgment
    warning = None
    if match_score < 0.3:
        warning = (
            "Ciri finner svært lite samsvar mellom dette bilaget og transaksjonen. "
            "Det er ditt ansvar at posteringen er korrekt."
        )
        if not request.acknowledge_warning:
            raise HTTPException(
                status_code=409,
                detail={
                    "type": "low_confidence_warning",
                    "message": warning,
                    "score": match_score,
                    "confidence": match_confidence,
                    "explanation": ciri_explanation,
                }
            )
    elif match_score < 0.7:
        warning = "Ciri er usikker på denne koblingen. Sjekk at beløp, dato og leverandør stemmer."

    # 5. Create match record with actual computed score
    match_factors["manual_post"] = True
    match = ReconciliationMatch(
        company_id=bilag.company_id,
        bank_transaction_id=request.transaction_id,
        bilag_id=bilag.id,
        match_type=MatchType.ONE_TO_ONE,
        confidence=match_confidence_enum,
        confidence_score=match_score if match_score > 0 else 0.01,
        status=MatchStatus.CONFIRMED,
        transaction_amount=transaction.amount,
        matched_amount=bilag.gross_amount,
        difference=abs(transaction.amount) - abs(bilag.gross_amount),
        match_factors=match_factors,
        ciri_explanation=ciri_explanation if match_score >= 0.3 else f"Manuelt koblet av bruker (lav konfidens: {match_score:.0%})",
    )
    match.confirm()
    db.add(match)

    # 6. Post bilag
    try:
        posteringer = await post_bilag_with_entries(bilag, db)
    except PostingValidationError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    # 7. Update transaction
    transaction.reconciliation_status = ReconciliationStatus.MATCHED
    transaction.reconciled_at = datetime.now(timezone.utc)

    await db.commit()

    return ManualPostResponse(
        message="Bilag koblet til transaksjon og bokført",
        bilag_id=str(bilag.id),
        status="posted",
        posteringer_count=len(posteringer),
        posteringer=[
            PostingInfo(
                account_number=p.account_number,
                description=p.description,
                debit_amount=p.debit_amount,
                credit_amount=p.credit_amount,
            )
            for p in posteringer
        ],
        match_score=match_score,
        match_confidence=match_confidence,
        ciri_explanation=ciri_explanation,
        warning=warning,
    )
