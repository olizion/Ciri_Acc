"""
Invoice Model
Outgoing invoices (fakturaer) sent to customers
"""

import uuid
import secrets
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, DateTime, Date, Numeric, Text, Integer, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class InvoiceStatus(str, Enum):
    """Invoice lifecycle status."""
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    PAID = "paid"


class Invoice(Base):
    """Outgoing invoice (faktura) model."""

    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Invoice number (F-0001, F-0002, ...)
    invoice_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # Customer info
    customer_name: Mapped[str] = mapped_column(String(255))
    customer_email: Mapped[str] = mapped_column(String(255))

    # Content
    description: Mapped[str] = mapped_column(Text)

    # Amounts
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    mva_rate: Mapped[int] = mapped_column(Integer, default=25)  # 25, 15, or 0
    mva_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))

    # Payment details
    due_date: Mapped[date] = mapped_column(Date)
    bank_account: Mapped[str] = mapped_column(String(20))
    kid_number: Mapped[str | None] = mapped_column(String(25))

    # Public view token (no auth needed)
    view_token: Mapped[str] = mapped_column(
        String(64), unique=True, index=True,
        default=lambda: secrets.token_urlsafe(32)
    )

    # Status
    status: Mapped[InvoiceStatus] = mapped_column(
        SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT
    )

    # Tracking
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    viewed_count: Mapped[int] = mapped_column(Integer, default=0)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number}: {self.customer_name} {self.total_amount}>"
