"""Database models package."""

from sqlalchemy import event
from models.mixins import RetentionMixin, _warn_missing_retention, _auto_set_postering_retention
from models.user import User
from models.company import Company, AutonomyLevel, MVAPeriod
from models.audit_log import AuditLog
from models.bilag import Bilag, BilagStatus
from models.postering import Postering
from models.konto import Konto, KontoType
from models.employee import Employee, EmploymentType, EmployeeStatus, Payslip
from models.email_connection import EmailConnection, EmailProvider, EmailConnectionStatus
from models.bank_account import BankAccount, BankAccountStatus, BankAggregator
from models.bank_transaction import (
    BankTransaction,
    TransactionDirection,
    ReconciliationStatus,
    TransactionCategory,
)
from models.reconciliation_match import (
    ReconciliationMatch,
    MatchType,
    MatchConfidence,
    MatchStatus,
)
from models.reconciliation_rule import ReconciliationRule, RuleType, RulePriority
from models.cluster_data_point import ClusterDataPoint, DataPointSource
from models.invoice import Invoice, InvoiceStatus
from models.notification import Notification
from models.amelding_submission import AMeldingSubmission, AMeldingType, AMeldingStatus
from models.mva_submission import MVASubmission, MVASubmissionStatus, MVASubmissionType, MVAMeldingskategori
from models.system_user import SystemUser, SystemUserStatus, AuthorizationTrack

__all__ = [
    # Core models
    "User",
    "Company",
    "AutonomyLevel",
    "MVAPeriod",
    "AuditLog",
    "Bilag",
    "BilagStatus",
    "Postering",
    "Konto",
    "KontoType",
    # Employee
    "Employee",
    "EmploymentType",
    "EmployeeStatus",
    "Payslip",
    # Email
    "EmailConnection",
    "EmailProvider",
    "EmailConnectionStatus",
    # Bank reconciliation
    "BankAccount",
    "BankAccountStatus",
    "BankAggregator",
    "BankTransaction",
    "TransactionDirection",
    "ReconciliationStatus",
    "TransactionCategory",
    "ReconciliationMatch",
    "MatchType",
    "MatchConfidence",
    "MatchStatus",
    "ReconciliationRule",
    "RuleType",
    "RulePriority",
    "ClusterDataPoint",
    "DataPointSource",
    # Invoicing
    "Invoice",
    "InvoiceStatus",
    "Notification",
    # A-melding
    "AMeldingSubmission",
    "AMeldingType",
    "AMeldingStatus",
    # MVA
    "MVASubmission",
    "MVASubmissionStatus",
    "MVASubmissionType",
    "MVAMeldingskategori",
    # System User
    "SystemUser",
    "SystemUserStatus",
    "AuthorizationTrack",
]

# ── Register retention listeners for all retention-tracked models ──
# Warns at runtime when set_retention() was not called before insert.
_retention_models = [Bilag, Employee, Payslip, Invoice, BankTransaction, AMeldingSubmission, MVASubmission]
for _model in _retention_models:
    event.listen(_model, "after_insert", _warn_missing_retention)

# Postering gets auto-set retention (derived from posting_date) because
# posteringer are created in many places and callers shouldn't need to remember.
# Uses raw SQL UPDATE to bypass the Postering immutability guard.
event.listen(Postering, "after_insert", _auto_set_postering_retention)
