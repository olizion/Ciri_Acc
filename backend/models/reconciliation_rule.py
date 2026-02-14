"""
Reconciliation Rule Model
User-created and AI-learned rules for automatic reconciliation
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base


class RuleType(str, Enum):
    """Type of reconciliation rule."""
    AUTO_MATCH = "auto_match"      # Automatically match to bilag
    AUTO_CATEGORY = "auto_category"  # Automatically categorize
    IGNORE = "ignore"              # Ignore/mark as private
    SPLIT = "split"                # Split transaction


class RulePriority(str, Enum):
    """Rule priority for conflict resolution."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReconciliationRule(Base):
    """
    Reconciliation rule model.

    Rules for automatic transaction handling.
    Can be user-created or learned from user corrections.
    """

    __tablename__ = "reconciliation_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Rule identification
    name: Mapped[str] = mapped_column(String(100))  # User-friendly name
    description: Mapped[str | None] = mapped_column(Text)

    # Rule type and priority
    rule_type: Mapped[RuleType] = mapped_column(SQLEnum(RuleType))
    priority: Mapped[RulePriority] = mapped_column(
        SQLEnum(RulePriority), default=RulePriority.MEDIUM
    )

    # Matching criteria
    criteria: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Example criteria:
    # {
    #   "description_contains": "SPOTIFY",
    #   "description_regex": "SPOTIFY.*AB",
    #   "amount_min": 99,
    #   "amount_max": 199,
    #   "amount_exact": 119,
    #   "merchant_name": "Spotify",
    #   "direction": "debit",
    #   "bank_account_id": "uuid"
    # }

    # Action to take when criteria match
    action: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Example actions:
    # For AUTO_CATEGORY:
    # {
    #   "category": "kontor",
    #   "account": "6540",
    #   "mva_code": "1"
    # }
    # For IGNORE:
    # {
    #   "mark_private": true,
    #   "reason": "Personlig abonnement"
    # }
    # For SPLIT:
    # {
    #   "splits": [
    #     {"percentage": 50, "category": "kontor", "account": "6540"},
    #     {"percentage": 50, "category": "privat", "mark_private": true}
    #   ]
    # }

    # Counterparty mapping (for name normalization)
    counterparty_mapping: Mapped[dict | None] = mapped_column(JSONB)
    # Example: {"raw_patterns": ["SPOTIFY AB", "SPOTIFY*"], "normalized_name": "Spotify AB"}

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Learning metadata
    learned_from_user: Mapped[bool] = mapped_column(Boolean, default=False)  # ML-suggested
    source_match_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))  # Original match that created rule
    confidence_threshold: Mapped[float | None] = mapped_column()  # Min confidence for auto-apply

    # Usage statistics
    times_applied: Mapped[int] = mapped_column(default=0)
    last_applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    times_overridden: Mapped[int] = mapped_column(default=0)  # User corrected after apply

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))  # User ID or null for Ciri

    def __repr__(self) -> str:
        return f"<ReconciliationRule {self.name}: {self.rule_type.value}>"

    @property
    def is_effective(self) -> bool:
        """Check if rule should be considered effective (not too many overrides)."""
        if self.times_applied == 0:
            return True
        override_rate = self.times_overridden / self.times_applied
        return override_rate < 0.3  # Less than 30% override rate

    def matches_transaction(self, transaction) -> bool:
        """
        Check if transaction matches rule criteria.

        Args:
            transaction: BankTransaction to check

        Returns:
            True if transaction matches all criteria
        """
        criteria = self.criteria

        # Description contains
        if "description_contains" in criteria:
            pattern = criteria["description_contains"].lower()
            desc = (transaction.raw_description or "").lower()
            if pattern not in desc:
                return False

        # Amount range
        if "amount_min" in criteria:
            if abs(transaction.amount) < criteria["amount_min"]:
                return False
        if "amount_max" in criteria:
            if abs(transaction.amount) > criteria["amount_max"]:
                return False
        if "amount_exact" in criteria:
            if abs(transaction.amount) != criteria["amount_exact"]:
                return False

        # Direction
        if "direction" in criteria:
            if criteria["direction"] == "debit" and transaction.amount >= 0:
                return False
            if criteria["direction"] == "credit" and transaction.amount < 0:
                return False

        # Merchant name
        if "merchant_name" in criteria:
            if transaction.merchant_name != criteria["merchant_name"]:
                return False

        # Bank account
        if "bank_account_id" in criteria:
            if str(transaction.bank_account_id) != criteria["bank_account_id"]:
                return False

        return True

    def apply_action(self, transaction) -> dict:
        """
        Get the action to apply to a matching transaction.

        Returns:
            Dict with action details
        """
        return self.action.copy()

    def record_application(self) -> None:
        """Record that rule was applied."""
        self.times_applied += 1
        self.last_applied_at = datetime.utcnow()

    def record_override(self) -> None:
        """Record that user overrode the rule's result."""
        self.times_overridden += 1
