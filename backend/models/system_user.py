"""
Altinn System User Model
Tracks per-customer, per-track system user requests and approval status.

Two distinct authorization tracks exist to keep concerns separated:

  LONN  — Skattekort + A-melding (payroll)
           Access: ske-skattekort-til-arbeidsgiver, innrapportering-amelding
           Scopes: skatteetaten:skattekorttilarbeidsgiver, skatteetaten:innrapporteringamelding

  MVA   — MVA-melding (VAT returns)
           Access: Altinn3 MVA app via regnskapsforer-med-signeringsrettighet
           Scopes: skatteetaten:mvameldinginnsending

Each customer org creates ONE request per track. A customer can approve
lønn without MVA (or vice versa), and the missing track surfaces as a
connect-button in the relevant dashboard section.
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base


class AuthorizationTrack(str, Enum):
    """
    Distinct authorization tracks.

    Each track maps to a separate Altinn system user request with its own
    access packages. This prevents a single muddied approval from covering
    unrelated concerns.
    """
    LONN = "lonn"   # Skattekort + A-melding (payroll)
    MVA = "mva"     # MVA-melding (VAT returns)


class SystemUserStatus(str, Enum):
    """Status of an Altinn system user request."""
    NEW = "New"              # Request created, awaiting approval
    ACCEPTED = "Accepted"    # Customer approved
    DENIED = "Denied"        # Customer denied
    REJECTED = "Rejected"    # System rejected (e.g. invalid access package)
    TIMEDOUT = "Timedout"    # Request expired (10 day TTL)


class SystemUser(Base):
    """
    Tracks an Altinn system user delegation for a customer org.

    One row per (customer_org_number, track) combination.

    Flow:
    1. Ciri creates a request via Altinn API → gets confirmUrl
    2. Customer opens confirmUrl, logs in, approves
    3. Status changes to Accepted
    4. Ciri can now request Maskinporten tokens on behalf of customer
       for the scopes associated with that track
    """

    __tablename__ = "system_users"

    # One request per org per track
    __table_args__ = (
        UniqueConstraint(
            "customer_org_number", "track",
            name="uq_system_user_org_track",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Which company this system user is for
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Customer org number (the org that approves the delegation)
    customer_org_number: Mapped[str] = mapped_column(String(9), nullable=False, index=True)

    # Authorization track — which domain this delegation covers
    track: Mapped[AuthorizationTrack] = mapped_column(
        SQLEnum(AuthorizationTrack), nullable=False, index=True
    )

    # Our external reference for this delegation (unique per request)
    external_ref: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)

    # Altinn request tracking
    altinn_request_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    confirm_url: Mapped[str | None] = mapped_column(String(500))

    # Status
    status: Mapped[SystemUserStatus] = mapped_column(
        SQLEnum(SystemUserStatus), default=SystemUserStatus.NEW
    )

    # System user identity (populated after approval, from Maskinporten token response)
    systemuser_id: Mapped[str | None] = mapped_column(String(100))

    # Which system this is for
    system_id: Mapped[str] = mapped_column(String(200), nullable=False)

    # Access packages requested
    access_packages: Mapped[dict | None] = mapped_column(JSONB)

    # Redirect URL used in the request
    redirect_url: Mapped[str | None] = mapped_column(String(500))

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status_message: Mapped[str | None] = mapped_column(Text)

    @property
    def track_label(self) -> str:
        """Human-readable Norwegian label for the track."""
        labels = {
            AuthorizationTrack.LONN: "Lønn (skattekort + A-melding)",
            AuthorizationTrack.MVA: "MVA-melding",
        }
        return labels.get(self.track, self.track.value)

    def __repr__(self) -> str:
        return f"<SystemUser org={self.customer_org_number} track={self.track.value} status={self.status.value}>"
