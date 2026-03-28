"""
Employee Model
Represents an employee in the payroll system
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from config.database import Base
from models.mixins import RetentionMixin


class EmploymentType(str, Enum):
    FAST = "fast"  # Full-time permanent
    DELTID = "deltid"  # Part-time
    VIKAR = "vikar"  # Temporary/substitute
    LAERLING = "laerling"  # Apprentice


class EmployeeStatus(str, Enum):
    ACTIVE = "active"
    VACATION = "vacation"
    SICK_LEAVE = "sick_leave"
    PARENTAL_LEAVE = "parental_leave"
    TERMINATED = "terminated"


class Employee(RetentionMixin, Base):
    """Employee model for payroll management."""

    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Company relationship
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )

    # Personal information (encrypted in production)
    personnummer: Mapped[str] = mapped_column(String(11), nullable=False)  # Norwegian national ID
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(20))

    # Employment details
    position: Mapped[str] = mapped_column(String(200), nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(
        SQLEnum(EmploymentType), default=EmploymentType.FAST
    )
    status: Mapped[EmployeeStatus] = mapped_column(
        SQLEnum(EmployeeStatus), default=EmployeeStatus.ACTIVE
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)  # Null if still employed

    # Salary information
    monthly_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))  # For hourly workers
    pay_day: Mapped[int] = mapped_column(Integer, default=15)  # Day of month salary is paid (1-28)

    # Tax information (from Skatteetaten)
    tax_table: Mapped[str | None] = mapped_column(String(10))  # e.g., "7100"
    tax_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))  # e.g., 34.00
    tax_card_type: Mapped[str | None] = mapped_column(String(50))  # "tabelltrekk" or "prosenttrekk"
    tax_municipality: Mapped[str | None] = mapped_column(String(4))  # Municipality code
    frikort_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))  # Free card amount
    tax_card_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Bank account (encrypted in production)
    bank_account: Mapped[str | None] = mapped_column(String(11))  # Norwegian format

    # Vacation
    vacation_days_total: Mapped[int] = mapped_column(Integer, default=25)
    vacation_days_used: Mapped[int] = mapped_column(Integer, default=0)
    vacation_days_transferred: Mapped[int] = mapped_column(Integer, default=0)

    # Feriepenger (holiday pay)
    feriepenger_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=12.0)
    feriepenger_accrued: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    # Pension (OTP)
    otp_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=2.0)
    otp_provider: Mapped[str | None] = mapped_column(String(100))

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )

    # Avatar
    avatar_s3_key: Mapped[str | None] = mapped_column(String(500))  # S3 key for profile picture

    # Notes (internal)
    notes: Mapped[str | None] = mapped_column(Text)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def net_salary(self) -> Decimal:
        """Calculate approximate net salary after tax."""
        if self.tax_percentage:
            return self.monthly_salary * (1 - self.tax_percentage / 100)
        return self.monthly_salary * Decimal("0.70")  # Assume 30% if unknown

    @property
    def employer_cost(self) -> Decimal:
        """Calculate total employer cost including contributions."""
        arbeidsgiveravgift = self.monthly_salary * Decimal("0.141")  # 14.1%
        otp = self.monthly_salary * (self.otp_percentage / 100)
        return self.monthly_salary + arbeidsgiveravgift + otp

    @property
    def vacation_days_remaining(self) -> int:
        return self.vacation_days_total + self.vacation_days_transferred - self.vacation_days_used

    def __repr__(self):
        return f"<Employee {self.full_name} ({self.personnummer[:6]}...)>"


class Payslip(RetentionMixin, Base):
    """Individual payslip record."""

    __tablename__ = "payslips"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )

    # Period
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-12

    # Amounts
    gross_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_deduction: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    other_deductions: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Employer costs
    arbeidsgiveravgift: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    otp_contribution: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    feriepenger_accrual: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Status
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payment_reference: Mapped[str | None] = mapped_column(String(50))

    # A-melding
    amelding_submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    amelding_reference: Mapped[str | None] = mapped_column(String(50))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    employee: Mapped["Employee"] = relationship(backref="payslips")
