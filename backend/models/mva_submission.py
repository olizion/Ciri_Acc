"""
MVA Submission Model
Immutable record of MVA (VAT) return filings to Skatteetaten via Altinn3.

The MVA melding flow uses Altinn3 Instance API (multi-step):
1. Create instance → 2. Upload metadata XML → 3. Upload MVA XML →
4. Complete filing → 5. Complete confirmation → 6. Poll feedback

Retention: 5 years (Bokforingsloven §13(1) nr. 3)
"""

import uuid
import hashlib
import json
from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Integer, Boolean, DateTime, Numeric, Text, ForeignKey, event
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base
from models.mixins import RetentionMixin


class MVAMeldingskategori(str, Enum):
    """Type of MVA return."""
    ALMINNELIG = "alminnelig"                  # Ordinary VAT return
    PRIMAERNAERING = "primaernaering"          # Primary industry
    KOMPENSASJON = "kompensasjon"              # VAT compensation
    OMVENDT_AVGIFTSPLIKT = "omvendtAvgiftsplikt"  # Reverse charge
    E_HANDEL = "eHandel"                       # E-commerce


class MVASubmissionStatus(str, Enum):
    """Status of the MVA submission through the Altinn3 flow."""
    DRAFT = "draft"                         # Payload prepared locally
    VALIDATED = "validated"                 # Passed Skatteetaten validation API
    VALIDATION_FAILED = "validation_failed" # Failed validation
    INSTANCE_CREATED = "instance_created"   # Altinn3 instance created
    METADATA_UPLOADED = "metadata_uploaded" # MvaMeldingInnsending XML uploaded
    MELDING_UPLOADED = "melding_uploaded"    # MvaMelding XML uploaded
    FILING_COMPLETED = "filing_completed"   # First process/next done
    CONFIRMED = "confirmed"                 # Second process/next done (submitted)
    ACCEPTED = "accepted"                   # Feedback received: accepted
    REJECTED = "rejected"                   # Feedback received: rejected
    ERROR = "error"                         # Unexpected error


class MVASubmissionType(str, Enum):
    """Whether this is an original or corrected filing."""
    ORIGINAL = "original"
    CORRECTION = "correction"


class MVASubmission(RetentionMixin, Base):
    """
    Immutable record of an MVA return submission.

    Tracks the full Altinn3 multi-step flow from creation through
    feedback receipt.
    """

    __tablename__ = "mva_submissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Period
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_description: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g. "januar-februar", "januar-mars", "aarlig"

    # Category
    meldingskategori: Mapped[MVAMeldingskategori] = mapped_column(
        SQLEnum(MVAMeldingskategori), default=MVAMeldingskategori.ALMINNELIG
    )

    # Type
    submission_type: Mapped[MVASubmissionType] = mapped_column(
        SQLEnum(MVASubmissionType), default=MVASubmissionType.ORIGINAL
    )

    # Replaces previous submission (for corrections)
    replaces_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mva_submissions.id")
    )

    # XML content snapshots (immutable)
    melding_xml: Mapped[str | None] = mapped_column(Text)      # skattemeldingformerverdiavgift XML
    innsending_xml: Mapped[str | None] = mapped_column(Text)   # mvameldinginnsending XML
    payload_hash_sha256: Mapped[str | None] = mapped_column(String(64))

    # Summary data (kept even after payload purge)
    utgaaende_mva: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)   # Output VAT
    inngaaende_mva: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)  # Input VAT
    fastsatt_merverdiavgift: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)  # Net VAT

    # MVA specification lines snapshot
    spesifikasjonslinjer: Mapped[dict | None] = mapped_column(JSONB)

    # Status tracking
    status: Mapped[MVASubmissionStatus] = mapped_column(
        SQLEnum(MVASubmissionStatus), default=MVASubmissionStatus.DRAFT
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    # Altinn3 instance tracking
    altinn_instance_id: Mapped[str | None] = mapped_column(String(200))  # "{partyId}/{instanceGuid}"
    altinn_instance_url: Mapped[str | None] = mapped_column(String(500))
    altinn_party_id: Mapped[str | None] = mapped_column(String(50))

    # Validation result
    validation_result: Mapped[dict | None] = mapped_column(JSONB)

    # Feedback from Skatteetaten
    feedback_data: Mapped[dict | None] = mapped_column(JSONB)
    kid_number: Mapped[str | None] = mapped_column(String(50))  # Payment reference

    # Who submitted
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    submitted_by_ciri: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    def compute_payload_hash(self) -> str:
        """Compute SHA-256 hash of the melding XML for integrity verification."""
        if self.melding_xml is None:
            return ""
        return hashlib.sha256(self.melding_xml.encode()).hexdigest()

    def __repr__(self) -> str:
        return f"<MVASubmission {self.period_year} {self.period_description} ({self.status.value})>"


# Immutable: block updates and deletes (same pattern as AMeldingSubmission)
@event.listens_for(MVASubmission, "before_update")
def _prevent_mva_update(mapper, connection, target):
    from sqlalchemy import inspect
    state = inspect(target)
    changed = [attr.key for attr in state.attrs if attr.history.has_changes()]

    allowed = {
        "status", "rejection_reason",
        "altinn_instance_id", "altinn_instance_url", "altinn_party_id",
        "validation_result", "feedback_data", "kid_number",
        "submitted_at", "submitted_by", "submitted_by_ciri",
        "fiscal_year", "retention_category", "retention_expires_at",
        "audit_hold", "purged_at",
        "melding_xml", "innsending_xml", "payload_hash_sha256",
    }
    forbidden = set(changed) - allowed
    if forbidden:
        raise ValueError(
            f"MVA-melding kan ikke endres etter opprettelse (felt: {forbidden}). "
            "Opprett en korrigert melding i stedet."
        )


@event.listens_for(MVASubmission, "before_delete")
def _prevent_mva_delete(mapper, connection, target):
    raise ValueError(
        "MVA-melding kan ikke slettes (Bokforingsloven §13)."
    )
