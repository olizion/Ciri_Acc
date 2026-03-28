"""
Comprehensive Backend Integration Test
Tests real data flows through the API and verifies audit trails,
retention metadata, GDPR compliance, and data interactions.

Run: docker-compose exec backend python scripts/test_integration.py
"""

import asyncio
import uuid
import json
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal

COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DNB_ACCOUNT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")

errors = []
warnings = []
passed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  \033[32mOK\033[0m   {msg}")


def fail(msg):
    errors.append(msg)
    print(f"  \033[31mFAIL\033[0m {msg}")


def warn(msg):
    warnings.append(msg)
    print(f"  \033[33mWARN\033[0m {msg}")


def check(condition, msg):
    if condition:
        ok(msg)
    else:
        fail(msg)


async def run():
    from config.database import async_session_maker, init_db
    from sqlalchemy import select, func, text, and_
    import models  # noqa

    await init_db()

    print("=" * 72)
    print("  CIRI BACKEND INTEGRATION TEST")
    print("  Testing data flows, trails, retention, and GDPR compliance")
    print("=" * 72)

    # ================================================================
    # FLOW 1: Bilag lifecycle — upload → approve → post → pay
    # ================================================================
    print("\n\033[1m[FLOW 1] Bilag Lifecycle\033[0m")

    async with async_session_maker() as db:
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering
        from models.audit_log import AuditLog

        # 1a. Find a PENDING bilag from seed data
        result = await db.execute(
            select(Bilag)
            .where(and_(Bilag.company_id == COMPANY_ID, Bilag.status == BilagStatus.PENDING))
            .limit(1)
        )
        pending = result.scalar_one_or_none()

        if pending:
            check(pending.created_at is not None, "Pending bilag has created_at")
            check(pending.fiscal_year is not None, f"Pending bilag has fiscal_year={pending.fiscal_year}")
            check(pending.retention_expires_at is not None, f"Retention expires={pending.retention_expires_at}")
            check(pending.retention_category == "regnskap", f"Category={pending.retention_category}")
            check(pending.purged_at is None, "Not purged")
            check(hasattr(pending, 'created_by_user'), "Has created_by_user field")
            check(hasattr(pending, 'approved_by'), "Has approved_by field")
            check(hasattr(pending, 'approved_at'), "Has approved_at field")
            check(hasattr(pending, 'posted_by'), "Has posted_by field")
        else:
            warn("No PENDING bilag found in seed data")

        # 1b. Find a POSTED bilag and verify posteringer
        result = await db.execute(
            select(Bilag)
            .where(and_(Bilag.company_id == COMPANY_ID, Bilag.status == BilagStatus.POSTED))
            .limit(1)
        )
        posted = result.scalar_one_or_none()

        if posted:
            check(posted.posted_at is not None, f"Posted bilag has posted_at={posted.posted_at}")

            # Verify double-entry posteringer exist
            result = await db.execute(
                select(Postering).where(Postering.bilag_id == posted.id)
            )
            posteringer = result.scalars().all()
            check(len(posteringer) >= 2, f"Posted bilag has {len(posteringer)} posteringer (need ≥2)")

            if posteringer:
                # Verify debit = credit balance
                total_debit = sum(p.debit_amount for p in posteringer)
                total_credit = sum(p.credit_amount for p in posteringer)
                balanced = abs(total_debit - total_credit) <= Decimal("0.01")
                check(balanced, f"Posteringer balanced: debit={total_debit}, credit={total_credit}")

                # Verify postering trail
                p = posteringer[0]
                check(p.created_at is not None, f"Postering has created_at")
                check(p.saft_transaction_id is not None, f"Postering has SAF-T ID={p.saft_transaction_id}")
                check(p.bilag_id == posted.id, "Postering→Bilag FK intact (two-way audit trail §6)")
                check(p.company_id == COMPANY_ID, "Postering has company_id")
                check(p.journal_id is not None, "Postering has journal_id")
                check(p.period is not None, f"Postering has period={p.period}")
                check(hasattr(p, 'created_by_user'), "Postering has created_by_user field")

                # Verify postering retention
                check(p.fiscal_year is not None, f"Postering fiscal_year={p.fiscal_year}")
                check(p.retention_category == "regnskap", "Postering retention_category=regnskap")
        else:
            warn("No POSTED bilag found in seed data")

    # ================================================================
    # FLOW 2: Bank → Reconciliation → Match → Rule
    # ================================================================
    print("\n\033[1m[FLOW 2] Bank Reconciliation Pipeline\033[0m")

    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, ReconciliationStatus
        from models.reconciliation_match import ReconciliationMatch, MatchStatus
        from models.reconciliation_rule import ReconciliationRule
        from models.cluster_data_point import ClusterDataPoint

        # 2a. Verify bank transactions exist with proper trails
        result = await db.execute(
            select(func.count(BankTransaction.id))
            .where(BankTransaction.company_id == COMPANY_ID)
        )
        tx_count = result.scalar()
        check(tx_count > 0, f"Bank transactions seeded: {tx_count}")

        # Check a sample transaction
        result = await db.execute(
            select(BankTransaction)
            .where(BankTransaction.company_id == COMPANY_ID)
            .limit(1)
        )
        tx = result.scalar_one_or_none()
        if tx:
            check(tx.imported_at is not None, "Transaction has imported_at")
            check(tx.booking_date is not None, "Transaction has booking_date")
            check(tx.raw_description is not None, "Transaction has raw_description")
            check(tx.direction is not None, "Transaction has direction")
            check(hasattr(tx, 'reconciled_by_user'), "Transaction has reconciled_by_user field")
            check(hasattr(tx, 'private_marked_by_user'), "Transaction has private_marked_by_user field")

            # Verify retention
            if tx.fiscal_year is not None:
                check(tx.retention_expires_at is not None, f"Transaction retention expires={tx.retention_expires_at}")
            else:
                warn(f"Transaction {tx.id} missing fiscal_year (needs backfill)")

        # 2b. Verify matched transactions have proper state
        result = await db.execute(
            select(BankTransaction)
            .where(and_(
                BankTransaction.company_id == COMPANY_ID,
                BankTransaction.reconciliation_status == ReconciliationStatus.MATCHED,
            ))
            .limit(1)
        )
        matched_tx = result.scalar_one_or_none()
        if matched_tx:
            check(matched_tx.reconciled_at is not None, "Matched tx has reconciled_at timestamp")

            # Find the match record
            result = await db.execute(
                select(ReconciliationMatch)
                .where(ReconciliationMatch.bank_transaction_id == matched_tx.id)
                .limit(1)
            )
            match = result.scalar_one_or_none()
            if match:
                check(match.created_at is not None, "Match has created_at")
                check(match.confidence_score is not None, f"Match confidence={match.confidence_score}")
                check(match.bilag_id is not None, "Match references a bilag")
                check(match.status in (MatchStatus.CONFIRMED, MatchStatus.AUTO_CONFIRMED),
                      f"Match status={match.status.value}")
            else:
                warn("No ReconciliationMatch record for matched transaction")
        else:
            warn("No MATCHED transactions found")

        # 2c. Verify IGNORED (private) transactions
        result = await db.execute(
            select(BankTransaction)
            .where(and_(
                BankTransaction.company_id == COMPANY_ID,
                BankTransaction.is_private == True,
            ))
            .limit(1)
        )
        private_tx = result.scalar_one_or_none()
        if private_tx:
            check(private_tx.private_marked_at is not None, "Private tx has private_marked_at")
            check(private_tx.reconciliation_status == ReconciliationStatus.IGNORED,
                  f"Private tx status={private_tx.reconciliation_status.value}")
        else:
            warn("No private transactions found")

        # 2d. Verify cluster data points exist
        result = await db.execute(
            select(func.count(ClusterDataPoint.id))
            .where(ClusterDataPoint.company_id == COMPANY_ID)
        )
        cluster_count = result.scalar()
        check(cluster_count > 0, f"Cluster data points: {cluster_count}")

        if cluster_count > 0:
            result = await db.execute(
                select(ClusterDataPoint)
                .where(ClusterDataPoint.company_id == COMPANY_ID)
                .limit(1)
            )
            cdp = result.scalar_one_or_none()
            if cdp:
                check(cdp.confirmed_at is not None, "Cluster point has confirmed_at")
                check(cdp.account_number is not None, f"Cluster key: account={cdp.account_number}")
                check(cdp.category is not None, f"Cluster key: category={cdp.category}")
                check(cdp.source is not None, f"Cluster source={cdp.source.value}")
                check(hasattr(cdp, 'confirmed_by'), "Cluster point has confirmed_by field")

        # 2e. Verify reconciliation rules
        result = await db.execute(
            select(func.count(ReconciliationRule.id))
            .where(ReconciliationRule.company_id == COMPANY_ID)
        )
        rule_count = result.scalar()
        if rule_count > 0:
            ok(f"Reconciliation rules: {rule_count}")
            result = await db.execute(
                select(ReconciliationRule)
                .where(ReconciliationRule.company_id == COMPANY_ID)
                .limit(1)
            )
            rule = result.scalar_one_or_none()
            if rule:
                check(rule.created_at is not None, "Rule has created_at")
                check(rule.is_active is not None, f"Rule is_active={rule.is_active}")
                check(rule.times_applied is not None, f"Rule times_applied={rule.times_applied}")
                check(rule.times_overridden is not None, f"Rule times_overridden={rule.times_overridden}")
                check(hasattr(rule, 'created_by'), "Rule has created_by field")
        else:
            warn("No reconciliation rules found (expected — users create these)")

    # ================================================================
    # FLOW 3: Employee → Payslip → A-melding chain
    # ================================================================
    print("\n\033[1m[FLOW 3] Employee → Payslip → A-melding\033[0m")

    async with async_session_maker() as db:
        from models.employee import Employee, EmployeeStatus, Payslip

        # 3a. Verify employees
        result = await db.execute(
            select(Employee)
            .where(Employee.company_id == COMPANY_ID)
        )
        employees = result.scalars().all()
        check(len(employees) > 0, f"Employees seeded: {len(employees)}")

        if employees:
            emp = employees[0]
            check(emp.personnummer is not None, "Employee has personnummer")
            check(len(emp.personnummer) == 11, f"Personnummer is 11 digits: {emp.personnummer[:6]}...")
            check(emp.created_at is not None, "Employee has created_at")
            check(emp.monthly_salary > 0, f"Employee salary={emp.monthly_salary}")
            check(emp.start_date is not None, "Employee has start_date")
            check(emp.status == EmployeeStatus.ACTIVE, f"Employee status={emp.status.value}")

            # GDPR check: personnummer should ideally be encrypted
            from services.encryption import is_encrypted
            if is_encrypted(emp.personnummer):
                ok("Personnummer is encrypted at rest")
            else:
                warn("Personnummer stored in PLAINTEXT — encrypt_field() not yet wired into model")

        # 3b. Verify payslips
        result = await db.execute(
            select(Payslip)
            .where(Payslip.company_id == COMPANY_ID)
        )
        payslips = result.scalars().all()
        check(len(payslips) > 0, f"Payslips seeded: {len(payslips)}")

        if payslips:
            ps = payslips[0]
            check(ps.gross_salary > 0, f"Payslip gross_salary={ps.gross_salary}")
            check(ps.tax_deduction >= 0, f"Payslip tax_deduction={ps.tax_deduction}")
            check(ps.net_salary > 0, f"Payslip net_salary={ps.net_salary}")
            check(ps.year > 0, f"Payslip year={ps.year}")
            check(1 <= ps.month <= 12, f"Payslip month={ps.month}")
            check(ps.created_at is not None, "Payslip has created_at")

            # Payslip retention
            if ps.fiscal_year is not None:
                check(ps.retention_category == "lonn", f"Payslip retention={ps.retention_category}")
            else:
                warn("Payslip missing fiscal_year (needs backfill)")

        # 3c. Verify A-melding submissions if any
        from models.amelding_submission import AMeldingSubmission
        result = await db.execute(
            select(func.count(AMeldingSubmission.id))
            .where(AMeldingSubmission.company_id == COMPANY_ID)
        )
        am_count = result.scalar()
        if am_count > 0:
            ok(f"A-melding submissions: {am_count}")
        else:
            warn("No A-melding submissions found (expected — requires Maskinporten)")

    # ================================================================
    # FLOW 4: Invoice lifecycle
    # ================================================================
    print("\n\033[1m[FLOW 4] Invoice Lifecycle\033[0m")

    async with async_session_maker() as db:
        from models.invoice import Invoice, InvoiceStatus

        result = await db.execute(
            select(Invoice).where(Invoice.company_id == COMPANY_ID)
        )
        invoices = result.scalars().all()
        check(len(invoices) > 0, f"Invoices seeded: {len(invoices)}")

        statuses = {inv.status.value for inv in invoices}
        check("sent" in statuses or "paid" in statuses, f"Invoice statuses present: {statuses}")

        for inv in invoices:
            check(inv.view_token is not None, f"Invoice {inv.invoice_number} has view_token")
            check(inv.created_at is not None, f"Invoice {inv.invoice_number} has created_at")
            check(hasattr(inv, 'created_by_user'), f"Invoice has created_by_user field")
            check(hasattr(inv, 'sent_by'), f"Invoice has sent_by field")

            if inv.status == InvoiceStatus.SENT:
                check(inv.sent_at is not None, f"SENT invoice has sent_at")
            if inv.status == InvoiceStatus.PAID:
                check(inv.paid_at is not None, f"PAID invoice has paid_at")

            # Invoice retention
            if inv.fiscal_year is not None:
                check(inv.retention_expires_at is not None, f"Invoice retention set")
            else:
                warn(f"Invoice {inv.invoice_number} missing fiscal_year")
            break  # Only check first thoroughly

    # ================================================================
    # FLOW 5: Audit trail completeness
    # ================================================================
    print("\n\033[1m[FLOW 5] Audit Trail Verification\033[0m")

    async with async_session_maker() as db:
        from models.audit_log import AuditLog

        result = await db.execute(
            select(func.count(AuditLog.id))
        )
        total_logs = result.scalar()
        check(total_logs > 0, f"Audit log entries: {total_logs}")

        # Check for domain-level events
        result = await db.execute(
            select(AuditLog.action, func.count(AuditLog.id))
            .group_by(AuditLog.action)
        )
        actions = {row[0]: row[1] for row in result.all()}

        print(f"  Audit actions found: {json.dumps(actions, indent=4, default=str)}")

        # Verify immutability
        result = await db.execute(select(AuditLog).limit(1))
        log = result.scalar_one_or_none()
        if log:
            try:
                log.action = "tampered"
                await db.flush()
                fail("AuditLog update should have been blocked")
            except ValueError:
                ok("AuditLog immutability enforced (before_update blocks)")
            await db.rollback()

    # ================================================================
    # FLOW 6: Retention & GDPR compliance
    # ================================================================
    print("\n\033[1m[FLOW 6] Retention & GDPR Compliance\033[0m")

    async with async_session_maker() as db:
        from models.company import Company
        from models.bilag import Bilag
        from models.postering import Postering
        from models.employee import Employee, Payslip
        from models.invoice import Invoice
        from models.bank_transaction import BankTransaction

        # 6a. Verify company audit hold fields
        result = await db.execute(select(Company).where(Company.id == COMPANY_ID))
        company = result.scalar_one()
        check(hasattr(company, 'audit_hold_active'), "Company has audit_hold_active")
        check(hasattr(company, 'audit_hold_reason'), "Company has audit_hold_reason")
        check(hasattr(company, 'audit_hold_activated_at'), "Company has audit_hold_activated_at")
        check(company.audit_hold_active is False, "Audit hold is OFF (normal state)")

        # 6b. Verify retention coverage across all models
        models_to_check = [
            ("Bilag", Bilag, Bilag.company_id == COMPANY_ID),
            ("Postering", Postering, Postering.company_id == COMPANY_ID),
            ("Employee", Employee, Employee.company_id == COMPANY_ID),
            ("Payslip", Payslip, Payslip.company_id == COMPANY_ID),
            ("Invoice", Invoice, Invoice.company_id == COMPANY_ID),
            ("BankTransaction", BankTransaction, BankTransaction.company_id == COMPANY_ID),
        ]

        for name, model, filter_cond in models_to_check:
            total = (await db.execute(
                select(func.count(model.id)).where(filter_cond)
            )).scalar()
            with_retention = (await db.execute(
                select(func.count(model.id)).where(and_(filter_cond, model.fiscal_year != None))
            )).scalar()

            pct = (with_retention / total * 100) if total > 0 else 0
            if pct >= 90:
                ok(f"{name}: {with_retention}/{total} have retention ({pct:.0f}%)")
            elif pct > 0:
                warn(f"{name}: {with_retention}/{total} have retention ({pct:.0f}%) — needs backfill")
            elif total > 0:
                fail(f"{name}: 0/{total} have retention — CRITICAL")
            else:
                ok(f"{name}: no records to check")

        # 6c. Run retention preview (dry-run)
        from services.retention_service import RetentionService
        service = RetentionService(db)
        preview = await service.preview_purge_cycle()
        print(f"\n  Retention preview (dry-run):")
        for model_name, count in preview.get("would_purge", {}).items():
            if count > 0:
                warn(f"  {model_name}: {count} records eligible for purge")
            else:
                ok(f"  {model_name}: 0 eligible for purge (within retention period)")

        # 6d. Verify encryption service
        from services.encryption import encrypt_field, decrypt_field
        test_val = "01019012345"
        enc = encrypt_field(test_val)
        dec = decrypt_field(enc)
        check(enc != test_val, "Encryption produces different output")
        check(dec == test_val, "Decryption returns original")
        check(decrypt_field("PURGED") == "PURGED", "PURGED sentinel passes through decryption")
        check(encrypt_field(None) is None, "None passes through encryption")

    # ================================================================
    # FLOW 7: Postering immutability (Bokforingsloven §6)
    # ================================================================
    print("\n\033[1m[FLOW 7] Postering Immutability (§6)\033[0m")

    async with async_session_maker() as db:
        from models.postering import Postering

        result = await db.execute(
            select(Postering).where(Postering.company_id == COMPANY_ID).limit(1)
        )
        p = result.scalar_one_or_none()

        if p:
            # Test: cannot modify amount
            try:
                p.debit_amount = Decimal("99999.99")
                await db.flush()
                fail("Postering amount update should be blocked (§6)")
            except ValueError:
                ok("Cannot modify Postering.debit_amount (§6 enforced)")
            await db.rollback()

            # Re-fetch after rollback
            result = await db.execute(
                select(Postering).where(Postering.company_id == COMPANY_ID).limit(1)
            )
            p = result.scalar_one_or_none()

            # Test: cannot modify account
            try:
                p.account_number = "9999"
                await db.flush()
                fail("Postering account update should be blocked (§6)")
            except ValueError:
                ok("Cannot modify Postering.account_number (§6 enforced)")
            await db.rollback()

            # Re-fetch after rollback
            result = await db.execute(
                select(Postering).where(Postering.company_id == COMPANY_ID).limit(1)
            )
            p = result.scalar_one_or_none()

            # Test: cannot delete
            try:
                await db.delete(p)
                await db.flush()
                fail("Postering delete should be blocked (§6)")
            except ValueError:
                ok("Cannot delete Postering (§6 enforced)")
            await db.rollback()

            # Test: CAN update retention fields
            result = await db.execute(
                select(Postering).where(Postering.company_id == COMPANY_ID).limit(1)
            )
            p = result.scalar_one_or_none()
            try:
                p.audit_hold = True
                await db.flush()
                ok("Can update Postering.audit_hold (retention field allowed)")
                p.audit_hold = False
                await db.flush()
            except ValueError:
                fail("Retention field update should be allowed on Postering")
            await db.rollback()
        else:
            warn("No posteringer found for immutability test")

    # ================================================================
    # FLOW 8: Cross-model referential integrity
    # ================================================================
    print("\n\033[1m[FLOW 8] Cross-Model Referential Integrity\033[0m")

    async with async_session_maker() as db:
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering
        from models.bank_transaction import BankTransaction
        from models.reconciliation_match import ReconciliationMatch

        # Every posted bilag should have posteringer
        result = await db.execute(
            select(Bilag)
            .where(and_(Bilag.company_id == COMPANY_ID, Bilag.status == BilagStatus.POSTED))
        )
        posted_bilags = result.scalars().all()

        orphan_count = 0
        for b in posted_bilags:
            result = await db.execute(
                select(func.count(Postering.id)).where(Postering.bilag_id == b.id)
            )
            p_count = result.scalar()
            if p_count == 0:
                orphan_count += 1

        if orphan_count == 0:
            ok(f"All {len(posted_bilags)} posted bilags have posteringer (§10 compliant)")
        else:
            fail(f"{orphan_count}/{len(posted_bilags)} posted bilags have NO posteringer (§10 violation)")

        # Every postering should reference a valid bilag (two-way trail §6)
        result = await db.execute(
            select(func.count(Postering.id))
            .where(and_(
                Postering.company_id == COMPANY_ID,
                ~Postering.bilag_id.in_(select(Bilag.id))
            ))
        )
        orphan_posteringer = result.scalar()
        check(orphan_posteringer == 0, f"Orphan posteringer (no bilag): {orphan_posteringer}")

        # Every confirmed match should link a valid transaction + bilag
        result = await db.execute(
            select(ReconciliationMatch)
            .where(and_(
                ReconciliationMatch.company_id == COMPANY_ID,
                ReconciliationMatch.status.in_(["confirmed", "auto_confirmed"]),
            ))
        )
        matches = result.scalars().all()
        broken_matches = 0
        for m in matches:
            if m.bank_transaction_id is None or m.bilag_id is None:
                broken_matches += 1
        check(broken_matches == 0, f"All {len(matches)} confirmed matches have both tx+bilag links")

    # ================================================================
    # FLOW 9: Journal balance verification (global)
    # ================================================================
    print("\n\033[1m[FLOW 9] Journal Balance Verification\033[0m")

    async with async_session_maker() as db:
        from models.postering import Postering

        # Check every journal_id balances
        result = await db.execute(
            select(
                Postering.journal_id,
                func.sum(Postering.debit_amount).label("total_debit"),
                func.sum(Postering.credit_amount).label("total_credit"),
            )
            .where(Postering.company_id == COMPANY_ID)
            .group_by(Postering.journal_id)
        )
        journals = result.all()

        unbalanced = []
        for j_id, total_debit, total_credit in journals:
            if abs(total_debit - total_credit) > Decimal("0.01"):
                unbalanced.append((j_id, total_debit, total_credit))

        if unbalanced:
            fail(f"{len(unbalanced)}/{len(journals)} journals unbalanced:")
            for j_id, d, c in unbalanced[:5]:
                print(f"    {j_id}: debit={d} credit={c} diff={d-c}")
        else:
            ok(f"All {len(journals)} journal entries balanced (debit=credit)")

    # ================================================================
    # RESULTS
    # ================================================================
    print("\n" + "=" * 72)
    total = passed + len(errors) + len(warnings)
    print(f"  RESULTS: {passed} passed, {len(errors)} failed, {len(warnings)} warnings")
    print(f"  Total checks: {total}")

    if errors:
        print(f"\n  \033[31mFAILURES:\033[0m")
        for e in errors:
            print(f"    - {e}")

    if warnings:
        print(f"\n  \033[33mWARNINGS:\033[0m")
        for w in warnings:
            print(f"    - {w}")

    if not errors:
        print(f"\n  \033[32mALL CRITICAL CHECKS PASSED\033[0m")
    print("=" * 72)


if __name__ == "__main__":
    asyncio.run(run())
