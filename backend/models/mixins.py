"""
Retention Mixin
Adds legal retention tracking to models (Bokforingsloven compliance).
"""

from datetime import date, datetime
from sqlalchemy import Integer, String, Boolean, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column


# Norwegian retention periods (years after end of fiscal year)
RETENTION_YEARS = {
    "regnskap": 5,        # Bokforingsloven §13(1) nr. 1-4
    "lonn": 5,            # Payroll docs — Bokforingsloven §13(1) nr. 3
    "amelding": 5,        # A-melding submissions — Bokforingsloven §13(1) nr. 3
    "mva": 10,            # MVA capital asset docs — Bokforingsforskriften §7-3
    "avtale": 4,          # Contracts — Bokforingsloven §13(1) nr. 5 (3.5yr rounded up)
}


def compute_retention_expiry(fiscal_year: int, category: str) -> date:
    """
    Compute retention expiry date.

    Retention runs from the END of the fiscal year.
    Norwegian fiscal year = calendar year.
    E.g., fiscal_year=2025, category="regnskap" -> expires 2031-01-31
    """
    years = RETENTION_YEARS.get(category, 5)
    # Expire on Jan 31 of the year after the retention period
    # (gives a full month buffer past Dec 31)
    return date(fiscal_year + years + 1, 1, 31)


class RetentionMixin:
    """
    Mixin for models requiring legal retention tracking.

    Norwegian Bokforingsloven requires minimum retention periods.
    GDPR requires deletion when retention expires.
    """

    fiscal_year: Mapped[int | None] = mapped_column(
        Integer, index=True, default=None
    )
    retention_category: Mapped[str | None] = mapped_column(
        String(50), default=None
    )
    retention_expires_at: Mapped[date | None] = mapped_column(
        Date, index=True, default=None
    )
    audit_hold: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    purged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )

    def set_retention(self, fiscal_year: int, category: str) -> None:
        """Set retention metadata. Call this at creation time."""
        self.fiscal_year = fiscal_year
        self.retention_category = category
        self.retention_expires_at = compute_retention_expiry(fiscal_year, category)

    @property
    def is_retention_expired(self) -> bool:
        """Check if retention period has passed (respects audit hold)."""
        if self.audit_hold:
            return False
        if not self.retention_expires_at:
            return False
        return date.today() > self.retention_expires_at

    @property
    def is_purged(self) -> bool:
        return self.purged_at is not None


def _auto_set_postering_retention(mapper, connection, target):
    """
    after_insert listener for Postering: auto-set retention from posting_date.

    Every Postering is a "regnskap" record (Bokføringsloven §13).
    Instead of relying on callers to remember set_retention(), we derive it
    from posting_date which is always set.
    """
    if target.fiscal_year is not None:
        return  # Already set explicitly

    fiscal_year = None
    if hasattr(target, "posting_date") and target.posting_date:
        fiscal_year = target.posting_date.year
    elif hasattr(target, "created_at") and target.created_at:
        fiscal_year = target.created_at.year

    if fiscal_year:
        expiry = compute_retention_expiry(fiscal_year, "regnskap")
        # Use raw UPDATE to avoid triggering Postering's before_update immutability guard
        from models.postering import Postering
        connection.execute(
            Postering.__table__.update()
            .where(Postering.__table__.c.id == target.id)
            .values(
                fiscal_year=fiscal_year,
                retention_category="regnskap",
                retention_expires_at=expiry,
            )
        )


def _warn_missing_retention(mapper, connection, target):
    """
    after_insert listener: warn when a retention-tracked record is created
    without fiscal_year set. This catches missing set_retention() calls.
    """
    import logging
    if isinstance(target, RetentionMixin) and target.fiscal_year is None:
        logger = logging.getLogger("ciri.retention")
        logger.warning(
            f"Retention metadata missing on new {type(target).__name__} "
            f"(id={getattr(target, 'id', '?')}). "
            f"Call set_retention() at creation time."
        )
