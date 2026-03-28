"""
End-to-End Audit Trail Test
Verifies that all critical data flows produce proper trails.

Run: docker-compose exec backend python scripts/test_audit_trail.py
"""

import asyncio
import uuid
from datetime import datetime, date, timezone
from decimal import Decimal

# ── Setup ──────────────────────────────────────────────────────────────

async def run_test():
    from config.database import async_session_maker, init_db
    import models  # noqa: F401 — register all models

    await init_db()

    async with async_session_maker() as db:
        print("=" * 70)
        print("AUDIT TRAIL END-TO-END TEST")
        print("=" * 70)

        errors = []
        warnings = []

        # ── Phase 1: Create test company ───────────────────────────────

        from models.company import Company
        from sqlalchemy import select

        company_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        result = await db.execute(select(Company).where(Company.id == company_id))
        company = result.scalar_one_or_none()
        if not company:
            errors.append("FATAL: Default company not found. Run seed_data first.")
            _print_results(errors, warnings)
            return

        print(f"\n[1] Company: {company.name} ({company.org_number})")

        # ── Phase 2: Create a Bilag and verify trail ───────────────────

        from models.bilag import Bilag, BilagStatus

        bilag = Bilag(
            company_id=company_id,
            bilag_number=f"TEST-{datetime.now().strftime('%H%M%S')}",
            document_date=date.today(),
            receipt_date=datetime.now(timezone.utc),
            description="Test bilag for audit trail",
            gross_amount=Decimal("1250.00"),
            net_amount=Decimal("1000.00"),
            mva_amount=Decimal("250.00"),
            mva_code="1",
            counterparty_name="Test Leverandor AS",
            counterparty_org_number="987654321",
            category="kontor",
            suggested_account="6300",
            file_path="/test/path.pdf",
            file_hash_sha256="a" * 64,
            original_filename="test.pdf",
            mime_type="application/pdf",
            status=BilagStatus.PENDING,
            created_by_ciri=True,
        )

        # Test: set_retention called
        bilag.set_retention(fiscal_year=date.today().year, category="regnskap")
        db.add(bilag)
        await db.flush()

        _check(errors, warnings, bilag.created_at is not None, "Bilag.created_at set")
        # Note: datetime.utcnow() produces naive datetimes Python-side, but PostgreSQL
        # stores them as TIMESTAMPTZ. After db.refresh(), they come back with tzinfo.
        await db.refresh(bilag)
        _check(errors, warnings, bilag.created_at.tzinfo is not None, "Bilag.created_at has timezone (after refresh)")
        _check(errors, warnings, bilag.fiscal_year == date.today().year, "Bilag.fiscal_year set")
        _check(errors, warnings, bilag.retention_category == "regnskap", "Bilag.retention_category set")
        _check(errors, warnings, bilag.retention_expires_at is not None, "Bilag.retention_expires_at set")
        _check(errors, warnings, bilag.purged_at is None, "Bilag.purged_at is None (not purged)")
        _check(errors, warnings, bilag.audit_hold is False, "Bilag.audit_hold is False")

        # Check new actor fields exist
        _check(errors, warnings, hasattr(bilag, 'created_by_user'), "Bilag has created_by_user field")
        _check(errors, warnings, hasattr(bilag, 'approved_by'), "Bilag has approved_by field")
        _check(errors, warnings, hasattr(bilag, 'approved_at'), "Bilag has approved_at field")
        _check(errors, warnings, hasattr(bilag, 'posted_by'), "Bilag has posted_by field")

        print(f"\n[2] Bilag created: {bilag.bilag_number}")
        print(f"    Retention: fiscal_year={bilag.fiscal_year}, expires={bilag.retention_expires_at}")

        # ── Phase 3: Create Posteringer and verify trail ───────────────

        from models.postering import Postering

        journal_id = f"J-{bilag.bilag_number}"
        p_debit = Postering(
            company_id=company_id,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=date.today(),
            period=date.today().strftime("%Y-%m"),
            account_number="6300",
            description="Test expense",
            debit_amount=Decimal("1000.00"),
            credit_amount=Decimal("0"),
            mva_code="1",
            mva_amount=Decimal("250.00"),
            saft_transaction_id=f"SAFT-TEST-{datetime.now().strftime('%H%M%S')}-01",
            created_by_ciri=True,
        )
        p_credit = Postering(
            company_id=company_id,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=date.today(),
            period=date.today().strftime("%Y-%m"),
            account_number="2400",
            description="Test leverandorgjeld",
            debit_amount=Decimal("0"),
            credit_amount=Decimal("1000.00"),
            mva_code=None,
            mva_amount=Decimal("0"),
            saft_transaction_id=f"SAFT-TEST-{datetime.now().strftime('%H%M%S')}-02",
            created_by_ciri=True,
        )

        # Test journal validation
        from services.journal_validation import validate_journal_balance
        validate_journal_balance([p_debit, p_credit])
        print(f"\n[3] Journal balance validation: PASS (debit={p_debit.debit_amount}, credit={p_credit.credit_amount})")

        db.add(p_debit)
        db.add(p_credit)
        await db.flush()

        _check(errors, warnings, p_debit.created_at is not None, "Postering.created_at set")
        await db.refresh(p_debit)
        _check(errors, warnings, p_debit.created_at.tzinfo is not None, "Postering.created_at has timezone (after refresh)")
        _check(errors, warnings, hasattr(p_debit, 'created_by_user'), "Postering has created_by_user field")

        # Check auto-retention was set (by the after_insert listener)
        await db.refresh(p_debit)
        _check(errors, warnings, p_debit.fiscal_year is not None, "Postering.fiscal_year auto-set by listener")
        _check(errors, warnings, p_debit.retention_category == "regnskap", "Postering.retention_category auto-set")

        print(f"    Postering retention: fiscal_year={p_debit.fiscal_year}, expires={p_debit.retention_expires_at}")

        # Test immutability
        try:
            p_debit.account_number = "9999"
            await db.flush()
            errors.append("FAIL: Postering update should have raised ValueError")
        except ValueError as e:
            print(f"\n[4] Postering immutability: PASS (blocked: {str(e)[:50]}...)")

        await db.rollback()

        # ── Phase 4: Create Employee and verify trail ──────────────────

        async with async_session_maker() as db2:
            from models.employee import Employee, EmployeeStatus

            emp = Employee(
                company_id=company_id,
                personnummer="12345678901",
                first_name="Test",
                last_name="Testesen",
                position="Tester",
                monthly_salary=Decimal("50000.00"),
                start_date=date(2025, 1, 1),
                status=EmployeeStatus.ACTIVE,
            )
            db2.add(emp)
            await db2.flush()

            _check(errors, warnings, emp.created_at is not None, "Employee.created_at set")
            _check(errors, warnings, emp.created_at.tzinfo is not None, "Employee.created_at has timezone",
                   is_warning=True)  # May be None if migration pending

            print(f"\n[5] Employee created: {emp.full_name}")
            print(f"    Status: {emp.status.value}, created_at: {emp.created_at}")

            # ── Phase 5: Create Invoice and verify trail ───────────────

            from models.invoice import Invoice, InvoiceStatus

            inv = Invoice(
                company_id=company_id,
                invoice_number=f"F-TEST-{datetime.now().strftime('%H%M%S')}",
                customer_name="Kunde AS",
                customer_email="test@kunde.no",
                description="Test faktura",
                amount=Decimal("10000.00"),
                mva_rate=25,
                mva_amount=Decimal("2500.00"),
                total_amount=Decimal("12500.00"),
                due_date=date.today(),
                bank_account="1234.56.78901",
            )
            inv.set_retention(fiscal_year=date.today().year, category="regnskap")
            db2.add(inv)
            await db2.flush()

            _check(errors, warnings, inv.created_at is not None, "Invoice.created_at set")
            _check(errors, warnings, inv.fiscal_year == date.today().year, "Invoice.fiscal_year set")
            _check(errors, warnings, inv.retention_expires_at is not None, "Invoice.retention_expires_at set")
            _check(errors, warnings, hasattr(inv, 'created_by_user'), "Invoice has created_by_user field")
            _check(errors, warnings, hasattr(inv, 'sent_by'), "Invoice has sent_by field")

            print(f"\n[6] Invoice created: {inv.invoice_number}")
            print(f"    Retention: fiscal_year={inv.fiscal_year}, expires={inv.retention_expires_at}")

            # ── Phase 6: Create BankTransaction and verify trail ───────

            from models.bank_transaction import BankTransaction, TransactionDirection, ReconciliationStatus

            # Need a bank account first
            from models.bank_account import BankAccount, BankAccountStatus, BankAggregator
            ba = BankAccount(
                company_id=company_id,
                bank_name="Test Bank",
                account_name="Brukskonto",
                account_number="1234.56.78901",
                status=BankAccountStatus.ACTIVE,
                aggregator=BankAggregator.MANUAL,
            )
            db2.add(ba)
            await db2.flush()

            tx = BankTransaction(
                company_id=company_id,
                bank_account_id=ba.id,
                external_transaction_id=f"TEST-TX-{datetime.now().strftime('%H%M%S')}",
                booking_date=date.today(),
                amount=Decimal("-1250.00"),
                currency="NOK",
                direction=TransactionDirection.DEBIT,
                raw_description="VIPPS*TEST LEVERANDOR",
            )
            tx.set_retention(fiscal_year=date.today().year, category="regnskap")
            db2.add(tx)
            await db2.flush()

            _check(errors, warnings, tx.imported_at is not None, "BankTransaction.imported_at set")
            _check(errors, warnings, tx.fiscal_year == date.today().year, "BankTransaction.fiscal_year set")
            _check(errors, warnings, tx.retention_expires_at is not None, "BankTransaction.retention_expires_at set")
            _check(errors, warnings, hasattr(tx, 'reconciled_by_user'), "BankTransaction has reconciled_by_user field")
            _check(errors, warnings, hasattr(tx, 'private_marked_by_user'), "BankTransaction has private_marked_by_user field")

            print(f"\n[7] BankTransaction created: {tx.amount} {tx.raw_description[:30]}")
            print(f"    Retention: fiscal_year={tx.fiscal_year}, expires={tx.retention_expires_at}")

            # ── Phase 7: Verify AuditLog is immutable ──────────────────

            from models.audit_log import AuditLog

            audit = AuditLog(
                action="test:trail_verification",
                resource_type="system",
                details={"test": True, "timestamp": datetime.now(timezone.utc).isoformat()},
                created_by_ciri=True,
            )
            db2.add(audit)
            await db2.flush()

            try:
                audit.action = "modified"
                await db2.flush()
                errors.append("FAIL: AuditLog update should have raised ValueError")
            except ValueError:
                print(f"\n[8] AuditLog immutability: PASS")

            await db2.rollback()

        # ── Phase 8: Verify RetentionMixin on all required models ──────

        print(f"\n[9] RetentionMixin coverage check:")
        from models.mixins import RetentionMixin
        retention_models = [
            ("Bilag", Bilag),
            ("Postering", Postering),
            ("Employee", Employee),
            ("Invoice", Invoice),
            ("BankTransaction", BankTransaction),
        ]

        try:
            from models.employee import Payslip
            retention_models.append(("Payslip", Payslip))
        except ImportError:
            pass

        try:
            from models.amelding_submission import AMeldingSubmission
            retention_models.append(("AMeldingSubmission", AMeldingSubmission))
        except ImportError:
            pass

        try:
            from models.mva_submission import MVASubmission
            retention_models.append(("MVASubmission", MVASubmission))
        except ImportError:
            pass

        for name, model in retention_models:
            has_mixin = issubclass(model, RetentionMixin)
            _check(errors, warnings, has_mixin, f"  {name} uses RetentionMixin")

        # ── Phase 9: Verify encryption service works ───────────────────

        from services.encryption import encrypt_field, decrypt_field

        test_pnr = "12345678901"
        encrypted = encrypt_field(test_pnr)
        decrypted = decrypt_field(encrypted)
        _check(errors, warnings, encrypted != test_pnr, "PII encryption: value is encrypted")
        _check(errors, warnings, encrypted.startswith("enc:"), "PII encryption: has enc: prefix")
        _check(errors, warnings, decrypted == test_pnr, "PII encryption: round-trip successful")
        _check(errors, warnings, decrypt_field("PURGED") == "PURGED", "PII encryption: PURGED sentinel passes through")
        _check(errors, warnings, decrypt_field(None) is None, "PII encryption: None passes through")

        print(f"\n[10] Encryption service: PASS")

        # ── Results ────────────────────────────────────────────────────

        _print_results(errors, warnings)


def _check(errors, warnings, condition, message, is_warning=False):
    if condition:
        print(f"    OK  {message}")
    elif is_warning:
        warnings.append(message)
        print(f"    WARN  {message}")
    else:
        errors.append(message)
        print(f"    FAIL  {message}")


def _print_results(errors, warnings):
    print("\n" + "=" * 70)
    if errors:
        print(f"RESULT: FAILED — {len(errors)} error(s), {len(warnings)} warning(s)")
        for e in errors:
            print(f"  ERROR: {e}")
    elif warnings:
        print(f"RESULT: PASSED with {len(warnings)} warning(s)")
    else:
        print("RESULT: ALL CHECKS PASSED")
    for w in warnings:
        print(f"  WARNING: {w}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_test())
