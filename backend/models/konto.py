"""
Konto Model
Chart of accounts following NS 4102
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class KontoType(str, Enum):
    """Account types in Norwegian accounting."""
    ASSET = "asset"           # Eiendeler (1xxx)
    LIABILITY = "liability"   # Gjeld (2xxx)
    EQUITY = "equity"         # Egenkapital (2xxx)
    INCOME = "income"         # Inntekter (3xxx)
    EXPENSE = "expense"       # Kostnader (4xxx-7xxx)


class Konto(Base):
    """
    Konto (account) model.

    Follows Norwegian Standard NS 4102 for account numbering.
    """

    __tablename__ = "kontoer"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Account number (NS 4102)
    number: Mapped[str] = mapped_column(String(10), index=True)
    # e.g., "1920" for Bank, "6540" for Software

    # Name
    name: Mapped[str] = mapped_column(String(255))

    # Type
    type: Mapped[KontoType] = mapped_column(SQLEnum(KontoType))

    # Hierarchy
    parent_number: Mapped[str | None] = mapped_column(String(10))
    # e.g., "1900" is parent of "1920"

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # SAF-T mapping (required from 2025)
    saft_standard_id: Mapped[str | None] = mapped_column(String(50))
    # Maps to næringsspesifikasjon

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Unique constraint on company + number
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )

    def __repr__(self) -> str:
        return f"<Konto {self.number}: {self.name}>"

    @property
    def is_balance_account(self) -> bool:
        """Check if this is a balance sheet account."""
        return self.type in (KontoType.ASSET, KontoType.LIABILITY, KontoType.EQUITY)

    @property
    def is_result_account(self) -> bool:
        """Check if this is an income statement account."""
        return self.type in (KontoType.INCOME, KontoType.EXPENSE)
