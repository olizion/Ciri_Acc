"""
Notification Model
In-app notifications for user events
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base


class Notification(Base):
    """In-app notification."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), index=True
    )

    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))  # invoice_viewed, invoice_paid, etc.
    reference_id: Mapped[str | None] = mapped_column(String(100))  # Related entity ID

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return f"<Notification {self.type}: {self.title}>"
