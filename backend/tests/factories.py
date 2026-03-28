"""
Factory functions for creating test entities with sensible defaults.
All factories return unsaved model instances — caller decides when to flush.
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional


def make_bilag(
    company_id: uuid.UUID,
    *,
    bilag_number: Optional[str] = None,
    document_date: date = date(2026, 1, 15),
    description: str = "Factory bilag",
    total_amount: Decimal = Decimal("1000.00"),
    **overrides,
):
    from models.bilag import Bilag, BilagStatus

    defaults = dict(
        id=uuid.uuid4(),
        company_id=company_id,
        bilag_number=bilag_number or f"FAC-{uuid.uuid4().hex[:6].upper()}",
        document_date=document_date,
        description=description,
        status=BilagStatus.GODKJENT,
        total_amount=total_amount,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Bilag(**defaults)


def make_postering(
    bilag_id: uuid.UUID,
    company_id: uuid.UUID,
    *,
    account_number: str = "1920",
    debit_amount: Decimal = Decimal("1000.00"),
    credit_amount: Decimal = Decimal("0.00"),
    **overrides,
):
    from models.postering import Postering

    defaults = dict(
        id=uuid.uuid4(),
        bilag_id=bilag_id,
        company_id=company_id,
        account_number=account_number,
        description="Factory postering",
        debit_amount=debit_amount,
        credit_amount=credit_amount,
        date=date(2026, 1, 15),
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Postering(**defaults)


def make_bank_transaction(
    company_id: uuid.UUID,
    *,
    amount: Decimal = Decimal("5000.00"),
    description: str = "Factory bank transaction",
    **overrides,
):
    from models.bank_transaction import BankTransaction, TransactionDirection, ReconciliationStatus

    defaults = dict(
        id=uuid.uuid4(),
        company_id=company_id,
        bank_account_id=overrides.pop("bank_account_id", uuid.uuid4()),
        transaction_id=f"TXN-{uuid.uuid4().hex[:8]}",
        amount=amount,
        currency="NOK",
        description=description,
        direction=TransactionDirection.CREDIT,
        booking_date=date(2026, 1, 15),
        value_date=date(2026, 1, 15),
        reconciliation_status=ReconciliationStatus.UNMATCHED,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return BankTransaction(**defaults)


def make_invoice(
    company_id: uuid.UUID,
    *,
    invoice_number: Optional[str] = None,
    total_amount: Decimal = Decimal("12500.00"),
    **overrides,
):
    from models.invoice import Invoice

    defaults = dict(
        id=uuid.uuid4(),
        company_id=company_id,
        invoice_number=invoice_number or f"INV-{uuid.uuid4().hex[:6].upper()}",
        customer_name="Test Kunde AS",
        customer_email="test@kunde.no",
        total_amount=total_amount,
        currency="NOK",
        issue_date=date(2026, 1, 15),
        due_date=date(2026, 2, 15),
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Invoice(**defaults)


def make_periodisering_bilag(
    company_id: uuid.UUID,
    *,
    is_manual: bool = False,
    **overrides,
):
    """Create a bilag with a pre-populated periodisering suggestion."""
    from models.bilag import Bilag, BilagStatus

    net = Decimal("12000.00")
    defaults = dict(
        id=uuid.uuid4(),
        company_id=company_id,
        bilag_number=f"PER-{uuid.uuid4().hex[:6].upper()}",
        document_date=date(2026, 1, 15),
        description="Årlig forsikring Tryg",
        gross_amount=net,
        net_amount=net,
        mva_amount=Decimal("0"),
        mva_code="6",
        counterparty_name="Tryg Forsikring AS",
        category="forsikring",
        suggested_account="7500",
        status=BilagStatus.POSTED,
        created_by_ciri=not is_manual,
        ciri_confidence=0.92 if not is_manual else None,
        periodisering_suggestion={
            "is_candidate": True,
            "confidence": 0.92,
            "reason": "Årlig forsikring dekker 12 måneder",
            "legal_basis": "Regnskapsloven § 4-1 nr. 3 (sammenstillingsprinsippet)",
            "category": "forsikring",
            "total_amount": 12000.0,
            "period_count": 12,
            "start_period": "2026-01",
            "end_period": "2026-12",
            "monthly_amount": 1000.0,
            "remainder": 0.0,
            "expense_account": "7500",
            "balance_account": "1700",
            "direction": "kostnad",
            "dismissed": False,
            "accepted": False,
        },
        periodisering_scanned_at=datetime.now(timezone.utc) if not is_manual else None,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Bilag(**defaults)


def make_manual_bilag(
    company_id: uuid.UUID,
    **overrides,
):
    """Create a manual (non-Ciri) bilag that hasn't been scanned for periodisering."""
    from models.bilag import Bilag, BilagStatus

    defaults = dict(
        id=uuid.uuid4(),
        company_id=company_id,
        bilag_number=f"MAN-{uuid.uuid4().hex[:6].upper()}",
        document_date=date(2026, 3, 1),
        description="Kontorrekvisita Staples",
        gross_amount=Decimal("2500.00"),
        net_amount=Decimal("2000.00"),
        mva_amount=Decimal("500.00"),
        mva_code="1",
        counterparty_name="Staples Norway AS",
        category="kontor",
        suggested_account="6300",
        status=BilagStatus.POSTED,
        created_by_ciri=False,
        periodisering_scanned_at=None,
        periodisering_suggestion=None,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Bilag(**defaults)


def make_employee(
    company_id: uuid.UUID,
    *,
    name: str = "Test Ansatt",
    **overrides,
):
    from models.employee import Employee

    defaults = dict(
        id=uuid.uuid4(),
        company_id=company_id,
        name=name,
        email="test@ansatt.no",
        personal_id="01019012345",
        tax_percentage=Decimal("30.0"),
        monthly_salary=Decimal("45000.00"),
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return Employee(**defaults)
