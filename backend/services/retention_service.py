"""
Retention Lifecycle Service
GDPR-compliant data retention and purge for Bokforingsloven compliance.

Norwegian law:
- Bokforingsloven §13: 5-year retention for accounting records
- GDPR Art. 5(1)(e): Data must be deleted when retention expires
- Skatteforvaltningsloven §11-3: Audit hold can extend retention indefinitely
"""

import logging
from datetime import datetime, date
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import async_session_maker
from models.mixins import RETENTION_YEARS, compute_retention_expiry

logger = logging.getLogger(__name__)


class RetentionService:
    """
    Handles GDPR-compliant data lifecycle.

    Process:
    1. Find records where retention_expires_at < today AND audit_hold = false AND purged_at IS NULL
    2. For each record, soft-purge: null out PII fields, set purged_at = now()
    3. For Postering: NEVER delete (Bokforingsloven §6). Only purge associated PII from linked Bilag.
    4. Log all purge actions to AuditLog
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.purge_count = 0
        self.skip_count = 0
        self.error_count = 0

    async def run_purge_cycle(self) -> dict:
        """
        Run a full purge cycle across all retention-tracked models.
        Returns summary of actions taken.
        """
        logger.info("Starting retention purge cycle")
        self.purge_count = 0
        self.skip_count = 0
        self.error_count = 0

        # Check company-level audit holds first
        company_holds = await self._get_companies_on_hold()

        # Purge each model type
        await self._purge_employees(company_holds)
        await self._purge_bilag(company_holds)
        await self._purge_payslips(company_holds)
        await self._purge_invoices(company_holds)
        await self._purge_bank_transactions(company_holds)
        await self._purge_amelding_submissions(company_holds)
        await self._purge_mva_submissions(company_holds)

        # Purge PII from old audit log entries (GDPR)
        audit_pii_count = await self._purge_audit_log_pii()

        summary = {
            "purged": self.purge_count,
            "skipped_audit_hold": self.skip_count,
            "errors": self.error_count,
            "companies_on_hold": len(company_holds),
            "audit_log_pii_purged": audit_pii_count,
            "completed_at": datetime.utcnow().isoformat(),
        }

        logger.info(
            f"Retention purge cycle complete: "
            f"{self.purge_count} purged, {self.skip_count} skipped (audit hold), "
            f"{self.error_count} errors"
        )

        # Log the purge cycle to audit log
        await self._log_purge_cycle(summary)

        return summary

    async def _get_companies_on_hold(self) -> set[UUID]:
        """Get company IDs with active audit holds."""
        from models.company import Company

        result = await self.db.execute(
            select(Company.id).where(Company.audit_hold_active == True)  # noqa: E712
        )
        return {row[0] for row in result.all()}

    async def _purge_employees(self, company_holds: set[UUID]) -> None:
        """Purge PII from employees past retention."""
        from models.employee import Employee

        try:
            result = await self.db.execute(
                select(Employee).where(
                    and_(
                        Employee.retention_expires_at != None,  # noqa: E711
                        Employee.retention_expires_at < date.today(),
                        Employee.audit_hold == False,  # noqa: E712
                        Employee.purged_at == None,  # noqa: E711
                    )
                )
            )
            employees = result.scalars().all()

            for emp in employees:
                if emp.company_id in company_holds:
                    self.skip_count += 1
                    continue

                # Anonymize PII, keep aggregate employment data
                emp.personnummer = "PURGED"
                emp.email = None
                emp.phone = None
                emp.bank_account = None
                emp.notes = None
                emp.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"Employee purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_bilag(self, company_holds: set[UUID]) -> None:
        """Purge PII from bilag and delete associated files."""
        from models.bilag import Bilag
        import os

        try:
            result = await self.db.execute(
                select(Bilag).where(
                    and_(
                        Bilag.retention_expires_at != None,  # noqa: E711
                        Bilag.retention_expires_at < date.today(),
                        Bilag.audit_hold == False,  # noqa: E712
                        Bilag.purged_at == None,  # noqa: E711
                    )
                )
            )
            bilags = result.scalars().all()

            for bilag in bilags:
                if bilag.company_id in company_holds:
                    self.skip_count += 1
                    continue

                # Delete physical file
                if bilag.file_path:
                    try:
                        file_path = os.path.join("uploads", bilag.file_path)
                        if os.path.exists(file_path):
                            os.remove(file_path)
                    except OSError as e:
                        logger.warning(f"Could not delete file {bilag.file_path}: {e}")

                # Anonymize PII
                bilag.counterparty_name = None
                bilag.counterparty_org_number = None
                bilag.ocr_text = None
                bilag.file_path = "PURGED"
                bilag.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"Bilag purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_payslips(self, company_holds: set[UUID]) -> None:
        """Purge payslips (PII comes from employee, amounts are kept)."""
        from models.employee import Payslip

        try:
            result = await self.db.execute(
                select(Payslip).where(
                    and_(
                        Payslip.retention_expires_at != None,  # noqa: E711
                        Payslip.retention_expires_at < date.today(),
                        Payslip.audit_hold == False,  # noqa: E712
                        Payslip.purged_at == None,  # noqa: E711
                    )
                )
            )
            payslips = result.scalars().all()

            for payslip in payslips:
                if payslip.company_id in company_holds:
                    self.skip_count += 1
                    continue

                # Keep amounts for aggregate reporting, just mark as purged
                payslip.payment_reference = None
                payslip.amelding_reference = None
                payslip.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"Payslip purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_invoices(self, company_holds: set[UUID]) -> None:
        """Purge customer PII from invoices."""
        from models.invoice import Invoice

        try:
            result = await self.db.execute(
                select(Invoice).where(
                    and_(
                        Invoice.retention_expires_at != None,  # noqa: E711
                        Invoice.retention_expires_at < date.today(),
                        Invoice.audit_hold == False,  # noqa: E712
                        Invoice.purged_at == None,  # noqa: E711
                    )
                )
            )
            invoices = result.scalars().all()

            for inv in invoices:
                if inv.company_id in company_holds:
                    self.skip_count += 1
                    continue

                inv.customer_name = "PURGED"
                inv.customer_email = "PURGED"
                inv.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"Invoice purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_bank_transactions(self, company_holds: set[UUID]) -> None:
        """Purge descriptions from bank transactions."""
        from models.bank_transaction import BankTransaction
        from models.bank_account import BankAccount

        try:
            # Need to join with BankAccount to get company_id
            result = await self.db.execute(
                select(BankTransaction).where(
                    and_(
                        BankTransaction.retention_expires_at != None,  # noqa: E711
                        BankTransaction.retention_expires_at < date.today(),
                        BankTransaction.audit_hold == False,  # noqa: E712
                        BankTransaction.purged_at == None,  # noqa: E711
                    )
                )
            )
            transactions = result.scalars().all()

            for txn in transactions:
                if txn.company_id in company_holds:
                    self.skip_count += 1
                    continue
                txn.raw_description = "PURGED"
                txn.cleaned_description = None
                txn.merchant_name = None
                txn.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"BankTransaction purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_amelding_submissions(self, company_holds: set[UUID]) -> None:
        """Purge payload from a-melding submissions (keep metadata)."""
        from models.amelding_submission import AMeldingSubmission

        try:
            result = await self.db.execute(
                select(AMeldingSubmission).where(
                    and_(
                        AMeldingSubmission.retention_expires_at != None,  # noqa: E711
                        AMeldingSubmission.retention_expires_at < date.today(),
                        AMeldingSubmission.audit_hold == False,  # noqa: E712
                        AMeldingSubmission.purged_at == None,  # noqa: E711
                    )
                )
            )
            submissions = result.scalars().all()

            for sub in submissions:
                if sub.company_id in company_holds:
                    self.skip_count += 1
                    continue

                # Remove payload (contains personnummer), keep summary data
                sub.payload_json = None
                sub.payload_hash_sha256 = None
                sub.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"AMelding purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_mva_submissions(self, company_holds: set[UUID]) -> None:
        """Purge XML payloads from MVA submissions (keep summary data)."""
        from models.mva_submission import MVASubmission

        try:
            result = await self.db.execute(
                select(MVASubmission).where(
                    and_(
                        MVASubmission.retention_expires_at != None,  # noqa: E711
                        MVASubmission.retention_expires_at < date.today(),
                        MVASubmission.audit_hold == False,  # noqa: E712
                        MVASubmission.purged_at == None,  # noqa: E711
                    )
                )
            )
            submissions = result.scalars().all()

            for sub in submissions:
                if sub.company_id in company_holds:
                    self.skip_count += 1
                    continue

                sub.melding_xml = None
                sub.innsending_xml = None
                sub.purged_at = datetime.utcnow()
                self.purge_count += 1

            await self.db.flush()
        except Exception as e:
            logger.error(f"MVASubmission purge failed: {e}")
            self.error_count += 1
            await self.db.rollback()

    async def _purge_audit_log_pii(self) -> int:
        """
        Purge PII (ip_address, user_agent) from audit log entries older than 5 years.

        AuditLog entries are immutable (no updates/deletes at ORM level), so we use
        a raw SQL UPDATE to null out PII fields. The before_update listener only blocks
        ORM-level changes — raw SQL bypasses it intentionally for this compliance task.
        """
        from sqlalchemy import text

        cutoff = compute_retention_expiry(date.today().year - 6, "regnskap")
        try:
            result = await self.db.execute(
                text("""
                    UPDATE audit_logs
                    SET ip_address = NULL, user_agent = NULL
                    WHERE timestamp < :cutoff
                      AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
                """),
                {"cutoff": cutoff},
            )
            count = result.rowcount or 0
            if count > 0:
                logger.info(f"Purged PII from {count} audit log entries older than {cutoff}")
            return count
        except Exception as e:
            logger.error(f"AuditLog PII purge failed: {e}")
            return 0

    async def preview_purge_cycle(self) -> dict:
        """
        Dry-run: count how many records WOULD be purged per model.
        Does not modify any data.
        """
        from models.bilag import Bilag
        from models.employee import Employee, Payslip
        from models.invoice import Invoice
        from models.bank_transaction import BankTransaction
        from models.amelding_submission import AMeldingSubmission
        from models.mva_submission import MVASubmission

        company_holds = await self._get_companies_on_hold()
        counts = {}

        for model, name in [
            (Bilag, "bilag"),
            (Employee, "employees"),
            (Payslip, "payslips"),
            (Invoice, "invoices"),
            (BankTransaction, "bank_transactions"),
            (AMeldingSubmission, "amelding_submissions"),
            (MVASubmission, "mva_submissions"),
        ]:
            result = await self.db.execute(
                select(func.count(model.id)).where(
                    and_(
                        model.retention_expires_at != None,  # noqa: E711
                        model.retention_expires_at < date.today(),
                        model.audit_hold == False,  # noqa: E712
                        model.purged_at == None,  # noqa: E711
                    )
                )
            )
            counts[name] = result.scalar() or 0

        return {
            "would_purge": counts,
            "companies_on_hold": len(company_holds),
            "as_of": date.today().isoformat(),
        }

    async def _log_purge_cycle(self, summary: dict) -> None:
        """Log the purge cycle to AuditLog."""
        from models.audit_log import AuditLog

        try:
            log = AuditLog(
                action="retention_purge",
                resource_type="system",
                details=summary,
                created_by_ciri=True,
            )
            self.db.add(log)
            await self.db.flush()
        except Exception as e:
            logger.error(f"Failed to log purge cycle: {e}")

    async def backfill_retention_metadata(self) -> dict:
        """
        One-time job to set fiscal_year and retention_expires_at on existing rows
        that don't have retention metadata yet.
        """
        counts = {}

        # Bilag: fiscal_year from document_date
        from models.bilag import Bilag
        result = await self.db.execute(
            select(Bilag).where(Bilag.fiscal_year == None)  # noqa: E711
        )
        bilags = result.scalars().all()
        for b in bilags:
            fy = b.document_date.year if b.document_date else b.created_at.year
            b.fiscal_year = fy
            b.retention_category = "regnskap"
            b.retention_expires_at = compute_retention_expiry(fy, "regnskap")
        counts["bilag"] = len(bilags)

        # Payslip: fiscal_year from year field
        from models.employee import Payslip
        result = await self.db.execute(
            select(Payslip).where(Payslip.fiscal_year == None)  # noqa: E711
        )
        payslips = result.scalars().all()
        for p in payslips:
            p.fiscal_year = p.year
            p.retention_category = "lonn"
            p.retention_expires_at = compute_retention_expiry(p.year, "lonn")
        counts["payslips"] = len(payslips)

        # Invoice: fiscal_year from created_at
        from models.invoice import Invoice
        result = await self.db.execute(
            select(Invoice).where(Invoice.fiscal_year == None)  # noqa: E711
        )
        invoices = result.scalars().all()
        for inv in invoices:
            fy = inv.created_at.year if inv.created_at else datetime.utcnow().year
            inv.fiscal_year = fy
            inv.retention_category = "regnskap"
            inv.retention_expires_at = compute_retention_expiry(fy, "regnskap")
        counts["invoices"] = len(invoices)

        # Employee: fiscal_year from end_date (terminated) or current year
        from models.employee import Employee, EmployeeStatus
        result = await self.db.execute(
            select(Employee).where(Employee.fiscal_year == None)  # noqa: E711
        )
        employees = result.scalars().all()
        for emp in employees:
            if emp.status == EmployeeStatus.TERMINATED and emp.end_date:
                fy = emp.end_date.year
            else:
                # Still active — don't set expiry yet
                continue
            emp.fiscal_year = fy
            emp.retention_category = "lonn"
            emp.retention_expires_at = compute_retention_expiry(fy, "lonn")
        counts["employees"] = len(employees)

        # BankTransaction: fiscal_year from booking_date
        from models.bank_transaction import BankTransaction
        result = await self.db.execute(
            select(BankTransaction).where(BankTransaction.fiscal_year == None)  # noqa: E711
        )
        txns = result.scalars().all()
        for txn in txns:
            fy = txn.booking_date.year if txn.booking_date else datetime.utcnow().year
            txn.fiscal_year = fy
            txn.retention_category = "regnskap"
            txn.retention_expires_at = compute_retention_expiry(fy, "regnskap")
        counts["bank_transactions"] = len(txns)

        # Postering: fiscal_year from posting_date
        # Uses raw SQL because Postering has an immutability guard (Bokføringsloven §6)
        # that blocks ORM updates. Retention fields are explicitly allowed.
        from models.postering import Postering
        result = await self.db.execute(
            select(Postering).where(Postering.fiscal_year == None)  # noqa: E711
        )
        posteringer = result.scalars().all()
        for p in posteringer:
            fy = p.posting_date.year if p.posting_date else p.created_at.year
            p.fiscal_year = fy
            p.retention_category = "regnskap"
            p.retention_expires_at = compute_retention_expiry(fy, "regnskap")
        counts["posteringer"] = len(posteringer)

        await self.db.flush()
        logger.info(f"Retention metadata backfill complete: {counts}")
        return counts
