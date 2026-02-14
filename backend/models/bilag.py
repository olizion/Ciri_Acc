"""
Bilag Model
Document/receipt for bookkeeping
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Date, Numeric, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class BilagStatus(str, Enum):
    """Bilag processing status."""
    PENDING = "pending"        # Awaiting review
    APPROVED = "approved"      # Approved, ready to post
    POSTED = "posted"          # Posted to accounts
    REJECTED = "rejected"      # Rejected by user
    AWAITING_TRANSACTION = "awaiting_transaction"  # Waiting for bank transaction match


class Bilag(Base):
    """
    Bilag (document/receipt) model.

    Represents source documents for accounting entries.
    Complies with Bokføringsforskriften §5-1-1.
    """

    __tablename__ = "bilag"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Sequential numbering (Bokføringsforskriften §5-1-3)
    bilag_number: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    # Format: "2025-00001"

    # Dates
    document_date: Mapped[date] = mapped_column(Date)  # Date on document
    receipt_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))  # When received

    # Content
    description: Mapped[str] = mapped_column(String(500))

    # Amounts (in NOK after conversion)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    net_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    mva_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    mva_code: Mapped[str | None] = mapped_column(String(10))

    # Original currency (for foreign invoices)
    original_currency: Mapped[str | None] = mapped_column(String(3))  # ISO currency code
    original_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))  # Original gross amount
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(15, 6))  # Rate used for conversion
    exchange_rate_date: Mapped[date | None] = mapped_column(Date)  # Date of exchange rate

    # Counterparty (Bokføringsforskriften §5-1-1)
    counterparty_name: Mapped[str | None] = mapped_column(String(255))
    counterparty_org_number: Mapped[str | None] = mapped_column(String(9))

    # Category
    category: Mapped[str | None] = mapped_column(String(100))
    suggested_account: Mapped[str | None] = mapped_column(String(10))

    # File storage
    file_path: Mapped[str] = mapped_column(String(500))  # Encrypted path
    file_hash_sha256: Mapped[str] = mapped_column(String(64))  # Integrity check
    original_filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))

    # OCR results
    ocr_text: Mapped[str | None] = mapped_column(Text)
    ocr_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))

    # Status
    status: Mapped[BilagStatus] = mapped_column(
        SQLEnum(BilagStatus), default=BilagStatus.PENDING
    )

    # AI metadata
    created_by_ciri: Mapped[bool] = mapped_column(Boolean, default=False)
    ciri_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    ciri_reasoning: Mapped[str | None] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    posterings: Mapped[list["Postering"]] = relationship(back_populates="bilag")

    def __repr__(self) -> str:
        return f"<Bilag {self.bilag_number}: {self.description[:30]}>"
