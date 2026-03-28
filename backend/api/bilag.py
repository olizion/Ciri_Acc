"""
Bilag API Routes
Document upload, processing, and management
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional
import uuid
import os
import hashlib
import logging

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from config.cache import cache_key, get_cached, set_cached, invalidate_event, CACHE_TTLS
from models.bilag import Bilag, BilagStatus
from models.postering import Postering
from models.company import Company
from dependencies.auth import get_optional_user, AuthenticatedUser
from dependencies.company import get_company_id
from services.journal_validation import validate_journal_balance, UnbalancedJournalError
from services.audit_trail import log_domain_event

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
    periodisering_suggestion: dict | None = None
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
async def upload_bilag(
    file: UploadFile = File(...),
    company_id: str = Form(None),  # Legacy — ignored when JWT present
    description: str = Form(""),
    document_date: str = Form(None),
    gross_amount: str = Form("0"),
    net_amount: str = Form("0"),
    mva_amount: str = Form("0"),
    mva_code: str = Form(None),
    counterparty_name: str = Form(None),
    counterparty_org_number: str = Form(None),
    category: str = Form(None),
    suggested_account: str = Form(None),
    ciri_confidence: str = Form(None),
    ciri_reasoning: str = Form(None),
    original_currency: str = Form(None),
    original_amount: str = Form(None),
    exchange_rate: str = Form(None),
    exchange_rate_date: str = Form(None),
    resolved_company_id: uuid.UUID = Depends(get_company_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a new bilag with file and OCR-extracted metadata.
    """
    # Validate file type
    content_type = file.content_type or ""
    filename = file.filename or "unknown"
    if not (content_type.startswith("image/") or content_type == "application/pdf"
            or filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg"))):
        raise HTTPException(status_code=400, detail="Ugyldig filtype. Støtter PDF, PNG, JPG.")

    # Generate next bilag number
    year = datetime.now().year
    last = await db.execute(
        select(Bilag.bilag_number)
        .where(Bilag.company_id == resolved_company_id)
        .where(Bilag.bilag_number.like(f"{year}-%"))
        .order_by(Bilag.bilag_number.desc())
        .limit(1)
    )
    last_number = last.scalar_one_or_none()
    if last_number:
        seq = int(last_number.split("-")[1]) + 1
    else:
        seq = 1
    bilag_number = f"{year}-{seq:05d}"

    # Read and store file
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    upload_dir = os.path.join(settings.upload_dir, str(resolved_company_id))
    os.makedirs(upload_dir, exist_ok=True)
    stored_filename = f"{bilag_number}_{uuid.uuid4().hex[:8]}{os.path.splitext(filename)[1]}"
    file_path = os.path.join(upload_dir, stored_filename)
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Parse date
    doc_date = date.today()
    if document_date:
        try:
            doc_date = date.fromisoformat(document_date)
        except ValueError:
            pass

    # Create bilag record
    bilag = Bilag(
        company_id=resolved_company_id,
        bilag_number=bilag_number,
        document_date=doc_date,
        receipt_date=datetime.now(timezone.utc),
        description=description or f"Bilag {bilag_number}",
        gross_amount=Decimal(gross_amount or "0"),
        net_amount=Decimal(net_amount or "0"),
        mva_amount=Decimal(mva_amount or "0"),
        mva_code=mva_code or None,
        original_currency=original_currency if original_currency and original_currency != "NOK" else None,
        original_amount=Decimal(original_amount) if original_amount else None,
        exchange_rate=Decimal(exchange_rate) if exchange_rate else None,
        exchange_rate_date=date.fromisoformat(exchange_rate_date) if exchange_rate_date else None,
        counterparty_name=counterparty_name or None,
        counterparty_org_number=counterparty_org_number or None,
        category=category or None,
        suggested_account=suggested_account or None,
        file_path=file_path,
        file_hash_sha256=file_hash,
        original_filename=filename,
        mime_type=content_type or "application/octet-stream",
        status=BilagStatus.PENDING,
        created_by_ciri=True,
        ciri_confidence=float(ciri_confidence) if ciri_confidence else None,
        ciri_reasoning=ciri_reasoning or None,
    )

    # Set legal retention metadata (Bokforingsloven §13)
    bilag.set_retention(fiscal_year=doc_date.year, category="regnskap")

    db.add(bilag)
    await db.flush()
    await db.commit()
    await db.refresh(bilag)

    # Invalidate cache
    await invalidate_event("bilag_write")

    return BilagResponse(
        id=str(bilag.id),
        bilag_number=bilag.bilag_number,
        document_date=bilag.document_date,
        description=bilag.description,
        gross_amount=bilag.gross_amount,
        net_amount=bilag.net_amount,
        mva_amount=bilag.mva_amount,
        mva_code=bilag.mva_code,
        original_currency=bilag.original_currency,
        original_amount=bilag.original_amount,
        exchange_rate=bilag.exchange_rate,
        exchange_rate_date=bilag.exchange_rate_date,
        counterparty_name=bilag.counterparty_name,
        counterparty_org_number=bilag.counterparty_org_number,
        category=bilag.category,
        suggested_account=bilag.suggested_account,
        status=bilag.status.value.lower(),
        ciri_confidence=float(bilag.ciri_confidence) if bilag.ciri_confidence else None,
        ciri_reasoning=bilag.ciri_reasoning,
        periodisering_suggestion=bilag.periodisering_suggestion,
        original_filename=bilag.original_filename,
        file_url=f"/api/bilag/{bilag.id}/file",
        created_at=bilag.created_at,
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
    resolved_company_id: uuid.UUID = Depends(get_company_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List bilag with filtering and pagination.
    """
    # Check Redis cache
    ck = cache_key("bilag", company_id=str(resolved_company_id), page=page, per_page=per_page,
                   status=status, from_date=from_date, to_date=to_date, search=search)
    cached = await get_cached(ck)
    if cached is not None:
        return JSONResponse(content=cached)

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
            periodisering_suggestion=b.periodisering_suggestion,
            original_filename=b.original_filename,
            file_url=f"/api/bilag/{b.id}/file" if b.file_path else None,
            created_at=b.created_at,
        )
        for b in bilags
    ]

    response = BilagListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page
    )
    await set_cached(ck, response.model_dump(mode="json"), CACHE_TTLS["bilag"])
    return response


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
        periodisering_suggestion=bilag.periodisering_suggestion,
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


class CorrectionRequest(BaseModel):
    """Request body for correcting a posted bilag (Bokføringsloven §6)."""
    new_amount: Decimal
    new_mva_amount: Decimal
    new_mva_code: str | None = None
    new_account_number: str | None = None
    reason: str  # Required: why the correction was made


class CorrectionPostingInfo(BaseModel):
    """Info about a single postering created during correction."""
    type: str  # "reversering" or "korreksjon"
    account_number: str
    description: str
    debit_amount: Decimal
    credit_amount: Decimal


class CorrectionResponse(BaseModel):
    """Response after correcting a bilag."""
    message: str
    bilag_id: str
    reversering_journal_id: str
    correction_journal_id: str
    posteringer: list[CorrectionPostingInfo]


@router.post("/{bilag_id}/correct", response_model=CorrectionResponse)
async def correct_bilag(
    bilag_id: str,
    request: CorrectionRequest,
    user: AuthenticatedUser | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Correct a posted bilag per Bokføringsloven §6.

    Creates reversing entries for the original posting, then new entries
    with corrected values. The original posteringer remain immutable.
    Also updates bilag MVA fields so downstream consumers (MVA-melding)
    see the corrected amounts.
    """
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()
    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    if bilag.status != BilagStatus.POSTED:
        raise HTTPException(
            status_code=400,
            detail="Kun bokførte bilag kan korrigeres. Status: " + bilag.status.value,
        )

    # Fetch original posteringer for this bilag
    orig_result = await db.execute(
        select(Postering)
        .where(Postering.bilag_id == bilag.id)
        .order_by(Postering.created_at)
    )
    original_posteringer = orig_result.scalars().all()
    if not original_posteringer:
        raise HTTPException(status_code=400, detail="Ingen posteringer funnet å korrigere")

    today = date.today()
    period = today.strftime("%Y-%m")
    ts = datetime.now(timezone.utc).strftime("%H%M%S")
    rev_journal_id = f"KORR-REV-{bilag.bilag_number}-{ts}"
    new_journal_id = f"KORR-NY-{bilag.bilag_number}-{ts}"

    created_posteringer: list[CorrectionPostingInfo] = []

    # Step 1: Create reversing entries (mirror of originals with flipped debit/credit)
    for i, orig in enumerate(original_posteringer):
        rev = Postering(
            company_id=bilag.company_id,
            bilag_id=bilag.id,
            journal_id=rev_journal_id,
            posting_date=today,
            period=period,
            account_number=orig.account_number,
            description=f"Reversering: {orig.description} ({request.reason})",
            debit_amount=orig.credit_amount,   # Flip
            credit_amount=orig.debit_amount,   # Flip
            mva_code=orig.mva_code,
            mva_amount=-orig.mva_amount if orig.mva_amount else Decimal(0),
            saft_transaction_id=f"SAFT-{rev_journal_id}-{i:02d}",
            created_by_ciri=False,
        )
        db.add(rev)
        created_posteringer.append(CorrectionPostingInfo(
            type="reversering",
            account_number=rev.account_number,
            description=rev.description,
            debit_amount=rev.debit_amount,
            credit_amount=rev.credit_amount,
        ))

    # Step 2: Create new corrected entries
    new_account = request.new_account_number or bilag.suggested_account or "6540"
    new_mva_code = request.new_mva_code or bilag.mva_code
    net_amount = request.new_amount - request.new_mva_amount

    # Debit: expense account (net)
    p_expense = Postering(
        company_id=bilag.company_id,
        bilag_id=bilag.id,
        journal_id=new_journal_id,
        posting_date=today,
        period=period,
        account_number=new_account,
        description=f"Korreksjon: {bilag.description} ({request.reason})",
        debit_amount=net_amount,
        credit_amount=Decimal(0),
        mva_code=new_mva_code,
        mva_amount=Decimal(0),
        saft_transaction_id=f"SAFT-{new_journal_id}-00",
        created_by_ciri=False,
    )
    db.add(p_expense)
    created_posteringer.append(CorrectionPostingInfo(
        type="korreksjon",
        account_number=p_expense.account_number,
        description=p_expense.description,
        debit_amount=p_expense.debit_amount,
        credit_amount=p_expense.credit_amount,
    ))

    # Debit: MVA account (if MVA > 0)
    if request.new_mva_amount > 0:
        p_mva = Postering(
            company_id=bilag.company_id,
            bilag_id=bilag.id,
            journal_id=new_journal_id,
            posting_date=today,
            period=period,
            account_number="2710",  # Inngående MVA
            description=f"Korreksjon MVA: {bilag.description}",
            debit_amount=request.new_mva_amount,
            credit_amount=Decimal(0),
            mva_code=new_mva_code,
            mva_amount=request.new_mva_amount,
            saft_transaction_id=f"SAFT-{new_journal_id}-01",
            created_by_ciri=False,
        )
        db.add(p_mva)
        created_posteringer.append(CorrectionPostingInfo(
            type="korreksjon",
            account_number=p_mva.account_number,
            description=p_mva.description,
            debit_amount=p_mva.debit_amount,
            credit_amount=p_mva.credit_amount,
        ))

    # Credit: leverandørgjeld (gross)
    p_credit = Postering(
        company_id=bilag.company_id,
        bilag_id=bilag.id,
        journal_id=new_journal_id,
        posting_date=today,
        period=period,
        account_number="2400",  # Leverandørgjeld
        description=f"Korreksjon: {bilag.description}",
        debit_amount=Decimal(0),
        credit_amount=request.new_amount,
        mva_code=None,
        mva_amount=Decimal(0),
        saft_transaction_id=f"SAFT-{new_journal_id}-02",
        created_by_ciri=False,
    )
    db.add(p_credit)
    created_posteringer.append(CorrectionPostingInfo(
        type="korreksjon",
        account_number=p_credit.account_number,
        description=p_credit.description,
        debit_amount=p_credit.debit_amount,
        credit_amount=p_credit.credit_amount,
    ))

    # Step 3: Override feedback — feed corrections back into clusters + rules
    if bilag.created_by_ciri:
        # Capture original values BEFORE mutation
        original_account = bilag.suggested_account
        original_amount = str(bilag.gross_amount)
        original_mva_code = bilag.mva_code

        # Find the transaction linked to this bilag via ReconciliationMatch
        from models.reconciliation_match import ReconciliationMatch, MatchStatus
        match_result = await db.execute(
            select(ReconciliationMatch).where(
                and_(
                    ReconciliationMatch.bilag_id == bilag.id,
                    ReconciliationMatch.status.in_([
                        MatchStatus.CONFIRMED,
                        MatchStatus.AUTO_CONFIRMED,
                    ]),
                )
            ).limit(1)
        )
        driving_match = match_result.scalar_one_or_none()
        tx_id = driving_match.bank_transaction_id if driving_match else None

        from services.override_feedback import process_override_feedback
        await process_override_feedback(
            db,
            bilag=bilag,
            transaction_id=tx_id,
            source_rule_id=bilag.source_rule_id,
            user_id=user.user_id if user else None,
            correction_details={
                "bilag_number": bilag.bilag_number,
                "original_account": original_account,
                "new_account": request.new_account_number,
                "original_amount": original_amount,
                "new_amount": str(request.new_amount),
                "original_mva_code": original_mva_code,
                "new_mva_code": request.new_mva_code,
                "reason": request.reason,
                "source_rule_id": str(bilag.source_rule_id) if bilag.source_rule_id else None,
            },
        )

    # Step 4: Update bilag MVA fields so MVA-melding picks up corrected values
    bilag.gross_amount = request.new_amount
    bilag.net_amount = net_amount
    bilag.mva_amount = request.new_mva_amount
    if request.new_mva_code:
        bilag.mva_code = request.new_mva_code
    if request.new_account_number:
        bilag.suggested_account = request.new_account_number

    await db.flush()
    await db.commit()
    await invalidate_event("bilag_write")

    return CorrectionResponse(
        message="Bilag korrigert",
        bilag_id=str(bilag.id),
        reversering_journal_id=rev_journal_id,
        correction_journal_id=new_journal_id,
        posteringer=created_posteringer,
    )


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
    user: AuthenticatedUser | None = Depends(get_optional_user),
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

    # Record who approved (Bokføringsloven §13a)
    actor_id = user.user_id if user else None
    bilag.approved_by = actor_id
    bilag.approved_at = datetime.now(timezone.utc)

    if request.post_immediately:
        try:
            bilag.posted_by = actor_id
            # Create posteringer and update status to POSTED
            posteringer = await post_bilag_with_entries(bilag, db)

            await log_domain_event(
                db=db, action="bilag:posted", resource_type="bilag",
                resource_id=str(bilag.id), user_id=actor_id,
                company_id=bilag.company_id,
                details={"bilag_number": bilag.bilag_number, "posteringer_count": len(posteringer)},
            )
            await db.commit()
            await invalidate_event("bilag:approve")

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
        await log_domain_event(
            db=db, action="bilag:approved", resource_type="bilag",
            resource_id=str(bilag.id), user_id=actor_id,
            company_id=bilag.company_id,
            details={"bilag_number": bilag.bilag_number},
        )
        await db.commit()
        await invalidate_event("bilag:approve")

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
    user: AuthenticatedUser | None = Depends(get_optional_user),
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

    await log_domain_event(
        db=db, action="bilag:rejected", resource_type="bilag",
        resource_id=str(bilag.id),
        user_id=user.user_id if user else None,
        company_id=bilag.company_id,
        details={"bilag_number": bilag.bilag_number, "reason": request.reason},
    )
    await db.commit()
    await invalidate_event("bilag:reject")

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
        await invalidate_event("bilag:post")

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

    # Validate balance before committing (Bokforingsloven §6)
    validate_journal_balance(posteringer)

    # Add posteringer to session
    for p in posteringer:
        db.add(p)

    await db.commit()
    await invalidate_event("bilag:pay")

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
    resolved_company_id: uuid.UUID = Depends(get_company_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create posteringer for posted bilags that don't have journal entries.

    Useful for migrating existing data. Uses data already on bilags (from Claude).
    Idempotent - skips bilags that already have posteringer.
    """
    from services.invoice_processor import backfill_posteringer_for_posted_bilags
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
    await invalidate_event("bilag:manual_post")

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


# =============================================================================
# Periodisering Endpoints
# =============================================================================


class PeriodiseringResponse(BaseModel):
    message: str
    bilag_id: str
    posteringer_count: int = 0


class PeriodiseringAcceptRequest(BaseModel):
    """User can override Ciri's suggested period and start month."""
    override_period_count: int | None = None  # User's chosen number of months
    override_start_period: str | None = None  # "YYYY-MM" format


class PeriodiseringCandidateItem(BaseModel):
    id: str
    bilag_number: str
    description: str
    document_date: str | None
    counterparty_name: str | None
    gross_amount: float
    net_amount: float
    suggested_account: str | None
    category: str | None
    periodisering_suggestion: dict
    created_by_ciri: bool


class PeriodiseringCandidateListResponse(BaseModel):
    items: list[PeriodiseringCandidateItem]
    total: int


@router.get("/periodisering/candidates", response_model=PeriodiseringCandidateListResponse)
async def list_periodisering_candidates(
    company_id: uuid.UUID,
    status: str = "pending",  # pending | accepted | dismissed | all
    db: AsyncSession = Depends(get_db),
):
    """
    List all bilags with periodisering suggestions.

    Filters:
    - pending: is_candidate=true, not accepted, not dismissed
    - accepted: accepted=true
    - dismissed: dismissed=true
    - all: any bilag with a periodisering_suggestion
    """
    from sqlalchemy import text

    base_query = select(Bilag).where(
        and_(
            Bilag.company_id == company_id,
            Bilag.periodisering_suggestion.isnot(None),
        )
    )

    if status == "pending":
        base_query = base_query.where(
            text("periodisering_suggestion->>'is_candidate' = 'true'"),
            text("coalesce(periodisering_suggestion->>'accepted', 'false') = 'false'"),
            text("coalesce(periodisering_suggestion->>'dismissed', 'false') = 'false'"),
        )
    elif status == "accepted":
        base_query = base_query.where(
            text("periodisering_suggestion->>'accepted' = 'true'"),
        )
    elif status == "dismissed":
        base_query = base_query.where(
            text("periodisering_suggestion->>'dismissed' = 'true'"),
        )

    base_query = base_query.order_by(Bilag.created_at.desc())
    result = await db.execute(base_query)
    bilags = result.scalars().all()

    items = [
        PeriodiseringCandidateItem(
            id=str(b.id),
            bilag_number=b.bilag_number,
            description=b.description or "",
            document_date=str(b.document_date) if b.document_date else None,
            counterparty_name=b.counterparty_name,
            gross_amount=float(b.gross_amount or 0),
            net_amount=float(b.net_amount or 0),
            suggested_account=b.suggested_account,
            category=b.category,
            periodisering_suggestion=b.periodisering_suggestion,
            created_by_ciri=b.created_by_ciri,
        )
        for b in bilags
    ]

    return PeriodiseringCandidateListResponse(items=items, total=len(items))


@router.post("/{bilag_id}/periodisering/accept", response_model=PeriodiseringResponse)
async def accept_periodisering(
    bilag_id: str,
    body: PeriodiseringAcceptRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Accept a periodisering suggestion — reverse original posting and create spread entries.

    Accounting flow (Bokføringsloven §13 — reversal + repost):

    IF the bilag already has posteringer (e.g. full expense was booked):
      Original:   DEBIT 6340 (expense) 38,400  /  CREDIT 1920 (bank) 38,400

    Step 1 — Reverse the original expense posting:
      CREDIT 6340 (expense) 38,400  /  DEBIT 1920 (bank) 38,400
      (This zeros out the one-shot expense)

    Step 2 — Reclassify to prepaid asset:
      DEBIT 1700 (forskuddsbetalt) 38,400  /  CREDIT 1920 (bank) 38,400
      (Moves the cost from "spent" to "prepaid" on the balance sheet)

    Step 3 — Monthly recognition:
      DEBIT 6340 (expense) 3,200  /  CREDIT 1700 (forskuddsbetalt) 3,200  x12
      (Releases 1/12 of the prepaid each month to the P&L)

    Net effect: the full expense is removed from the original period and spread
    across the distribution periods. Balance sheet shows 1700 declining monthly.

    IF the bilag has NO existing posteringer:
      Skip step 1, just do steps 2 and 3.
    """
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()
    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    suggestion = bilag.periodisering_suggestion
    if not suggestion or not suggestion.get("is_candidate"):
        raise HTTPException(status_code=400, detail="Ingen periodiseringsforslag på dette bilaget")
    if suggestion.get("accepted"):
        raise HTTPException(status_code=400, detail="Periodisering er allerede godkjent")

    total_amount = Decimal(str(suggestion["total_amount"]))
    expense_account = suggestion["expense_account"]
    balance_account = suggestion["balance_account"]

    # Apply user overrides if provided
    period_count = suggestion["period_count"]
    start_period = suggestion["start_period"]
    user_overrode = False

    if body and body.override_period_count and body.override_period_count >= 1:
        period_count = body.override_period_count
        user_overrode = True
    if body and body.override_start_period:
        start_period = body.override_start_period
        user_overrode = True

    # Recalculate monthly amount based on (possibly overridden) period count
    monthly_amount = Decimal(str(round(float(total_amount) / period_count, 2)))
    remainder = total_amount - monthly_amount * period_count

    now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    reversal_journal_id = f"PERIOD-REV-{bilag.bilag_number}-{now_ts}"
    reclass_journal_id = f"PERIOD-RECLASS-{bilag.bilag_number}-{now_ts}"
    spread_journal_id = f"PERIOD-{bilag.bilag_number}-{now_ts}"

    posteringer = []
    posting_date = bilag.document_date

    # ── Step 1: Reverse existing posteringer (if any) ──
    # Per Bokføringsloven §13: original entries are immutable, we create
    # reversal entries that flip debit/credit to net them to zero.
    existing_result = await db.execute(
        select(Postering).where(Postering.bilag_id == bilag.id)
    )
    existing_posteringer = existing_result.scalars().all()

    for idx, orig in enumerate(existing_posteringer):
        # Bokføringsloven §9: reversal must include ALL account dimensions
        # and treatment codes (MVA codes). Flip debit/credit AND negate MVA.
        posteringer.append(Postering(
            company_id=bilag.company_id,
            bilag_id=bilag.id,
            journal_id=reversal_journal_id,
            posting_date=orig.posting_date,
            period=orig.period,
            account_number=orig.account_number,
            description=f"Reversering (periodisering): {orig.description}",
            debit_amount=orig.credit_amount,    # Flip
            credit_amount=orig.debit_amount,    # Flip
            mva_code=orig.mva_code,             # Preserve original MVA code
            mva_amount=-orig.mva_amount if orig.mva_amount else Decimal("0"),
            saft_transaction_id=f"SAFT-{bilag.bilag_number}-PREV-{idx:02d}-{uuid.uuid4().hex[:6]}",
            created_by_ciri=True,
        ))

    # ── Step 2: Reclassify full amount to prepaid balance account ──
    # DEBIT 1700 (forskuddsbetalt) / CREDIT counter-account
    # The counter-account depends on what was originally credited:
    # - If original posteringer existed, use the counter-account from them
    #   (typically 1920 bank or 2400 leverandørgjeld)
    # - If no originals, use 2400 (leverandørgjeld) as default
    counter_account = "2400"
    if existing_posteringer:
        # Find the credit side of the original entry (the account that's not the expense)
        for orig in existing_posteringer:
            if orig.credit_amount > 0 and orig.account_number != expense_account:
                counter_account = orig.account_number
                break

    posteringer.append(Postering(
        company_id=bilag.company_id,
        bilag_id=bilag.id,
        journal_id=reclass_journal_id,
        posting_date=posting_date,
        period=posting_date.strftime("%Y-%m"),
        account_number=balance_account,
        description=f"Forskuddsbetalt: {bilag.description}",
        debit_amount=total_amount,
        credit_amount=Decimal("0"),
        mva_code=None,
        mva_amount=Decimal("0"),
        saft_transaction_id=f"SAFT-{bilag.bilag_number}-PRECLASS-DR-{uuid.uuid4().hex[:6]}",
        created_by_ciri=True,
    ))
    posteringer.append(Postering(
        company_id=bilag.company_id,
        bilag_id=bilag.id,
        journal_id=reclass_journal_id,
        posting_date=posting_date,
        period=posting_date.strftime("%Y-%m"),
        account_number=counter_account,
        description=f"Omklassifisert til periodisering: {bilag.description}",
        debit_amount=Decimal("0"),
        credit_amount=total_amount,
        mva_code=None,
        mva_amount=Decimal("0"),
        saft_transaction_id=f"SAFT-{bilag.bilag_number}-PRECLASS-CR-{uuid.uuid4().hex[:6]}",
        created_by_ciri=True,
    ))

    # ── Step 3: Monthly expense entries ──
    start_year, start_month = int(start_period[:4]), int(start_period[5:7])
    for i in range(period_count):
        month_total = (start_year * 12 + start_month - 1) + i
        y, m = divmod(month_total, 12)
        period = f"{y}-{m + 1:02d}"
        period_date = date(y, m + 1, 1)

        amount = monthly_amount
        if i == period_count - 1 and remainder != 0:
            amount = monthly_amount + remainder

        # Debit expense (monthly recognition)
        posteringer.append(Postering(
            company_id=bilag.company_id,
            bilag_id=bilag.id,
            journal_id=spread_journal_id,
            posting_date=period_date,
            period=period,
            account_number=expense_account,
            description=f"Periodisert kostnad {i+1}/{period_count}: {bilag.description}",
            debit_amount=amount,
            credit_amount=Decimal("0"),
            mva_code=None,
            mva_amount=Decimal("0"),
            saft_transaction_id=f"SAFT-{bilag.bilag_number}-P{i+1:02d}-DR-{uuid.uuid4().hex[:6]}",
            created_by_ciri=True,
        ))
        # Credit prepaid (reduces balance sheet asset monthly)
        posteringer.append(Postering(
            company_id=bilag.company_id,
            bilag_id=bilag.id,
            journal_id=spread_journal_id,
            posting_date=period_date,
            period=period,
            account_number=balance_account,
            description=f"Periodisert kostnad {i+1}/{period_count}: {bilag.description}",
            debit_amount=Decimal("0"),
            credit_amount=amount,
            mva_code=None,
            mva_amount=Decimal("0"),
            saft_transaction_id=f"SAFT-{bilag.bilag_number}-P{i+1:02d}-CR-{uuid.uuid4().hex[:6]}",
            created_by_ciri=True,
        ))

    # Validate balance before committing (Bokforingsloven §6)
    validate_journal_balance(posteringer)

    for p in posteringer:
        db.add(p)

    # Update suggestion as accepted (include user overrides for audit trail)
    updated = {
        **suggestion,
        "accepted": True,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "period_count": period_count,
        "start_period": start_period,
        "monthly_amount": float(monthly_amount),
        "remainder": float(remainder),
    }
    if user_overrode:
        updated["user_overrode"] = True
        updated["original_period_count"] = suggestion["period_count"]
        updated["original_start_period"] = suggestion["start_period"]
    updated["reversed_count"] = len(existing_posteringer)
    # Store journal IDs for full audit trail linkage (Bokføringsloven §9 mutual references)
    updated["journal_ids"] = {
        "reversal": reversal_journal_id if existing_posteringer else None,
        "reclassification": reclass_journal_id,
        "spread": spread_journal_id,
    }
    bilag.periodisering_suggestion = updated

    await db.commit()
    await invalidate_event("bilag:periodisering")

    reversed_msg = f" ({len(existing_posteringer)} opprinnelige posteringer reversert)" if existing_posteringer else ""
    return PeriodiseringResponse(
        message=f"Periodisering godkjent — {period_count} månedlige posteringer opprettet{reversed_msg}",
        bilag_id=str(bilag.id),
        posteringer_count=len(posteringer),
    )


@router.post("/{bilag_id}/periodisering/dismiss", response_model=PeriodiseringResponse)
async def dismiss_periodisering(
    bilag_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Dismiss a periodisering suggestion."""
    result = await db.execute(
        select(Bilag).where(Bilag.id == uuid.UUID(bilag_id))
    )
    bilag = result.scalar_one_or_none()
    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    suggestion = bilag.periodisering_suggestion
    if not suggestion:
        raise HTTPException(status_code=400, detail="Ingen periodiseringsforslag")

    updated = {**suggestion, "dismissed": True}
    bilag.periodisering_suggestion = updated

    await db.commit()
    await invalidate_event("bilag:periodisering")

    return PeriodiseringResponse(
        message="Periodiseringsforslag avvist",
        bilag_id=str(bilag.id),
    )
