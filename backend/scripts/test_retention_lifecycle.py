"""
Retention Lifecycle End-to-End Test
====================================

Simulates the full lifecycle:
1. Create fictive company, employees, documents
2. Run a-melding submission flow (draft → submit → accept)
3. Backfill retention metadata
4. Verify retention dates are correct
5. Activate audit hold, verify purge skips held records
6. Deactivate hold, fast-forward retention to expired
7. Run purge cycle, verify PII is anonymized
8. Verify immutable records (postering, audit log) survive purge

Run inside Docker:
    docker-compose exec backend python scripts/test_retention_lifecycle.py
"""

import asyncio
import json
import uuid
import sys
from datetime import datetime, date, timedelta
from decimal import Decimal

# ── Setup ──

async def main():
    from config.database import async_session_maker, init_db, Base, engine
    from models.company import Company
    from models.employee import Employee, EmploymentType, EmployeeStatus, Payslip
    from models.bilag import Bilag, BilagStatus
    from models.postering import Postering
    from models.invoice import Invoice, InvoiceStatus
    from models.bank_account import BankAccount, BankAccountStatus, BankAggregator
    from models.bank_transaction import (
        BankTransaction, TransactionDirection,
        ReconciliationStatus, TransactionCategory,
    )
    from models.amelding_submission import (
        AMeldingSubmission, AMeldingType, AMeldingStatus,
    )
    from models.audit_log import AuditLog
    from models.mixins import compute_retention_expiry
    from services.retention_service import RetentionService
    from sqlalchemy import select, text

    # ── Test IDs ──
    COMPANY_ID = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    EMP1_ID = uuid.uuid4()
    EMP2_ID = uuid.uuid4()
    EMP3_ID = uuid.uuid4()
    BILAG1_ID = uuid.uuid4()
    BILAG2_ID = uuid.uuid4()
    POST1_ID = uuid.uuid4()
    POST2_ID = uuid.uuid4()
    INV1_ID = uuid.uuid4()
    BANK_ACC_ID = uuid.uuid4()
    TXN1_ID = uuid.uuid4()
    PAYSLIP1_ID = uuid.uuid4()
    PAYSLIP2_ID = uuid.uuid4()
    AMELDING1_ID = uuid.uuid4()
    AMELDING2_ID = uuid.uuid4()

    passed = 0
    failed = 0

    def check(label: str, condition: bool, detail: str = ""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  \033[32m✓\033[0m {label}")
        else:
            failed += 1
            print(f"  \033[31m✗\033[0m {label} — {detail}")

    async with async_session_maker() as db:
        # ══════════════════════════════════════════════════════════════
        # PHASE 1: Create fictive test data
        # ══════════════════════════════════════════════════════════════
        print("\n\033[1m═══ PHASE 1: Creating fictive test data ═══\033[0m\n")

        # Clean up any previous test run
        await db.execute(text(
            "DELETE FROM amelding_submissions WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM posteringer WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM bank_transactions WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM bank_accounts WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM bilag WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM payslips WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM invoices WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM employees WHERE company_id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.execute(text(
            "DELETE FROM companies WHERE id = :cid"
        ), {"cid": str(COMPANY_ID)})
        await db.flush()

        # ── Company ──
        company = Company(
            id=COMPANY_ID,
            org_number="912345678",
            name="Testfirma Retention AS",
            street_address="Testveien 42",
            postal_code="0150",
            city="Oslo",
            mva_registered=True,
            audit_hold_active=False,
        )
        db.add(company)
        await db.flush()
        print(f"  Company: {company.name} ({company.org_number})")

        # ── Employees ──
        emp1 = Employee(
            id=EMP1_ID, company_id=COMPANY_ID,
            personnummer="15048512345",
            first_name="Ola", last_name="Nordmann",
            email="ola@testfirma.no", phone="90012345",
            position="Daglig leder",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2018, 1, 15),
            monthly_salary=Decimal("65000"),
            bank_account="12345678901",
            tax_table="7100", tax_percentage=Decimal("34.0"),
            feriepenger_rate=Decimal("12.0"),
        )
        emp2 = Employee(
            id=EMP2_ID, company_id=COMPANY_ID,
            personnummer="22039287654",
            first_name="Kari", last_name="Hansen",
            email="kari@testfirma.no", phone="90054321",
            position="Utvikler",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2020, 8, 1),
            monthly_salary=Decimal("55000"),
            bank_account="98765432109",
            tax_table="7100", tax_percentage=Decimal("30.0"),
            feriepenger_rate=Decimal("12.0"),
        )
        # Terminated employee — should get retention metadata
        emp3 = Employee(
            id=EMP3_ID, company_id=COMPANY_ID,
            personnummer="08059043210",
            first_name="Erik", last_name="Slutta",
            email="erik@testfirma.no", phone="90099999",
            position="Konsulent",
            employment_type=EmploymentType.VIKAR,
            status=EmployeeStatus.TERMINATED,
            start_date=date(2019, 3, 1),
            end_date=date(2020, 6, 30),
            monthly_salary=Decimal("45000"),
            bank_account="11122233344",
            tax_table="7100", tax_percentage=Decimal("28.0"),
            feriepenger_rate=Decimal("10.2"),
        )
        db.add_all([emp1, emp2, emp3])
        await db.flush()
        print(f"  Employees: {emp1.full_name}, {emp2.full_name}, {emp3.full_name}")

        # ── Bilag (vouchers) ──
        bilag1 = Bilag(
            id=BILAG1_ID, company_id=COMPANY_ID,
            bilag_number="TEST-2020-00001",
            document_date=date(2020, 3, 15),
            receipt_date=datetime(2020, 3, 16),
            description="Kontorrekvisita fra Staples",
            gross_amount=Decimal("2500.00"),
            net_amount=Decimal("2000.00"),
            mva_amount=Decimal("500.00"), mva_code="3",
            counterparty_name="Staples Norway AS",
            counterparty_org_number="987654321",
            file_path="2020/bilag_test_001.pdf",
            file_hash_sha256="a" * 64,
            original_filename="kvittering_staples.pdf",
            mime_type="application/pdf",
            status=BilagStatus.POSTED,
        )
        bilag2 = Bilag(
            id=BILAG2_ID, company_id=COMPANY_ID,
            bilag_number="TEST-2020-00002",
            document_date=date(2020, 6, 10),
            receipt_date=datetime(2020, 6, 11),
            description="Serverleie fra DigitalOcean",
            gross_amount=Decimal("1200.00"),
            net_amount=Decimal("960.00"),
            mva_amount=Decimal("240.00"), mva_code="3",
            counterparty_name="DigitalOcean Inc.",
            counterparty_org_number=None,
            file_path="2020/bilag_test_002.pdf",
            file_hash_sha256="b" * 64,
            original_filename="invoice_do_june.pdf",
            mime_type="application/pdf",
            status=BilagStatus.POSTED,
        )
        db.add_all([bilag1, bilag2])
        await db.flush()
        print(f"  Bilag: {bilag1.bilag_number}, {bilag2.bilag_number}")

        # ── Posteringer (journal entries) ──
        post1 = Postering(
            id=POST1_ID, company_id=COMPANY_ID,
            bilag_id=BILAG1_ID,
            journal_id="J-TEST-001",
            posting_date=date(2020, 3, 15),
            period="2020-03",
            account_number="6800",
            description="Kontorrekvisita",
            debit_amount=Decimal("2000.00"),
            credit_amount=Decimal("0"),
            mva_code="3", mva_amount=Decimal("500.00"),
            saft_transaction_id=f"SAFT-TEST-{uuid.uuid4().hex[:8]}",
        )
        post2 = Postering(
            id=POST2_ID, company_id=COMPANY_ID,
            bilag_id=BILAG1_ID,
            journal_id="J-TEST-001",
            posting_date=date(2020, 3, 15),
            period="2020-03",
            account_number="2400",
            description="Leverandørgjeld Staples",
            debit_amount=Decimal("0"),
            credit_amount=Decimal("2500.00"),
            saft_transaction_id=f"SAFT-TEST-{uuid.uuid4().hex[:8]}",
        )
        db.add_all([post1, post2])
        await db.flush()
        print(f"  Posteringer: J-TEST-001 (2 lines)")

        # ── Payslips ──
        payslip1 = Payslip(
            id=PAYSLIP1_ID,
            employee_id=EMP1_ID, company_id=COMPANY_ID,
            year=2020, month=3,
            gross_salary=Decimal("65000"),
            tax_deduction=Decimal("22100"),
            net_salary=Decimal("42900"),
            arbeidsgiveravgift=Decimal("9165"),
            otp_contribution=Decimal("1300"),
            feriepenger_accrual=Decimal("7800"),
            paid_at=datetime(2020, 3, 25),
            payment_reference="LONN-2020-03-NOR",
        )
        payslip2 = Payslip(
            id=PAYSLIP2_ID,
            employee_id=EMP2_ID, company_id=COMPANY_ID,
            year=2020, month=3,
            gross_salary=Decimal("55000"),
            tax_deduction=Decimal("16500"),
            net_salary=Decimal("38500"),
            arbeidsgiveravgift=Decimal("7755"),
            otp_contribution=Decimal("1100"),
            feriepenger_accrual=Decimal("6600"),
            paid_at=datetime(2020, 3, 25),
            payment_reference="LONN-2020-03-HAN",
        )
        db.add_all([payslip1, payslip2])
        await db.flush()
        print(f"  Payslips: March 2020 for Ola + Kari")

        # ── Invoice ──
        inv1 = Invoice(
            id=INV1_ID, company_id=COMPANY_ID,
            invoice_number="TEST-F-0001",
            customer_name="Equinor ASA",
            customer_email="faktura@equinor.com",
            description="Konsulentbistand Q1 2020",
            amount=Decimal("95000"),
            mva_rate=25,
            mva_amount=Decimal("23750"),
            total_amount=Decimal("118750"),
            due_date=date(2020, 4, 15),
            bank_account="12340012345",
            kid_number="000012345678903",
            status=InvoiceStatus.PAID,
            paid_at=datetime(2020, 4, 10),
        )
        db.add(inv1)
        await db.flush()
        print(f"  Invoice: {inv1.invoice_number} to {inv1.customer_name}")

        # ── Bank account + transaction ──
        bank_acc = BankAccount(
            id=BANK_ACC_ID, company_id=COMPANY_ID,
            account_number="12345678901",
            account_name="Driftskonto",
            bank_name="DNB",
            aggregator=BankAggregator.MANUAL,
            status=BankAccountStatus.ACTIVE,
            current_balance=Decimal("250000.00"),
        )
        db.add(bank_acc)
        await db.flush()

        txn1 = BankTransaction(
            id=TXN1_ID, company_id=COMPANY_ID,
            bank_account_id=BANK_ACC_ID,
            external_transaction_id="TEST-TXN-001",
            booking_date=date(2020, 3, 16),
            amount=Decimal("-2500.00"),
            direction=TransactionDirection.DEBIT,
            raw_description="STAPLES NORWAY AS *OSLO",
            cleaned_description="Staples Norway - Kontorrekvisita",
            merchant_name="Staples Norway AS",
            category=TransactionCategory.KONTOR,
            reconciliation_status=ReconciliationStatus.MATCHED,
        )
        db.add(txn1)
        await db.flush()
        print(f"  Bank transaction: {txn1.raw_description}")

        check("All test data created", True)

        # ══════════════════════════════════════════════════════════════
        # PHASE 2: A-melding submission flow
        # ══════════════════════════════════════════════════════════════
        print("\n\033[1m═══ PHASE 2: A-melding submission flow ═══\033[0m\n")

        # Step 1: Create draft
        amelding1 = AMeldingSubmission(
            id=AMELDING1_ID, company_id=COMPANY_ID,
            period_year=2020, period_month=3,
            submission_type=AMeldingType.ORDINARY,
            status=AMeldingStatus.DRAFT,
            employee_count=2,
            total_gross_salary=Decimal("120000"),
            total_tax_deduction=Decimal("38600"),
            total_employer_contributions=Decimal("16920"),
            payload_json={
                "inntektsaar": 2020,
                "kalendermnd": "2020-03",
                "opplysningspliktig": {
                    "organisasjonsnummer": "912345678",
                    "virksomhet": "Testfirma Retention AS"
                },
                "inntektsmottaker": [
                    {
                        "personnummer": "15048512345",
                        "navn": "Ola Nordmann",
                        "loennsinntekt": 65000,
                        "forskuddstrekk": 22100,
                        "arbeidsgiveravgift": 9165,
                    },
                    {
                        "personnummer": "22039287654",
                        "navn": "Kari Hansen",
                        "loennsinntekt": 55000,
                        "forskuddstrekk": 16500,
                        "arbeidsgiveravgift": 7755,
                    },
                ],
            },
            submitted_by_ciri=True,
        )
        # Set retention at creation
        amelding1.set_retention(2020, "amelding")
        amelding1.payload_hash_sha256 = amelding1.compute_payload_hash()

        db.add(amelding1)
        await db.flush()

        check("A-melding draft created", amelding1.status == AMeldingStatus.DRAFT)
        check(
            "Payload hash computed",
            len(amelding1.payload_hash_sha256) == 64,
            f"Got {len(amelding1.payload_hash_sha256 or '')}"
        )
        check(
            "Retention set to 2020 + 5yr",
            amelding1.retention_expires_at == date(2026, 1, 31),
            f"Got {amelding1.retention_expires_at}"
        )

        # Step 2: Submit to Altinn (simulated)
        amelding1.status = AMeldingStatus.SUBMITTED
        amelding1.submitted_at = datetime(2020, 4, 5, 9, 0, 0)
        amelding1.submission_reference = "AR-TEST-2020-03-001"
        await db.flush()
        check("A-melding submitted", amelding1.status == AMeldingStatus.SUBMITTED)

        # Step 3: Accepted by Skatteetaten (simulated)
        amelding1.status = AMeldingStatus.ACCEPTED
        amelding1.altinn_receipt_id = "ALTINN-RECEIPT-TEST-12345"
        amelding1.altinn_receipt_data = {
            "mottatt": "2020-04-05T09:05:00Z",
            "status": "godkjent",
            "meldingsId": "MSG-TEST-12345",
        }
        await db.flush()
        check("A-melding accepted", amelding1.status == AMeldingStatus.ACCEPTED)

        # Step 4: Create a correction a-melding
        amelding2 = AMeldingSubmission(
            id=AMELDING2_ID, company_id=COMPANY_ID,
            period_year=2020, period_month=3,
            submission_type=AMeldingType.REPLACEMENT,
            replaces_id=AMELDING1_ID,
            status=AMeldingStatus.ACCEPTED,
            employee_count=2,
            total_gross_salary=Decimal("121000"),  # Corrected amount
            total_tax_deduction=Decimal("38900"),
            total_employer_contributions=Decimal("17061"),
            payload_json={
                "inntektsaar": 2020,
                "kalendermnd": "2020-03",
                "erstatningsmelding": True,
                "erstatter_referanse": "AR-TEST-2020-03-001",
                "inntektsmottaker": [
                    {"personnummer": "15048512345", "loennsinntekt": 66000},
                    {"personnummer": "22039287654", "loennsinntekt": 55000},
                ],
            },
            submitted_at=datetime(2020, 4, 10, 14, 0, 0),
            submitted_by_ciri=False,
            submission_reference="AR-TEST-2020-03-002",
            altinn_receipt_id="ALTINN-RECEIPT-TEST-12346",
        )
        amelding2.set_retention(2020, "amelding")
        amelding2.payload_hash_sha256 = amelding2.compute_payload_hash()
        db.add(amelding2)
        await db.flush()

        check("Correction a-melding created", amelding2.submission_type == AMeldingType.REPLACEMENT)
        check("Links to original", amelding2.replaces_id == AMELDING1_ID)

        # Commit everything before immutability test (which causes rollback)
        await db.commit()

        # Step 5: Verify immutability — try to change payload
        try:
            am_test = await db.get(AMeldingSubmission, AMELDING1_ID)
            am_test.period_year = 2021  # Should be blocked
            await db.flush()
            check("Immutability enforced", False, "Should have raised ValueError")
        except ValueError as e:
            await db.rollback()
            check("Immutability enforced", "kan ikke endres" in str(e))

        # Continue with fresh session after rollback
        async with async_session_maker() as db:

            # ══════════════════════════════════════════════════════════════
            # PHASE 3: Backfill retention metadata
            # ══════════════════════════════════════════════════════════════
            print("\n\033[1m═══ PHASE 3: Backfill retention metadata ═══\033[0m\n")

            service = RetentionService(db)
            counts = await service.backfill_retention_metadata()
            await db.commit()

            print(f"  Backfill results: {counts}")

            # Verify retention on bilag
            bilag = await db.get(Bilag, BILAG1_ID)
            check(
                "Bilag fiscal_year = 2020",
                bilag.fiscal_year == 2020,
                f"Got {bilag.fiscal_year}"
            )
            check(
                "Bilag retention = regnskap (5yr)",
                bilag.retention_category == "regnskap"
            )
            check(
                "Bilag expires 2026-01-31",
                bilag.retention_expires_at == date(2026, 1, 31),
                f"Got {bilag.retention_expires_at}"
            )

            # Verify retention on payslip
            ps = await db.get(Payslip, PAYSLIP1_ID)
            check("Payslip fiscal_year = 2020", ps.fiscal_year == 2020)
            check("Payslip retention = lonn", ps.retention_category == "lonn")

            # Verify terminated employee gets retention
            emp_term = await db.get(Employee, EMP3_ID)
            check(
                "Terminated employee fiscal_year = 2020",
                emp_term.fiscal_year == 2020,
                f"Got {emp_term.fiscal_year}"
            )

            # Active employees should NOT have retention set yet
            emp_active = await db.get(Employee, EMP1_ID)
            check(
                "Active employee has no retention yet",
                emp_active.fiscal_year is None,
                f"Got {emp_active.fiscal_year}"
            )

            # ══════════════════════════════════════════════════════════════
            # PHASE 4: Audit hold test
            # ══════════════════════════════════════════════════════════════
            print("\n\033[1m═══ PHASE 4: Audit hold (Skatteetaten bokettersyn) ═══\033[0m\n")

            # Fast-forward retention to expired for testing
            past_date = date(2020, 1, 1)
            for model, ids in [
                (Bilag, [BILAG1_ID, BILAG2_ID]),
                (Payslip, [PAYSLIP1_ID, PAYSLIP2_ID]),
                (Invoice, [INV1_ID]),
                (BankTransaction, [TXN1_ID]),
            ]:
                for oid in ids:
                    obj = await db.get(model, oid)
                    if obj:
                        obj.fiscal_year = 2015
                        obj.retention_category = "regnskap"
                        obj.retention_expires_at = past_date
            # Terminated employee too
            emp_term = await db.get(Employee, EMP3_ID)
            emp_term.retention_expires_at = past_date
            await db.commit()

            print("  Set all retention to expired (2020-01-01)")

            # Activate audit hold on company
            company = await db.get(Company, COMPANY_ID)
            company.audit_hold_active = True
            company.audit_hold_reason = "Bokettersyn fra Skatteetaten — varsel mottatt 2026-03-20"
            company.audit_hold_activated_at = datetime.utcnow()
            await db.commit()
            print(f"  Audit hold activated: {company.audit_hold_reason}")

            # Run purge — should skip everything
            service = RetentionService(db)
            summary = await service.run_purge_cycle()
            await db.commit()

            check(
                "Purge skipped all records (audit hold)",
                summary["purged"] == 0,
                f"Purged {summary['purged']}"
            )
            check(
                "Company detected as on hold",
                summary["companies_on_hold"] == 1,
                f"Got {summary['companies_on_hold']}"
            )
            skipped = summary["skipped_audit_hold"]
            print(f"  Skipped {skipped} records due to audit hold")

            # Verify PII is still intact
            bilag = await db.get(Bilag, BILAG1_ID)
            check(
                "Bilag PII still intact (audit hold)",
                bilag.counterparty_name == "Staples Norway AS",
                f"Got {bilag.counterparty_name}"
            )

            # ══════════════════════════════════════════════════════════════
            # PHASE 5: Deactivate hold + purge
            # ══════════════════════════════════════════════════════════════
            print("\n\033[1m═══ PHASE 5: Deactivate hold + run purge ═══\033[0m\n")

            company = await db.get(Company, COMPANY_ID)
            company.audit_hold_active = False
            company.audit_hold_reason = None
            await db.commit()
            print("  Audit hold deactivated")

            # Also set a-melding retention to expired
            am1 = await db.get(AMeldingSubmission, AMELDING1_ID)
            am2 = await db.get(AMeldingSubmission, AMELDING2_ID)
            if am1:
                am1.retention_expires_at = past_date
            if am2:
                am2.retention_expires_at = past_date
            await db.commit()

            # Run purge cycle
            service = RetentionService(db)
            summary = await service.run_purge_cycle()
            await db.commit()

            print(f"  Purge results: {summary}")
            check(
                "Records purged > 0",
                summary["purged"] > 0,
                f"Purged {summary['purged']}"
            )

            # ══════════════════════════════════════════════════════════════
            # PHASE 6: Verify purge results
            # ══════════════════════════════════════════════════════════════
            print("\n\033[1m═══ PHASE 6: Verify purge results ═══\033[0m\n")

            # Bilag: counterparty_name should be None, file_path = PURGED
            bilag = await db.get(Bilag, BILAG1_ID)
            check(
                "Bilag counterparty_name purged",
                bilag.counterparty_name is None,
                f"Got '{bilag.counterparty_name}'"
            )
            check(
                "Bilag file_path = PURGED",
                bilag.file_path == "PURGED",
                f"Got '{bilag.file_path}'"
            )
            check(
                "Bilag amounts preserved",
                bilag.gross_amount == Decimal("2500.00"),
                f"Got {bilag.gross_amount}"
            )
            check(
                "Bilag purged_at set",
                bilag.purged_at is not None
            )

            # Employee: personnummer should be PURGED
            emp_term = await db.get(Employee, EMP3_ID)
            check(
                "Terminated employee personnummer purged",
                emp_term.personnummer == "PURGED",
                f"Got '{emp_term.personnummer}'"
            )
            check(
                "Employee name preserved (aggregate data)",
                emp_term.first_name == "Erik",
                f"Got '{emp_term.first_name}'"
            )
            check(
                "Employee bank_account purged",
                emp_term.bank_account is None,
                f"Got '{emp_term.bank_account}'"
            )

            # Invoice: customer PII purged
            inv = await db.get(Invoice, INV1_ID)
            check(
                "Invoice customer_name purged",
                inv.customer_name == "PURGED",
                f"Got '{inv.customer_name}'"
            )
            check(
                "Invoice amount preserved",
                inv.total_amount == Decimal("118750"),
                f"Got {inv.total_amount}"
            )

            # Payslip: payment ref purged, amounts kept
            ps = await db.get(Payslip, PAYSLIP1_ID)
            check(
                "Payslip payment_reference purged",
                ps.payment_reference is None,
                f"Got '{ps.payment_reference}'"
            )
            check(
                "Payslip gross_salary preserved",
                ps.gross_salary == Decimal("65000"),
                f"Got {ps.gross_salary}"
            )

            # BankTransaction: descriptions purged
            txn = await db.get(BankTransaction, TXN1_ID)
            check(
                "BankTransaction raw_description purged",
                txn.raw_description == "PURGED",
                f"Got '{txn.raw_description}'"
            )
            check(
                "BankTransaction amount preserved",
                txn.amount == Decimal("-2500.00"),
                f"Got {txn.amount}"
            )

            # A-melding: payload purged, metadata kept
            am1 = await db.get(AMeldingSubmission, AMELDING1_ID)
            check(
                "A-melding payload_json purged",
                am1.payload_json is None,
                f"Got {type(am1.payload_json)}"
            )
            check(
                "A-melding summary preserved (employee_count)",
                am1.employee_count == 2,
                f"Got {am1.employee_count}"
            )
            check(
                "A-melding reference preserved",
                am1.submission_reference == "AR-TEST-2020-03-001",
                f"Got '{am1.submission_reference}'"
            )
            check(
                "A-melding status preserved",
                am1.status == AMeldingStatus.ACCEPTED
            )

            # ── CRITICAL: Postering immutability survives ──
            post = await db.get(Postering, POST1_ID)
            check(
                "Postering survives purge (immutable)",
                post is not None and post.debit_amount == Decimal("2000.00"),
                "Postering was deleted or modified!"
            )
            check(
                "Postering description intact",
                post.description == "Kontorrekvisita"
            )

            # ── Audit log recorded the purge ──
            result = await db.execute(
                select(AuditLog).where(AuditLog.action == "retention_purge").order_by(
                    AuditLog.timestamp.desc()
                ).limit(2)
            )
            purge_logs = result.scalars().all()
            check(
                "Audit log recorded purge cycles",
                len(purge_logs) >= 1,
                f"Found {len(purge_logs)} purge log entries"
            )
            if purge_logs:
                check(
                    "Purge log marked as created_by_ciri",
                    purge_logs[0].created_by_ciri is True
                )

            # ══════════════════════════════════════════════════════════════
            # PHASE 7: Cleanup test data
            # ══════════════════════════════════════════════════════════════
            print("\n\033[1m═══ PHASE 7: Cleanup ═══\033[0m\n")

            await db.execute(text(
                "DELETE FROM amelding_submissions WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM posteringer WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM bank_transactions WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM bank_accounts WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM bilag WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM payslips WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM invoices WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM employees WHERE company_id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.execute(text(
                "DELETE FROM companies WHERE id = :cid"
            ), {"cid": str(COMPANY_ID)})
            await db.commit()
            print("  Test data cleaned up")

    # ══════════════════════════════════════════════════════════════
    # RESULTS
    # ══════════════════════════════════════════════════════════════
    print(f"\n\033[1m{'═' * 50}\033[0m")
    total = passed + failed
    if failed == 0:
        print(f"\033[32m  ALL {total} CHECKS PASSED\033[0m")
    else:
        print(f"\033[31m  {failed}/{total} CHECKS FAILED\033[0m")
    print(f"\033[1m{'═' * 50}\033[0m\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
