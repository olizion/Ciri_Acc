"""
EmailConnection Model
OAuth connection for Gmail/Outlook email integration
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class EmailProvider(str, Enum):
    """Email provider type."""
    GOOGLE = "google"
    MICROSOFT = "microsoft"


class EmailConnectionStatus(str, Enum):
    """Connection status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    EXPIRED = "expired"


class EmailConnection(Base):
    """
    Email connection model for OAuth-based email integration.

    Stores OAuth tokens for Gmail/Outlook to enable automatic
    invoice ingestion from connected email accounts.
    """

    __tablename__ = "email_connections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Provider info
    provider: Mapped[EmailProvider] = mapped_column(
        SQLEnum(EmailProvider), index=True
    )
    email_address: Mapped[str] = mapped_column(String(255), index=True)

    # OAuth tokens (encrypted at rest)
    access_token: Mapped[str] = mapped_column(Text)  # Encrypted
    refresh_token: Mapped[str] = mapped_column(Text)  # Encrypted
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Scopes granted
    scopes: Mapped[str | None] = mapped_column(Text)  # Space-separated

    # Status
    status: Mapped[EmailConnectionStatus] = mapped_column(
        SQLEnum(EmailConnectionStatus), default=EmailConnectionStatus.ACTIVE
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Sync tracking
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_message_id: Mapped[str | None] = mapped_column(String(255))  # For incremental sync
    emails_processed: Mapped[int] = mapped_column(default=0)
    invoices_created: Mapped[int] = mapped_column(default=0)

    # Error tracking
    last_error: Mapped[str | None] = mapped_column(Text)
    error_count: Mapped[int] = mapped_column(default=0)
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    company: Mapped["Company"] = relationship(back_populates="email_connections")

    def __repr__(self) -> str:
        return f"<EmailConnection {self.provider.value}: {self.email_address}>"

    @property
    def is_token_expired(self) -> bool:
        """Check if the access token is expired."""
        if not self.token_expires_at:
            return True
        return datetime.utcnow() > self.token_expires_at.replace(tzinfo=None)

    @property
    def needs_refresh(self) -> bool:
        """Check if token needs refresh (5 min buffer)."""
        if not self.token_expires_at:
            return True
        from datetime import timedelta
        buffer = timedelta(minutes=5)
        return datetime.utcnow() > (self.token_expires_at.replace(tzinfo=None) - buffer)

    def to_dict(self) -> dict:
        """Convert to dict for API responses (without sensitive data)."""
        return {
            "id": str(self.id),
            "company_id": str(self.company_id),
            "provider": self.provider.value,
            "email_address": self.email_address,
            "status": self.status.value,
            "is_active": self.is_active,
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "emails_processed": self.emails_processed,
            "invoices_created": self.invoices_created,
            "last_error": self.last_error,
            "error_count": self.error_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
