"""
Bank Account Model
Connected bank accounts via Open Banking (PSD2)

Integration Options:
1. GOCARDLESS (Recommended - FREE)
   - No eIDAS certificate required
   - Covers 2,500+ European banks including all Norwegian banks
   - Get credentials: https://bankaccountdata.gocardless.com/user-secrets/

2. DIRECT (Requires eIDAS certificate ~NOK 50,000)
   - DNB (developer.dnb.no)
   - Nordea (developer.nordeaopenbanking.com)
   - SpareBank 1 (api.sparebank1.no)
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class BankAccountStatus(str, Enum):
    """Bank account connection status."""
    ACTIVE = "active"                    # Connected and syncing
    CONSENT_EXPIRED = "consent_expired"  # PSD2 consent expired (90 days)
    ERROR = "error"                      # Connection error
    DISCONNECTED = "disconnected"        # User disconnected


class BankAggregator(str, Enum):
    """Open Banking integration method."""
    GOCARDLESS = "gocardless"  # GoCardless Bank Account Data (FREE - Recommended!)
    ROARING = "roaring"        # Roaring.io (sandbox-friendly, Mock ASPSP)
    DIRECT = "direct"          # Direct bank API (requires eIDAS certificate)
    NEONOMICS = "neonomics"    # Neonomics aggregator (legacy)
    AIIA = "aiia"              # Aiia/Mastercard aggregator
    MANUAL = "manual"          # Manual import via file


class BankAccount(Base):
    """
    Connected bank account model.

    Represents a bank account connected via Open Banking (PSD2).
    Used for automatic transaction import and reconciliation.
    """

    __tablename__ = "bank_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Bank identification
    bank_name: Mapped[str] = mapped_column(String(100))  # "DNB", "Nordea", etc.
    bank_identifier: Mapped[str | None] = mapped_column(String(50))  # BIC/SWIFT

    # Account details
    account_number: Mapped[str] = mapped_column(String(20))  # BBAN (Norwegian format)
    iban: Mapped[str | None] = mapped_column(String(34))  # IBAN if available
    account_name: Mapped[str] = mapped_column(String(100))  # User-friendly name
    currency: Mapped[str] = mapped_column(String(3), default="NOK")

    # NS 4102 mapping (chart of accounts)
    konto_number: Mapped[str] = mapped_column(String(10), default="1920")  # Default: Bank, driftskonto

    # Open Banking connection
    aggregator: Mapped[BankAggregator] = mapped_column(
        SQLEnum(BankAggregator), default=BankAggregator.GOCARDLESS
    )
    external_account_id: Mapped[str | None] = mapped_column(String(255))  # ID from aggregator
    consent_id: Mapped[str | None] = mapped_column(String(255))  # PSD2 consent ID
    consent_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Tokens (encrypted)
    access_token_encrypted: Mapped[str | None] = mapped_column(String(2000))
    refresh_token_encrypted: Mapped[str | None] = mapped_column(String(2000))

    # Balance
    current_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    available_balance: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    balance_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Status
    status: Mapped[BankAccountStatus] = mapped_column(
        SQLEnum(BankAccountStatus), default=BankAccountStatus.ACTIVE
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_sync_error: Mapped[str | None] = mapped_column(String(500))
    transaction_count: Mapped[int] = mapped_column(default=0)

    # Settings
    auto_sync_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)  # Primary business account

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    transactions: Mapped[list["BankTransaction"]] = relationship(
        back_populates="bank_account", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<BankAccount {self.bank_name}: {self.account_number}>"

    @property
    def is_consent_valid(self) -> bool:
        """Check if PSD2 consent is still valid."""
        if not self.consent_expires_at:
            return False
        return datetime.utcnow() < self.consent_expires_at.replace(tzinfo=None)

    @property
    def needs_reauth(self) -> bool:
        """Check if account needs re-authorization."""
        return (
            self.status == BankAccountStatus.CONSENT_EXPIRED or
            not self.is_consent_valid
        )
