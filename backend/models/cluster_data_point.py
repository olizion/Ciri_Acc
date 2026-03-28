"""
Cluster Data Point Model
Records each confirmed posting outcome for building success clusters.
Clusters are grouped by (company_id, account_number, category) and used
to assess Ciri's competence for autonomous posting decisions.
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class DataPointSource(str, Enum):
    """How the data point was confirmed."""
    USER_CONFIRMED = "user_confirmed"
    AUTO_CONFIRMED = "auto_confirmed"
    RULE_APPLIED = "rule_applied"
    MANUAL_MATCH = "manual_match"


class ClusterDataPoint(Base):
    """
    A single confirmed posting outcome used for cluster analysis.

    Clusters form from data points sharing the same
    (company_id, account_number, category) grouping key.
    """

    __tablename__ = "cluster_data_points"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    # Cluster grouping key
    account_number: Mapped[str] = mapped_column(String(10))
    category: Mapped[str] = mapped_column(String(50))

    # Transaction snapshot
    merchant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(15, 2))
    direction: Mapped[str] = mapped_column(String(10))  # 'debit' or 'credit'

    # Source tracking
    source: Mapped[DataPointSource] = mapped_column(
        SQLEnum(DataPointSource, values_callable=lambda e: [x.value for x in e]),
        default=DataPointSource.USER_CONFIRMED,
    )
    match_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reconciliation_matches.id"), nullable=True
    )
    rule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reconciliation_rules.id"), nullable=True
    )
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bank_transactions.id"), nullable=True
    )

    # Lifecycle
    confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    was_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    overridden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Actor tracking
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )  # User who confirmed, or null for Ciri
    overridden_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )  # User who overrode the prediction
