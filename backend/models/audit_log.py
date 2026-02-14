"""
Audit Log Model
Immutable log of all system actions (Bokføringsloven §4)
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, event
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB

from config.database import Base


class AuditLog(Base):
    """
    Immutable audit log for compliance.

    This table is APPEND-ONLY. Updates and deletes are blocked
    at the application level and should be blocked at the database
    level with appropriate triggers.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Timestamp with timezone (required by Bokføringsloven)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, index=True
    )

    # Actor
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)

    # Action
    action: Mapped[str] = mapped_column(String(50), index=True)
    # Examples: "login", "logout", "create", "update", "delete", "view", "export"

    # Resource
    resource_type: Mapped[str] = mapped_column(String(50), index=True)
    # Examples: "user", "company", "bilag", "postering", "report"

    resource_id: Mapped[str | None] = mapped_column(String(255))

    # Request context
    ip_address: Mapped[str | None] = mapped_column(String(45))  # IPv6 max length
    user_agent: Mapped[str | None] = mapped_column(Text)

    # Details (before/after values, etc.)
    details: Mapped[dict | None] = mapped_column(JSONB)

    # AI flag
    created_by_ciri: Mapped[bool] = mapped_column(default=False)

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} {self.resource_type} at {self.timestamp}>"


# Prevent updates and deletes at ORM level
@event.listens_for(AuditLog, "before_update")
def prevent_update(mapper, connection, target):
    raise ValueError("AuditLog records cannot be updated")


@event.listens_for(AuditLog, "before_delete")
def prevent_delete(mapper, connection, target):
    raise ValueError("AuditLog records cannot be deleted")
