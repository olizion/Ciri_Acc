"""
Reconciliation Match Model
Matches between bank transactions and bilags/posterings
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Numeric, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base


class MatchType(str, Enum):
    """Type of reconciliation match."""
    ONE_TO_ONE = "one_to_one"      # One transaction = one bilag
    ONE_TO_MANY = "one_to_many"    # One transaction = multiple bilags (split purchase)
    MANY_TO_ONE = "many_to_one"    # Multiple transactions = one bilag (partial payments)
    PARTIAL = "partial"            # Partial match (amounts don't fully reconcile)


class MatchConfidence(str, Enum):
    """Confidence level of the match."""
    HIGH = "high"       # >90% - Auto-confirm in Assistant/Autonomous
    MEDIUM = "medium"   # 70-90% - Auto-confirm in Autonomous only
    LOW = "low"         # <70% - Always require confirmation


class MatchStatus(str, Enum):
    """Status of the match."""
    SUGGESTED = "suggested"    # Ciri suggested, awaiting confirmation
    CONFIRMED = "confirmed"    # User confirmed
    REJECTED = "rejected"      # User rejected
    AUTO_CONFIRMED = "auto_confirmed"  # Auto-confirmed by Ciri (high confidence)


class ReconciliationMatch(Base):
    """
    Reconciliation match model.

    Links bank transactions to bilags or posterings.
    Supports complex matching scenarios (splits, partial payments).
    """

    __tablename__ = "reconciliation_matches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Link to bank transaction
    bank_transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bank_transactions.id"), index=True
    )

    # Link to bilag (optional - can match to existing bilag)
    bilag_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bilag.id"), index=True
    )

    # Link to postering (optional - for direct posting matches)
    postering_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posteringer.id"), index=True
    )

    # Match type and confidence
    match_type: Mapped[MatchType] = mapped_column(
        SQLEnum(MatchType), default=MatchType.ONE_TO_ONE
    )
    confidence: Mapped[MatchConfidence] = mapped_column(
        SQLEnum(MatchConfidence)
    )
    confidence_score: Mapped[float] = mapped_column(Numeric(5, 4))  # 0.0 - 1.0

    # Match status
    status: Mapped[MatchStatus] = mapped_column(
        SQLEnum(MatchStatus), default=MatchStatus.SUGGESTED
    )

    # Amount matching
    transaction_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    matched_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    difference: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)  # Unreconciled

    # Match factors (what led to this match)
    match_factors: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Example: {
    #   "exact_amount": {"score": 0.35, "matched": true},
    #   "reference_match": {"score": 0.30, "matched": false, "reason": "no KID"},
    #   "name_similarity": {"score": 0.15, "matched": true, "value": 0.87},
    #   "date_proximity": {"score": 0.15, "matched": true, "days": 2},
    #   "historical_pattern": {"score": 0.10, "matched": true}
    # }

    # Ciri's explanation (Norwegian, user-friendly)
    ciri_explanation: Mapped[str | None] = mapped_column(Text)
    # Example: "Beløpet på kr 2 450 matcher faktura fra AWS. Leverandørnavnet stemmer overens."

    # Learning/feedback
    user_feedback: Mapped[str | None] = mapped_column(Text)  # Why user rejected
    learned_rule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reconciliation_rules.id")
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))  # User ID or null for Ciri

    # Relationships
    bank_transaction: Mapped["BankTransaction"] = relationship(back_populates="matches")

    def __repr__(self) -> str:
        return f"<ReconciliationMatch {self.status}: {self.confidence_score:.0%}>"

    @property
    def is_confirmed(self) -> bool:
        """Check if match is confirmed."""
        return self.status in [MatchStatus.CONFIRMED, MatchStatus.AUTO_CONFIRMED]

    @property
    def is_pending(self) -> bool:
        """Check if match needs confirmation."""
        return self.status == MatchStatus.SUGGESTED

    def confirm(self, by_user: uuid.UUID | None = None) -> None:
        """Confirm the match."""
        self.status = MatchStatus.CONFIRMED if by_user else MatchStatus.AUTO_CONFIRMED
        self.confirmed_at = datetime.utcnow()
        self.confirmed_by = by_user

    def reject(self, feedback: str | None = None) -> None:
        """Reject the match with optional feedback."""
        self.status = MatchStatus.REJECTED
        self.user_feedback = feedback
