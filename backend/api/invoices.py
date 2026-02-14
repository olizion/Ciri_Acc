"""
Invoice API Routes
Create, send, and manage outgoing invoices (fakturaer)
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from decimal import Decimal
import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.settings import settings
from models.invoice import Invoice, InvoiceStatus
from models.notification import Notification
from services.email_sender import send_email
from templates.invoice_email import render_invoice_email

router = APIRouter()


# --- Request / Response schemas ---

class InvoiceCreate(BaseModel):
    customer_name: str
    customer_email: EmailStr
    description: str
    amount: Decimal
    mva_rate: int = 25  # 25, 15, or 0
    due_date: date
    bank_account: str
    kid_number: str | None = None
    company_id: str | None = None


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    customer_name: str
    customer_email: str
    description: str
    amount: Decimal
    mva_rate: int
    mva_amount: Decimal
    total_amount: Decimal
    due_date: date
    bank_account: str
    kid_number: str | None
    view_token: str
    status: str
    sent_at: datetime | None
    viewed_at: datetime | None
    viewed_count: int
    paid_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    items: list[InvoiceResponse]
    total: int


class InvoicePublicResponse(BaseModel):
    """Public invoice view — no sensitive internal data."""
    invoice_number: str
    company_name: str
    customer_name: str
    description: str
    amount: Decimal
    mva_rate: int
    mva_amount: Decimal
    total_amount: Decimal
    due_date: date
    bank_account: str
    kid_number: str | None
    status: str


# --- Helpers ---

async def _resolve_company_id(db: AsyncSession, raw_id: str | None) -> uuid.UUID:
    """Resolve company_id: use provided if valid, else fall back to first company."""
    from models.company import Company

    if raw_id:
        # Try parsing the provided ID
        try:
            cid = uuid.UUID(raw_id)
        except ValueError:
            cid = None

        if cid:
            result = await db.execute(select(Company.id).where(Company.id == cid))
            if result.scalar_one_or_none():
                return cid

    # Fallback: first company in DB
    result = await db.execute(select(Company.id).limit(1))
    company_id = result.scalar_one_or_none()
    if not company_id:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return company_id


async def _next_invoice_number(db: AsyncSession, company_id: uuid.UUID) -> str:
    """Generate next sequential invoice number (F-0001, F-0002, ...)."""
    result = await db.execute(
        select(func.count()).select_from(Invoice).where(Invoice.company_id == company_id)
    )
    count = result.scalar_one()
    return f"F-{count + 1:04d}"


def _to_response(inv: Invoice) -> InvoiceResponse:
    return InvoiceResponse(
        id=str(inv.id),
        invoice_number=inv.invoice_number,
        customer_name=inv.customer_name,
        customer_email=inv.customer_email,
        description=inv.description,
        amount=inv.amount,
        mva_rate=inv.mva_rate,
        mva_amount=inv.mva_amount,
        total_amount=inv.total_amount,
        due_date=inv.due_date,
        bank_account=inv.bank_account,
        kid_number=inv.kid_number,
        view_token=inv.view_token,
        status=inv.status.value,
        sent_at=inv.sent_at,
        viewed_at=inv.viewed_at,
        viewed_count=inv.viewed_count,
        paid_at=inv.paid_at,
        created_at=inv.created_at,
    )


# --- Routes ---

@router.post("", response_model=InvoiceResponse)
async def create_invoice(
    body: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new invoice."""
    company_id = await _resolve_company_id(db, body.company_id)
    mva_amount = body.amount * body.mva_rate / 100
    total_amount = body.amount + mva_amount

    invoice = Invoice(
        company_id=company_id,
        invoice_number=await _next_invoice_number(db, company_id),
        customer_name=body.customer_name,
        customer_email=body.customer_email,
        description=body.description,
        amount=body.amount,
        mva_rate=body.mva_rate,
        mva_amount=mva_amount,
        total_amount=total_amount,
        due_date=body.due_date,
        bank_account=body.bank_account,
        kid_number=body.kid_number,
    )
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)
    return _to_response(invoice)


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Send invoice email to customer."""
    result = await db.execute(
        select(Invoice).where(Invoice.id == uuid.UUID(invoice_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Faktura ikke funnet")

    # Build public URL
    public_url = f"{settings.frontend_url}/faktura/{invoice.view_token}"

    # Render and send email
    html = render_invoice_email(
        invoice_number=invoice.invoice_number,
        customer_name=invoice.customer_name,
        company_name=settings.smtp_from_name,
        description=invoice.description,
        amount=f"{invoice.amount:,.2f}".replace(",", " "),
        mva_amount=f"{invoice.mva_amount:,.2f}".replace(",", " "),
        total_amount=f"{invoice.total_amount:,.2f}".replace(",", " "),
        due_date=invoice.due_date.strftime("%d.%m.%Y"),
        public_url=public_url,
        bank_account=invoice.bank_account or "",
        kid_number=invoice.kid_number or "",
    )

    await send_email(
        to=invoice.customer_email,
        subject=f"Faktura {invoice.invoice_number} fra {settings.smtp_from_name}",
        html_body=html,
    )

    # Mark as sent regardless of email delivery
    # (email config may not be set up yet)
    invoice.status = InvoiceStatus.SENT
    invoice.sent_at = datetime.utcnow()
    await db.flush()
    await db.refresh(invoice)
    return _to_response(invoice)


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    company_id: str | None = Query(None),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List invoices for a company."""
    resolved_id = await _resolve_company_id(db, company_id)
    query = select(Invoice).where(
        Invoice.company_id == resolved_id
    ).order_by(Invoice.created_at.desc())

    if status:
        query = query.where(Invoice.status == InvoiceStatus(status))

    # Count
    count_q = select(func.count()).select_from(Invoice).where(
        Invoice.company_id == resolved_id
    )
    if status:
        count_q = count_q.where(Invoice.status == InvoiceStatus(status))
    total = (await db.execute(count_q)).scalar_one()

    result = await db.execute(query)
    invoices = result.scalars().all()
    return InvoiceListResponse(
        items=[_to_response(inv) for inv in invoices],
        total=total,
    )


@router.get("/public/{view_token}", response_model=InvoicePublicResponse)
async def get_public_invoice(
    view_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public invoice view — no authentication required.
    Tracks view count and creates notification on first view.
    """
    result = await db.execute(
        select(Invoice).where(Invoice.view_token == view_token)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Faktura ikke funnet")

    # Track view
    first_view = invoice.viewed_at is None
    invoice.viewed_count += 1
    if first_view:
        invoice.viewed_at = datetime.utcnow()
        if invoice.status == InvoiceStatus.SENT:
            invoice.status = InvoiceStatus.VIEWED

        # Create notification
        notification = Notification(
            company_id=invoice.company_id,
            title=f"Faktura {invoice.invoice_number} åpnet",
            message=f"{invoice.customer_name} har åpnet fakturaen.",
            type="invoice_viewed",
            reference_id=str(invoice.id),
        )
        db.add(notification)

    await db.flush()

    # Get company name for public response
    from models.company import Company
    company_result = await db.execute(
        select(Company.name).where(Company.id == invoice.company_id)
    )
    company_name = company_result.scalar_one_or_none() or "Ukjent"

    return InvoicePublicResponse(
        invoice_number=invoice.invoice_number,
        company_name=company_name,
        customer_name=invoice.customer_name,
        description=invoice.description,
        amount=invoice.amount,
        mva_rate=invoice.mva_rate,
        mva_amount=invoice.mva_amount,
        total_amount=invoice.total_amount,
        due_date=invoice.due_date,
        bank_account=invoice.bank_account,
        kid_number=invoice.kid_number,
        status=invoice.status.value,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single invoice."""
    result = await db.execute(
        select(Invoice).where(Invoice.id == uuid.UUID(invoice_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Faktura ikke funnet")
    return _to_response(invoice)


@router.post("/{invoice_id}/mark-paid", response_model=InvoiceResponse)
async def mark_invoice_paid(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark invoice as paid."""
    result = await db.execute(
        select(Invoice).where(Invoice.id == uuid.UUID(invoice_id))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Faktura ikke funnet")

    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = datetime.utcnow()

    # Create notification
    notification = Notification(
        company_id=invoice.company_id,
        title=f"Faktura {invoice.invoice_number} betalt",
        message=f"{invoice.customer_name} har betalt kr {invoice.total_amount:,.2f}.",
        type="invoice_paid",
        reference_id=str(invoice.id),
    )
    db.add(notification)
    await db.flush()
    await db.refresh(invoice)
    return _to_response(invoice)
