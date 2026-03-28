"""
A-melding Submission Model
Immutable record of a-melding filings to Skatteetaten via Altinn.

Retention: 5 years (Bokforingsloven §13(1) nr. 3)
"""

import uuid
import hashlib
import json
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Integer, Boolean, DateTime, Date, Numeric, Text, ForeignKey, event
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base
from models.mixins import RetentionMixin


class AMeldingType(str, Enum):
    """Type of a-melding submission."""
    ORDINARY = "ordinary"           # Regular monthly filing
    REPLACEMENT = "replacement"     # Replaces a previous filing
    CORRECTION = "correction"       # Correction to a previous filing
    DELETION = "deletion"           # Deletes a previous filing


class AMeldingStatus(str, Enum):
    """Status of the a-melding submission."""
    DRAFT = "draft"                 # Prepared but not submitted
    SUBMITTED = "submitted"         # Sent to Altinn
    ACCEPTED = "accepted"           # Accepted by Skatteetaten
    REJECTED = "rejected"           # Rejected by Skatteetaten
    PROCESSING = "processing"       # Being processed


class AMeldingSubmission(RetentionMixin, Base):
    """
    Immutable record of an a-melding submission.

    Each filing to Skatteetaten via Altinn is recorded here with
    the full payload for audit trail and compliance purposes.

    This table is APPEND-ONLY. Updates and deletes are blocked.
    """

    __tablename__ = "amelding_submissions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Submission identity
    submission_reference: Mapped[str | None] = mapped_column(
        String(100), unique=True, index=True
    )  # Altinn reference / receipt ID

    # Period
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12

    # Type
    submission_type: Mapped[AMeldingType] = mapped_column(
        SQLEnum(AMeldingType), default=AMeldingType.ORDINARY
    )

    # Replaces previous submission (for corrections)
    replaces_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("amelding_submissions.id")
    )

    # Content snapshot (immutable)
    payload_json: Mapped[dict | None] = mapped_column(JSONB)
    payload_hash_sha256: Mapped[str | None] = mapped_column(String(64))

    # Summary data (kept even after payload purge)
    employee_count: Mapped[int] = mapped_column(Integer, default=0)
    total_gross_salary: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_tax_deduction: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    total_employer_contributions: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)

    # Status tracking
    status: Mapped[AMeldingStatus] = mapped_column(
        SQLEnum(AMeldingStatus), default=AMeldingStatus.DRAFT
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    # Altinn receipt
    altinn_receipt_id: Mapped[str | None] = mapped_column(String(100))
    altinn_receipt_data: Mapped[dict | None] = mapped_column(JSONB)

    # Who submitted
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    submitted_by_ciri: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    def compute_payload_hash(self) -> str:
        """Compute SHA-256 hash of the payload for integrity verification."""
        if self.payload_json is None:
            return ""
        payload_str = json.dumps(self.payload_json, sort_keys=True, default=str)
        return hashlib.sha256(payload_str.encode()).hexdigest()

    def __repr__(self) -> str:
        return f"<AMelding {self.period_year}-{self.period_month:02d} ({self.status.value})>"


# Immutable: block updates and deletes
@event.listens_for(AMeldingSubmission, "before_update")
def _prevent_amelding_update(mapper, connection, target):
    # Allow updates ONLY to retention metadata fields and status
    from sqlalchemy import inspect
    state = inspect(target)
    changed = [attr.key for attr in state.attrs if attr.history.has_changes()]

    # Fields that CAN be updated (status tracking + retention)
    allowed = {
        "status", "rejection_reason", "altinn_receipt_id", "altinn_receipt_data",
        "submitted_at", "submitted_by", "submitted_by_ciri", "submission_reference",
        "fiscal_year", "retention_category", "retention_expires_at",
        "audit_hold", "purged_at", "payload_json", "payload_hash_sha256",
    }
    forbidden = set(changed) - allowed
    if forbidden:
        raise ValueError(
            f"A-melding kan ikke endres etter opprettelse (felt: {forbidden}). "
            "Opprett en erstatningsmelding i stedet."
        )


@event.listens_for(AMeldingSubmission, "before_delete")
def _prevent_amelding_delete(mapper, connection, target):
    raise ValueError(
        "A-melding kan ikke slettes (Bokforingsloven §13). "
    )
