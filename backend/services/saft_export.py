"""
SAF-T Financial v1.30 XML Generator
Generates compliant SAF-T XML from Ciri's database.

Reference:
- Schema: Norwegian_SAF-T_Financial_Schema_v_1.30.xsd
- Namespace: urn:StandardAuditFile-Taxation-Financial:NO
- Specification: https://skatteetaten.github.io/datasamarbeid-api-dokumentasjon/
"""

import logging
import xml.etree.ElementTree as ET
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from uuid import UUID
from collections import defaultdict

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from services.saft_mappings import (
    get_standard_account_id,
    get_saft_grouping_code,
    MVA_CODES,
    get_mva_rate,
)

logger = logging.getLogger(__name__)

# SAF-T namespace
NAMESPACE = "urn:StandardAuditFile-Taxation-Financial:NO"
NS = {"n1": NAMESPACE}


def _el(parent: ET.Element, tag: str, text: str | None = None) -> ET.Element:
    """Create a child element with optional text content."""
    elem = ET.SubElement(parent, tag)
    if text is not None:
        elem.text = str(text)
    return elem


def _decimal(value: Decimal | float | None) -> str:
    """Format a decimal for SAF-T (2 decimal places, no trailing zeros on integer)."""
    if value is None:
        return "0.00"
    d = Decimal(str(value)).quantize(Decimal("0.01"))
    return str(d)


class SAFTExporter:
    """
    Generates SAF-T Financial v1.30 XML from the database.

    Usage:
        exporter = SAFTExporter(db, company_id)
        xml_bytes = await exporter.export(date(2025,1,1), date(2025,12,31))
    """

    def __init__(self, db: AsyncSession, company_id: UUID):
        self.db = db
        self.company_id = company_id

    async def export(self, period_start: date, period_end: date) -> bytes:
        """Generate complete SAF-T XML file."""
        logger.info(
            f"Generating SAF-T for company {self.company_id}, "
            f"period {period_start} – {period_end}"
        )

        # Root element with namespace
        root = ET.Element("AuditFile")
        root.set("xmlns", NAMESPACE)
        root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")

        # Build sections
        await self._build_header(root, period_start, period_end)
        await self._build_master_files(root, period_start, period_end)
        await self._build_general_ledger_entries(root, period_start, period_end)

        # Serialize to XML bytes with declaration
        tree = ET.ElementTree(root)
        buffer = BytesIO()
        tree.write(
            buffer,
            encoding="UTF-8",
            xml_declaration=True,
        )
        xml_bytes = buffer.getvalue()

        logger.info(f"SAF-T generated: {len(xml_bytes)} bytes")
        return xml_bytes

    # ══════════════════════════════════════════════════════════════════
    # Header
    # ══════════════════════════════════════════════════════════════════

    async def _build_header(
        self, root: ET.Element, period_start: date, period_end: date
    ):
        """Build the <Header> section."""
        from models.company import Company

        company = await self.db.get(Company, self.company_id)
        if not company:
            raise ValueError(f"Company {self.company_id} not found")

        header = _el(root, "Header")

        _el(header, "AuditFileVersion", "1.30")
        _el(header, "AuditFileCountry", "NO")
        _el(header, "AuditFileDateCreated", date.today().isoformat())
        _el(header, "SoftwareCompanyName", "Ciri AS")
        _el(header, "SoftwareID", "Ciri")
        _el(header, "SoftwareVersion", "1.0")

        # Company
        comp_el = _el(header, "Company")
        _el(comp_el, "RegistrationNumber", company.org_number)
        _el(comp_el, "Name", company.name)

        # Address
        addr = _el(comp_el, "Address")
        _el(addr, "StreetName", company.street_address or "")
        _el(addr, "City", company.city or "")
        _el(addr, "PostalCode", company.postal_code or "")
        _el(addr, "Country", "NO")

        # Contact (optional, use company name)
        contact = _el(comp_el, "Contact")
        contact_name = _el(contact, "ContactPerson")
        _el(contact_name, "FirstName", "")
        _el(contact_name, "LastName", "")

        # Default currency
        _el(header, "DefaultCurrencyCode", "NOK")

        # Selection criteria
        criteria = _el(header, "SelectionCriteria")
        _el(criteria, "SelectionStartDate", period_start.isoformat())
        _el(criteria, "SelectionEndDate", period_end.isoformat())

        # Tax accounting basis
        _el(header, "TaxAccountingBasis", "A")  # A = Regnskapsmessig

        # Header fields
        _el(header, "HeaderComment", f"SAF-T eksport for {company.name}")

        # Number of entries in the file (filled later — placeholder)
        fiscal_year = period_start.year
        _el(header, "TaxEntity", company.org_number)

    # ══════════════════════════════════════════════════════════════════
    # MasterFiles
    # ══════════════════════════════════════════════════════════════════

    async def _build_master_files(
        self, root: ET.Element, period_start: date, period_end: date
    ):
        """Build the <MasterFiles> section."""
        master = _el(root, "MasterFiles")

        await self._build_general_ledger_accounts(master)
        await self._build_customers(master, period_start, period_end)
        await self._build_suppliers(master, period_start, period_end)
        await self._build_tax_table(master, period_start, period_end)

    async def _build_general_ledger_accounts(self, master: ET.Element):
        """Build <GeneralLedgerAccounts> from Konto table."""
        from models.konto import Konto

        result = await self.db.execute(
            select(Konto).where(
                and_(
                    Konto.company_id == self.company_id,
                    Konto.is_active == True,  # noqa: E712
                )
            ).order_by(Konto.number)
        )
        accounts = result.scalars().all()

        if not accounts:
            return

        gl_accounts = _el(master, "GeneralLedgerAccounts")

        for acc in accounts:
            account_el = _el(gl_accounts, "Account")
            _el(account_el, "AccountID", acc.number)
            _el(account_el, "AccountDescription", acc.name)

            # v1.30: GroupingCategory + GroupingCode replace StandardAccountID
            # GroupingCategory = the code list name (RF-1167 for Næringsoppgave 1)
            # GroupingCode = the specific post number from that list
            standard_id = acc.saft_standard_id or get_standard_account_id(acc.number)
            _el(account_el, "GroupingCategory", "RF-1167")
            _el(account_el, "GroupingCode", standard_id or acc.number[:2])
            _el(account_el, "AccountType", "GL")

            # Opening/closing balance — CHOICE: Debit OR Credit (not both)
            # Use grouping code to determine typical balance side
            grouping = get_saft_grouping_code(acc.number)
            if grouping == "D":
                _el(account_el, "OpeningDebitBalance", "0.00")
                _el(account_el, "ClosingDebitBalance", "0.00")
            else:
                _el(account_el, "OpeningCreditBalance", "0.00")
                _el(account_el, "ClosingCreditBalance", "0.00")

    async def _build_customers(
        self, master: ET.Element, period_start: date, period_end: date
    ):
        """Build <Customers> from invoice data."""
        from models.invoice import Invoice

        result = await self.db.execute(
            select(
                Invoice.customer_name,
                Invoice.customer_email,
            ).where(
                and_(
                    Invoice.company_id == self.company_id,
                    Invoice.created_at >= datetime.combine(period_start, datetime.min.time()),
                    Invoice.created_at <= datetime.combine(period_end, datetime.max.time()),
                )
            ).distinct()
        )
        customers = result.all()

        if not customers:
            return

        for i, (name, email) in enumerate(customers, 1):
            if not name or name == "PURGED":
                continue
            cust = _el(master, "Customer")
            _el(cust, "CustomerID", f"C{i:04d}")
            _el(cust, "Name", name)

            # Contact
            if email:
                contact = _el(cust, "Contact")
                contact_name = _el(contact, "ContactPerson")
                _el(contact_name, "FirstName", "")
                _el(contact_name, "LastName", name)
                _el(contact, "Email", email)

            # Address (not available in invoice model, use minimal)
            addr = _el(cust, "Address")
            _el(addr, "City", "")
            _el(addr, "Country", "NO")

    async def _build_suppliers(
        self, master: ET.Element, period_start: date, period_end: date
    ):
        """Build <Suppliers> from bilag counterparty data."""
        from models.bilag import Bilag

        result = await self.db.execute(
            select(
                Bilag.counterparty_name,
                Bilag.counterparty_org_number,
            ).where(
                and_(
                    Bilag.company_id == self.company_id,
                    Bilag.document_date >= period_start,
                    Bilag.document_date <= period_end,
                    Bilag.counterparty_name != None,  # noqa: E711
                    Bilag.counterparty_name != "PURGED",
                )
            ).distinct()
        )
        suppliers = result.all()

        if not suppliers:
            return

        for i, (name, org_number) in enumerate(suppliers, 1):
            if not name:
                continue
            supp = _el(master, "Supplier")
            _el(supp, "SupplierID", f"S{i:04d}")
            _el(supp, "Name", name)

            if org_number:
                _el(supp, "RegistrationNumber", org_number)

            # Address (minimal)
            addr = _el(supp, "Address")
            _el(addr, "City", "")
            _el(addr, "Country", "NO")

    async def _build_tax_table(
        self, master: ET.Element, period_start: date, period_end: date
    ):
        """Build <TaxTable> with Norwegian MVA codes used in the period."""
        from models.postering import Postering

        # Find all MVA codes used in the period
        result = await self.db.execute(
            select(func.distinct(Postering.mva_code)).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                    Postering.mva_code != None,  # noqa: E711
                )
            )
        )
        used_codes = {row[0] for row in result.all()}

        if not used_codes:
            return

        tax_table = _el(master, "TaxTable")

        for code_str in sorted(used_codes):
            mva = MVA_CODES.get(code_str)
            if not mva:
                continue

            entry = _el(tax_table, "TaxTableEntry")
            _el(entry, "TaxType", "MVA")
            _el(entry, "Description", "Merverdiavgift")  # v1.30: fixed value

            detail = _el(entry, "TaxCodeDetails")
            _el(detail, "TaxCode", code_str)
            _el(detail, "Description", mva["description"])
            _el(detail, "TaxPercentage", _decimal(mva["rate"]))
            _el(detail, "Country", "NO")
            _el(detail, "StandardTaxCode", mva.get("saft_code", code_str))  # mandatory in v1.30
            _el(detail, "BaseRate", "100.00")

    # ══════════════════════════════════════════════════════════════════
    # GeneralLedgerEntries
    # ══════════════════════════════════════════════════════════════════

    async def _build_general_ledger_entries(
        self, root: ET.Element, period_start: date, period_end: date
    ):
        """Build <GeneralLedgerEntries> from posteringer."""
        from models.postering import Postering
        from models.bilag import Bilag

        # Fetch all posteringer in period
        result = await self.db.execute(
            select(Postering).where(
                and_(
                    Postering.company_id == self.company_id,
                    Postering.posting_date >= period_start,
                    Postering.posting_date <= period_end,
                )
            ).order_by(Postering.journal_id, Postering.posting_date)
        )
        posteringer = result.scalars().all()

        if not posteringer:
            return

        gl_entries = _el(root, "GeneralLedgerEntries")

        # Compute totals
        total_debit = sum(p.debit_amount for p in posteringer)
        total_credit = sum(p.credit_amount for p in posteringer)
        _el(gl_entries, "NumberOfEntries", str(len(set(p.journal_id for p in posteringer))))
        _el(gl_entries, "TotalDebit", _decimal(total_debit))
        _el(gl_entries, "TotalCredit", _decimal(total_credit))

        # Group posteringer by journal_id → each journal = one Transaction
        journals: dict[str, list] = defaultdict(list)
        for p in posteringer:
            journals[p.journal_id].append(p)

        # Build a bilag cache for descriptions
        bilag_ids = {p.bilag_id for p in posteringer}
        bilag_map: dict[UUID, Bilag] = {}
        if bilag_ids:
            result = await self.db.execute(
                select(Bilag).where(Bilag.id.in_(bilag_ids))
            )
            for b in result.scalars().all():
                bilag_map[b.id] = b

        # Build customer/supplier ID maps for cross-referencing
        # (simplified — map counterparty_name to SupplierID)
        supplier_names = {}
        customer_names = {}
        supplier_idx = 1
        customer_idx = 1

        # One <Journal> per logical journal (simplified: one journal for all entries)
        journal_el = _el(gl_entries, "Journal")
        _el(journal_el, "JournalID", "GL")
        _el(journal_el, "Description", "Hovedbok")
        _el(journal_el, "Type", "GL")

        for journal_id, lines in journals.items():
            transaction = _el(journal_el, "Transaction")
            _el(transaction, "TransactionID", journal_id)
            _el(transaction, "Period", lines[0].period.split("-")[1] if lines[0].period else "01")
            _el(transaction, "PeriodYear", str(lines[0].posting_date.year))
            _el(transaction, "TransactionDate", lines[0].posting_date.isoformat())

            # Source document reference
            bilag = bilag_map.get(lines[0].bilag_id)
            if bilag:
                _el(transaction, "SourceDocumentID", bilag.bilag_number)

            _el(transaction, "Description", lines[0].description or "")
            _el(transaction, "SystemEntryDate", lines[0].created_at.date().isoformat() if lines[0].created_at else lines[0].posting_date.isoformat())
            _el(transaction, "GLPostingDate", lines[0].posting_date.isoformat())

            # Transaction lines
            for idx, line in enumerate(lines, 1):
                is_debit = line.debit_amount > 0
                line_el = _el(transaction, "Line")

                _el(line_el, "RecordID", line.saft_transaction_id or f"{journal_id}-{idx}")
                _el(line_el, "AccountID", line.account_number)
                _el(line_el, "SourceDocumentID", bilag.bilag_number if bilag else "")
                _el(line_el, "Description", line.description or "")

                if is_debit:
                    _el(line_el, "DebitAmount")
                    amount_el = line_el.find("DebitAmount")
                    _el(amount_el, "Amount", _decimal(line.debit_amount))
                    _el(amount_el, "CurrencyCode", "NOK")
                    _el(amount_el, "CurrencyAmount", _decimal(line.debit_amount))
                else:
                    _el(line_el, "CreditAmount")
                    amount_el = line_el.find("CreditAmount")
                    _el(amount_el, "Amount", _decimal(line.credit_amount))
                    _el(amount_el, "CurrencyCode", "NOK")
                    _el(amount_el, "CurrencyAmount", _decimal(line.credit_amount))

                # Tax information (v1.30: DebitTaxAmount/CreditTaxAmount)
                if line.mva_code and line.mva_amount and line.mva_amount != 0:
                    tax_info = _el(line_el, "TaxInformation")
                    _el(tax_info, "TaxType", "MVA")
                    _el(tax_info, "TaxCode", line.mva_code)
                    _el(tax_info, "TaxPercentage", _decimal(get_mva_rate(line.mva_code)))
                    _el(tax_info, "TaxBase", _decimal(
                        line.debit_amount if is_debit else line.credit_amount
                    ))

                    # v1.30: use DebitTaxAmount or CreditTaxAmount (not TaxAmount)
                    tax_tag = "DebitTaxAmount" if is_debit else "CreditTaxAmount"
                    tax_amount = _el(tax_info, tax_tag)
                    _el(tax_amount, "Amount", _decimal(abs(line.mva_amount)))
                    _el(tax_amount, "CurrencyCode", "NOK")
                    _el(tax_amount, "CurrencyAmount", _decimal(abs(line.mva_amount)))
