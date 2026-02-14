"""
Company Model
Norwegian business entity
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class AutonomyLevel(str, Enum):
    """Ciri autonomy levels."""
    ASSISTANT = "assistant"    # Assistent - auto-handles routine
    AUTONOMOUS = "autonomous"  # Autonom - handles everything


class MVAPeriod(str, Enum):
    """MVA reporting periods."""
    BIMONTHLY = "bi_monthly"   # Every 2 months (default)
    ANNUAL = "annual"          # Once per year


class Company(Base):
    """Company/business entity model."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Brønnøysund data
    org_number: Mapped[str] = mapped_column(String(9), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))

    # Address
    street_address: Mapped[str | None] = mapped_column(String(255))
    postal_code: Mapped[str | None] = mapped_column(String(10))
    city: Mapped[str | None] = mapped_column(String(100))

    # Industry
    industry_code: Mapped[str | None] = mapped_column(String(10))  # NACE code
    industry_description: Mapped[str | None] = mapped_column(String(255))

    # MVA status
    mva_registered: Mapped[bool] = mapped_column(Boolean, default=False)
    mva_period: Mapped[MVAPeriod] = mapped_column(
        SQLEnum(MVAPeriod), default=MVAPeriod.BIMONTHLY
    )

    # Ciri settings
    autonomy_level: Mapped[AutonomyLevel] = mapped_column(
        SQLEnum(AutonomyLevel), default=AutonomyLevel.ASSISTANT
    )

    # Email integration
    bilag_email: Mapped[str | None] = mapped_column(String(255))
    email_integration_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Notification settings
    notification_email: Mapped[str | None] = mapped_column(String(255))
    notification_day: Mapped[int] = mapped_column(Integer, default=1)  # 0=Mon..6=Sun
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Encryption
    encryption_key_id: Mapped[str | None] = mapped_column(String(255))

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="company")
    email_connections: Mapped[list["EmailConnection"]] = relationship(back_populates="company")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<Company {self.org_number}: {self.name}>"
