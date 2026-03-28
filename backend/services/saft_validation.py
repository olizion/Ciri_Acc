"""
SAF-T Pre-Export Validation
Checks data completeness before generating a SAF-T file.
"""

import logging
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select, func, and_, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from services.saft_mappings import get_standard_account_id, MVA_CODES

logger = logging.getLogger(__name__)


class ValidationIssue:
    """A single validation issue."""

    def __init__(self, severity: str, code: str, message: str, details: str = ""):
        self.severity = severity  # "error" | "warning"
        self.code = code
        self.message = message
        self.details = details

    def to_dict(self) -> dict:
        return {
            "severity": self.severity,
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class SAFTValidator:
    """
    Validates data completeness for SAF-T export.

    Errors = export will fail or produce invalid XML.
    Warnings = export will work but data quality could be improved.
    """

    def __init__(self, db: AsyncSession, company_id: UUID):
        self.db = db
        self.company_id = company_id
        self.issues: list[ValidationIssue] = []

    async def validate(self, period_start: date, period_end: date) -> dict:
        """Run all validation checks. Returns summary with issues list."""
        self.issues = []

        await self._check_company_data()
        await self._check_chart_of_accounts()
        await self._check_posteringer(period_start, period_end)
        await self._check_mva_codes(period_start, period_end)
        await self._check_bilag_completeness(period_start, period_end)
        await self._check_journal_balance(period_start, period_end)

        errors = [i for i in self.issues if i.severity == "error"]
        warnings = [i for i in self.issues if i.severity == "warning"]

        return {
            "valid": len(errors) == 0,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "issues": [i.to_dict() for i in self.issues],
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
        }

    async def _check_company_data(self):
        """Verify company has all required SAF-T header fields."""
        from models.company import Company

        company = await self.db.get(Company, self.company_id)
        if not company:
            self.issues.append(ValidationIssue(
                "error", "COMPANY_NOT_FOUND",
                "Fant ikke selskapet i databasen",
            ))
            return

        if not company.org_number or len(company.org_number) != 9:
            self.issues.append(ValidationIssue(
                "error", "MISSING_ORG_NUMBER",
                "Organisasjonsnummer mangler eller er ugyldig",
                f"Nåværende verdi: '{company.org_number}'"
            ))

        if not company.name:
            self.issues.append(ValidationIssue(
                "error", "MISSING_COMPANY_NAME",
                "Selskapsnavn mangler",
            ))

        if not company.street_address or not company.postal_code or not company.city:
            self.issues.append(ValidationIssue(
                "warning", "INCOMPLETE_ADDRESS",
                "Selskapsadresse er ufullstendig",
                "SAF-T krever gateadresse, postnummer og poststed"
            ))

    async def _check_chart_of_accounts(self):
        """Verify chart of accounts has SAF-T mappings."""
        from models.konto import Konto

        # Get all active accounts
        result = await self.db.execute(
            select(Konto).where(
                and_(
                    Konto.company_id == self.company_id,
                    Konto.is_active == True,  # noqa: E712
                )
            )
        )
        accounts = result.scalars().all()

        if not accounts:
            self.issues.append(ValidationIssue(
                "error", "NO_ACCOUNTS",
                "Ingen kontoer funnet i kontoplanen",
            ))
            return

        # Check each account has a valid SAF-T mapping
        unmapped = []
        for acc in accounts:
            standard_id = acc.saft_standard_id or get_standard_account_id(acc.number)
            if not standard_id:
                unmapped.append(f"{acc.number} ({acc.name})")

        if unmapped:
            self.issues.append(ValidationIssue(
                "warning", "UNMAPPED_ACCOUNTS",
                f"{len(unmapped)} kontoer mangler SAF-T-mapping",
                "; ".join(unmapped[:10]) + ("..." if len(unmapped) > 10 else "")
            ))

    async def _check_posteringer(self, period_start: date, period_end: date):
        """Verify posteringer exist and have required fields."""
        from models.postering import Postering

        result = await self.db.execute(
            select(func.count(Postering.id)).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                )
            )
        )
        count = result.scalar_one()

        if count == 0:
            self.issues.append(ValidationIssue(
                "error", "NO_POSTERINGER",
                f"Ingen posteringer funnet i perioden {period_start} – {period_end}",
            ))
            return

        # Check for posteringer without saft_transaction_id
        result = await self.db.execute(
            select(func.count(Postering.id)).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                    Postering.saft_transaction_id == None,  # noqa: E711
                )
            )
        )
        missing_saft_id = result.scalar_one()

        if missing_saft_id > 0:
            self.issues.append(ValidationIssue(
                "error", "MISSING_SAFT_TRANSACTION_ID",
                f"{missing_saft_id} posteringer mangler SAF-T transaksjons-ID",
            ))

    async def _check_mva_codes(self, period_start: date, period_end: date):
        """Check that all MVA codes used are recognized."""
        from models.postering import Postering

        result = await self.db.execute(
            select(distinct(Postering.mva_code)).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                    Postering.mva_code != None,  # noqa: E711
                )
            )
        )
        used_codes = {row[0] for row in result.all()}
        unknown = used_codes - set(MVA_CODES.keys())

        if unknown:
            self.issues.append(ValidationIssue(
                "warning", "UNKNOWN_MVA_CODES",
                f"Ukjente MVA-koder i bruk: {', '.join(sorted(unknown))}",
                "Disse kodene kan ikke mappes til standard SAF-T skattekoder"
            ))

    async def _check_bilag_completeness(self, period_start: date, period_end: date):
        """Check that posteringer reference valid bilag."""
        from models.postering import Postering
        from models.bilag import Bilag

        # Count posteringer with no matching bilag
        from sqlalchemy import outerjoin
        result = await self.db.execute(
            select(func.count(Postering.id)).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                )
            ).outerjoin(Bilag, Postering.bilag_id == Bilag.id).where(
                Bilag.id == None  # noqa: E711
            )
        )
        orphaned = result.scalar_one()

        if orphaned > 0:
            self.issues.append(ValidationIssue(
                "warning", "ORPHANED_POSTERINGER",
                f"{orphaned} posteringer refererer til bilag som ikke finnes",
                "SAF-T krever sporbarhet fra postering til dokumentasjon"
            ))

    async def _check_journal_balance(self, period_start: date, period_end: date):
        """Check that journal entries balance (debit = credit per journal)."""
        from models.postering import Postering

        result = await self.db.execute(
            select(
                Postering.journal_id,
                func.sum(Postering.debit_amount).label("total_debit"),
                func.sum(Postering.credit_amount).label("total_credit"),
            ).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                )
            ).group_by(Postering.journal_id)
        )
        journals = result.all()

        unbalanced = []
        for journal_id, total_debit, total_credit in journals:
            diff = abs((total_debit or Decimal("0")) - (total_credit or Decimal("0")))
            if diff > Decimal("0.01"):
                unbalanced.append(f"{journal_id} (diff: {diff})")

        if unbalanced:
            self.issues.append(ValidationIssue(
                "error", "UNBALANCED_JOURNALS",
                f"{len(unbalanced)} bilagsnumre balanserer ikke (debet ≠ kredit)",
                "; ".join(unbalanced[:5]) + ("..." if len(unbalanced) > 5 else "")
            ))
