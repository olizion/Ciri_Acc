"""
Postering Model
Accounting entry/posting (journal entry line)
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, Numeric, ForeignKey, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class Postering(Base):
    """
    Postering (accounting entry) model.

    Represents a single line in a journal entry.
    Immutable after creation - corrections must be new entries.
    Complies with Bokføringsloven §6 (two-way audit trail).
    """

    __tablename__ = "posteringer"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Link to source document (two-way audit trail)
    bilag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bilag.id"), index=True
    )
    bilag: Mapped["Bilag"] = relationship(back_populates="posterings")

    # Journal identification
    journal_id: Mapped[str] = mapped_column(String(50), index=True)
    # Groups related posterings together

    # Posting details
    posting_date: Mapped[date] = mapped_column(Date, index=True)
    period: Mapped[str] = mapped_column(String(7), index=True)  # "2025-01"

    # Account
    account_number: Mapped[str] = mapped_column(String(10), index=True)
    # Links to Konto model

    # Description
    description: Mapped[str] = mapped_column(String(500))

    # Amounts (one of debit/credit should be 0)
    debit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)

    # MVA
    mva_code: Mapped[str | None] = mapped_column(String(10))
    mva_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)

    # SAF-T reference
    saft_transaction_id: Mapped[str] = mapped_column(String(50), unique=True)

    # AI metadata
    created_by_ciri: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamp (no updated_at - immutable)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    def __repr__(self) -> str:
        amount = self.debit_amount if self.debit_amount else -self.credit_amount
        return f"<Postering {self.account_number}: {amount}>"

    @property
    def is_debit(self) -> bool:
        """Check if this is a debit entry."""
        return self.debit_amount > 0

    @property
    def amount(self) -> Decimal:
        """Get signed amount (positive for debit, negative for credit)."""
        return self.debit_amount - self.credit_amount


# Bokføringsloven §6: Posteringer are immutable after creation.
# Corrections must be made as new reversing entries, never by modifying existing ones.

@event.listens_for(Postering, "before_update")
def _prevent_postering_update(mapper, connection, target):
    raise ValueError(
        "Postering kan ikke endres etter opprettelse (Bokføringsloven §6). "
        "Opprett en korreksjonpostering i stedet."
    )


@event.listens_for(Postering, "before_delete")
def _prevent_postering_delete(mapper, connection, target):
    raise ValueError(
        "Postering kan ikke slettes (Bokføringsloven §6). "
        "Opprett en korreksjonpostering i stedet."
    )
