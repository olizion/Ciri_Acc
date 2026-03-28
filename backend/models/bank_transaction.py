"""
Bank Transaction Model
Imported transactions from connected bank accounts
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Date, Numeric, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base
from models.mixins import RetentionMixin


class TransactionDirection(str, Enum):
    """Transaction direction."""
    DEBIT = "debit"    # Money out (negative)
    CREDIT = "credit"  # Money in (positive)


class ReconciliationStatus(str, Enum):
    """Transaction reconciliation status."""
    UNMATCHED = "unmatched"      # No match found yet
    SUGGESTED = "suggested"      # Match suggested by Ciri
    MATCHED = "matched"          # Match confirmed
    IGNORED = "ignored"          # User chose to ignore (private, etc.)
    SPLIT = "split"              # Transaction split across multiple bilags


class TransactionCategory(str, Enum):
    """Transaction category for quick categorization."""
    INNTEKT = "inntekt"          # Income
    VAREKJOP = "varekjop"        # Cost of goods
    LONN = "lonn"                # Salary/wages
    KONTOR = "kontor"            # Office expenses
    REISE = "reise"              # Travel expenses
    MVA = "mva"                  # VAT payments
    PRIVAT = "privat"            # Private (not business)
    BANK = "bank"                # Bank fees
    FORSIKRING = "forsikring"    # Insurance
    LEIE = "leie"                # Rent
    UKATEGORISERT = "ukategorisert"  # Uncategorized


class BankTransaction(RetentionMixin, Base):
    """
    Bank transaction model.

    Represents a single transaction imported from a bank account.
    Used for reconciliation with bilags (source documents).
    """

    __tablename__ = "bank_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )
    bank_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id"), index=True
    )

    # External reference (unique per bank account)
    external_transaction_id: Mapped[str] = mapped_column(String(255), index=True)

    # Transaction dates
    booking_date: Mapped[date] = mapped_column(Date, index=True)  # When booked by bank
    value_date: Mapped[date | None] = mapped_column(Date)  # When funds available

    # Amount (always signed: negative = debit/out, positive = credit/in)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    currency: Mapped[str] = mapped_column(String(3), default="NOK")
    direction: Mapped[TransactionDirection] = mapped_column(
        SQLEnum(TransactionDirection)
    )

    # Balance after transaction
    balance_after: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))

    # Description from bank
    raw_description: Mapped[str] = mapped_column(String(500))
    cleaned_description: Mapped[str | None] = mapped_column(String(500))  # Normalized by Ciri

    # Counterparty info (extracted from description)
    merchant_name: Mapped[str | None] = mapped_column(String(255))
    merchant_category_code: Mapped[str | None] = mapped_column(String(10))  # MCC

    # Reference numbers
    reference: Mapped[str | None] = mapped_column(String(50))  # KID, invoice ref, etc.
    end_to_end_id: Mapped[str | None] = mapped_column(String(50))

    # AI categorization
    category: Mapped[TransactionCategory] = mapped_column(
        SQLEnum(TransactionCategory), default=TransactionCategory.UKATEGORISERT
    )
    suggested_account: Mapped[str | None] = mapped_column(String(10))  # NS 4102 account
    ciri_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    ciri_analysis: Mapped[dict | None] = mapped_column(JSONB)  # AI analysis details

    # Reconciliation status
    reconciliation_status: Mapped[ReconciliationStatus] = mapped_column(
        SQLEnum(ReconciliationStatus), default=ReconciliationStatus.UNMATCHED
    )
    reconciled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reconciled_by_ciri: Mapped[bool] = mapped_column(Boolean, default=False)
    reconciled_by_user: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )  # User who confirmed reconciliation, null if Ciri

    # Private transaction (not for business accounting)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    private_marked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    private_marked_by_ciri: Mapped[bool] = mapped_column(Boolean, default=False)
    private_marked_by_user: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )  # User who marked as private, null if Ciri

    # Matching metadata
    match_attempts: Mapped[int] = mapped_column(default=0)
    last_match_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    bank_account: Mapped["BankAccount"] = relationship(back_populates="transactions")
    matches: Mapped[list["ReconciliationMatch"]] = relationship(
        back_populates="bank_transaction", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<BankTransaction {self.booking_date}: {self.amount} {self.raw_description[:30]}>"

    @property
    def is_expense(self) -> bool:
        """Check if transaction is an expense (money out)."""
        return self.amount < 0 or self.direction == TransactionDirection.DEBIT

    @property
    def is_income(self) -> bool:
        """Check if transaction is income (money in)."""
        return self.amount > 0 or self.direction == TransactionDirection.CREDIT

    @property
    def absolute_amount(self) -> Decimal:
        """Get absolute amount value."""
        return abs(self.amount)

    @property
    def needs_attention(self) -> bool:
        """Check if transaction needs user attention."""
        return (
            self.reconciliation_status == ReconciliationStatus.UNMATCHED and
            not self.is_private and
            self.category == TransactionCategory.UKATEGORISERT
        )
