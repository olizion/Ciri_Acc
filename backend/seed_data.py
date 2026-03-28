"""
Comprehensive test data seeder for Ciri.

Simulates a company that JUST started using the software:
- Bank connected, transactions imported
- Batch reconciliation ran → some SUGGESTED matches
- User confirmed a handful of matches → learned rules + cluster data points
- User marked some transactions as private
- Most transactions are still UNMATCHED (awaiting user review)

Idempotent: checks if BankTransaction table has rows before seeding.
"""

import uuid
from collections import defaultdict
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func, exists, text

from config.database import async_session_maker
from models import (
    Konto, KontoType,
    BankAccount, BankAggregator, BankAccountStatus,
    BankTransaction, TransactionDirection, ReconciliationStatus, TransactionCategory,
    Bilag, BilagStatus,
    Postering,
    ReconciliationRule, RuleType, RulePriority,
    ReconciliationMatch, MatchType, MatchConfidence, MatchStatus,
    ClusterDataPoint, DataPointSource,
    Employee, EmploymentType, EmployeeStatus, Payslip,
    Invoice, InvoiceStatus,
    Notification,
    AuditLog,
)

# Deterministic company UUID matching frontend
COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Deterministic bank account UUIDs
DNB_ACCOUNT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")
NORDEA_ACCOUNT_ID = uuid.UUID("00000000-0000-0000-0000-000000000011")


async def force_reseed():
    """Drop all data and reseed. Use for development only."""
    from config.database import init_db
    await init_db()
    async with async_session_maker() as session:
        print("🗑️  Truncating all tables...")
        # init_db() already ran create_all, so tables exist
        await session.execute(text(
            "TRUNCATE TABLE "
            "audit_logs, cluster_data_points, reconciliation_matches, "
            "reconciliation_rules, notifications, payslips, invoices, "
            "employees, posteringer, bilag, bank_transactions, "
            "bank_accounts, kontoer "
            "CASCADE"
        ))
        await session.commit()
        print("✅ All tables truncated")

    await seed_test_data()


async def seed_test_data():
    """Seed comprehensive test data across all features. Idempotent."""
    async with async_session_maker() as session:
        has_data = await session.execute(
            select(exists().where(BankTransaction.id.isnot(None)))
        )
        if has_data.scalar():
            print("📦 Test data already exists, skipping seed")
            return

        print("🌱 Seeding test data (fresh-start scenario)...")

        try:
            # ── 1. Chart of Accounts ──
            kontoer = _create_kontoer()
            session.add_all(kontoer)
            await session.flush()
            print("  ✅ Kontoer (chart of accounts)")

            # ── 2. Bank Accounts ──
            bank_accounts = _create_bank_accounts()
            session.add_all(bank_accounts)
            await session.flush()
            print("  ✅ Bank accounts")

            # ── 3. Bank Transactions (all imported, status set later) ──
            transactions = _create_bank_transactions()
            session.add_all(transactions)
            await session.flush()
            print(f"  ✅ Bank transactions ({len(transactions)})")

            # ── 4. Bilags (from OCR / email pipeline) ──
            bilags = _create_bilags()
            session.add_all(bilags)
            await session.flush()
            print(f"  ✅ Bilags ({len(bilags)})")

            # ── 5. Posteringer for posted bilags ──
            posteringer = _create_posteringer(bilags)
            session.add_all(posteringer)
            await session.flush()
            print(f"  ✅ Posteringer ({len(posteringer)})")

            # ── 6. Simulate avstemming: confirmed matches + clusters ──
            # No rules seeded — user creates those through the UI
            matches, clusters = _simulate_avstemming(transactions, bilags)
            session.add_all(matches)
            await session.flush()
            session.add_all(clusters)
            await session.flush()
            print(f"  ✅ Reconciliation matches ({len(matches)})")
            print(f"  ✅ Cluster data points ({len(clusters)}) — from confirmed avstemninger only")

            # ── 7. Employees ──
            employees = _create_employees()
            session.add_all(employees)
            await session.flush()
            print(f"  ✅ Employees ({len(employees)})")

            # ── 8. Payslips ──
            payslips = _create_payslips(employees)
            session.add_all(payslips)
            await session.flush()
            print(f"  ✅ Payslips ({len(payslips)})")

            # ── 9. Invoices ──
            invoices = _create_invoices()
            session.add_all(invoices)
            await session.flush()
            print(f"  ✅ Invoices ({len(invoices)})")

            # ── 10. Notifications ──
            notifications = _create_notifications(invoices, bilags)
            session.add_all(notifications)
            await session.flush()
            print(f"  ✅ Notifications ({len(notifications)})")

            # ── 11. Reconciliation Rules ──
            rules = _create_reconciliation_rules()
            session.add_all(rules)
            await session.flush()
            print(f"  ✅ Reconciliation rules ({len(rules)})")

            # ── 12. Audit Logs ──
            audit_logs = _create_audit_logs(bilags, invoices, employees)
            session.add_all(audit_logs)
            await session.flush()
            print(f"  ✅ Audit logs ({len(audit_logs)})")

            await session.commit()
            print("🎉 Test data seeded successfully!")

        except Exception as e:
            await session.rollback()
            print(f"❌ Seed failed: {e}")
            import traceback
            traceback.print_exc()
            raise


# ═══════════════════════════════════════════════════════════════════════════
# 1. Chart of Accounts (NS 4102)
# ═══════════════════════════════════════════════════════════════════════════

def _create_kontoer() -> list[Konto]:
    accounts = [
        # Assets (1xxx)
        ("1920", "Bank, driftskonto", KontoType.ASSET),
        ("1921", "Bank, sparekonto", KontoType.ASSET),
        ("1500", "Kundefordringer", KontoType.ASSET),
        ("1200", "Maskiner og inventar", KontoType.ASSET),
        ("1300", "Immaterielle eiendeler", KontoType.ASSET),
        # Liabilities (2xxx)
        ("2400", "Leverandørgjeld", KontoType.LIABILITY),
        ("2700", "Utgående MVA", KontoType.LIABILITY),
        ("2710", "Inngående MVA", KontoType.LIABILITY),
        ("2740", "Oppgjørskonto MVA", KontoType.LIABILITY),
        ("2600", "Skattetrekk", KontoType.LIABILITY),
        ("2770", "Arbeidsgiveravgift", KontoType.LIABILITY),
        ("2900", "Annen kortsiktig gjeld", KontoType.LIABILITY),
        # Equity
        ("2050", "Egenkapital", KontoType.EQUITY),
        # Income (3xxx)
        ("3000", "Salgsinntekt", KontoType.INCOME),
        ("3100", "Salgsinntekt, avgiftspliktig", KontoType.INCOME),
        # Cost of goods (4xxx)
        ("4005", "Varekjøp", KontoType.EXPENSE),
        ("4300", "Innkjøp av varer, utland", KontoType.EXPENSE),
        # Salary (5xxx)
        ("5000", "Lønn", KontoType.EXPENSE),
        ("5090", "Feriepenger", KontoType.EXPENSE),
        ("5400", "Arbeidsgiveravgift", KontoType.EXPENSE),
        ("5410", "OTP (tjenestepensjon)", KontoType.EXPENSE),
        # Office (6xxx)
        ("6300", "Leie av lokaler", KontoType.EXPENSE),
        ("6340", "Forsikring", KontoType.EXPENSE),
        ("6540", "Kontorrekvisita", KontoType.EXPENSE),
        ("6700", "Regnskapshonorar", KontoType.EXPENSE),
        ("6800", "Kontorrekvisita, IT", KontoType.EXPENSE),
        # Travel and transport (7xxx)
        ("7100", "Bilkostnader", KontoType.EXPENSE),
        ("7140", "Reisekostnader", KontoType.EXPENSE),
        ("7350", "Reklamekostnader", KontoType.EXPENSE),
        ("7770", "Bankgebyr", KontoType.EXPENSE),
        ("7790", "Andre finanskostnader", KontoType.EXPENSE),
    ]
    return [
        Konto(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            number=num,
            name=name,
            type=ktype,
            is_active=True,
        )
        for num, name, ktype in accounts
    ]


# ═══════════════════════════════════════════════════════════════════════════
# 2. Bank Accounts
# ═══════════════════════════════════════════════════════════════════════════

def _create_bank_accounts() -> list[BankAccount]:
    return [
        BankAccount(
            id=DNB_ACCOUNT_ID,
            company_id=COMPANY_ID,
            bank_name="DNB",
            account_number="12345678903",
            iban="NO9312345678903",
            account_name="Driftskonto",
            currency="NOK",
            konto_number="1920",
            aggregator=BankAggregator.MANUAL,
            current_balance=Decimal("487350.00"),
            available_balance=Decimal("487350.00"),
            balance_updated_at=datetime.now(timezone.utc),
            status=BankAccountStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc),
            transaction_count=70,
            is_primary=True,
        ),
        BankAccount(
            id=NORDEA_ACCOUNT_ID,
            company_id=COMPANY_ID,
            bank_name="Nordea",
            account_number="98765432101",
            iban="NO1298765432101",
            account_name="Sparekonto",
            currency="NOK",
            konto_number="1921",
            aggregator=BankAggregator.MANUAL,
            current_balance=Decimal("150000.00"),
            available_balance=Decimal("150000.00"),
            balance_updated_at=datetime.now(timezone.utc),
            status=BankAccountStatus.ACTIVE,
            last_sync_at=datetime.now(timezone.utc),
            transaction_count=10,
            is_primary=False,
        ),
    ]


# ═══════════════════════════════════════════════════════════════════════════
# 3. Bank Transactions
#
# Every transaction starts as UNMATCHED (just imported from bank).
# The _simulate_avstemming() function then changes statuses based on
# what the user and Ciri's batch reconciliation would have done.
# ═══════════════════════════════════════════════════════════════════════════

# Each tuple: (tag, date, amount, direction, description, merchant, category, account_idx)
# tag is used by _simulate_avstemming to decide what happened to this transaction
#   "confirmed"  — user confirmed Ciri's suggested match in avstemming
#   "suggested"  — Ciri suggested a match, user hasn't reviewed yet
#   "ignored"    — user marked as private
#   "unmatched"  — no match attempt yet, or no bilag exists
_TXN_DATA = [
    # ─── JANUARY 2025 ───

    # Income (all still unmatched — user hasn't reviewed incoming yet)
    ("unmatched", "2025-01-02", 125000, "credit", "Innbetaling fra Equinor ASA", "Equinor ASA", "inntekt", 0),
    ("unmatched", "2025-01-06", 85000, "credit", "Betaling fra Aker Solutions", "Aker Solutions ASA", "inntekt", 0),
    ("unmatched", "2025-01-15", 42000, "credit", "Betaling Subsea 7 prosjekt Q4", "Subsea 7", "inntekt", 0),

    # Recurring IT — user confirmed these in avstemming (clear matches)
    ("confirmed", "2025-01-03", -699, "debit", "GitHub Team subscription", "GitHub", "kontor", 0),
    ("confirmed", "2025-01-03", -4200, "debit", "Microsoft Azure monthly", "Microsoft Azure", "kontor", 0),
    ("suggested", "2025-01-03", -599, "debit", "Slack Business+", "Slack Technologies", "kontor", 0),
    ("ignored",   "2025-01-05", -149, "debit", "Spotify Premium bedrift", "Spotify", "privat", 0),

    # Office & rent
    ("confirmed", "2025-01-02", -18500, "debit", "Husleie januar Forus kontorlokaler", "Eiendomspartner AS", "leie", 0),
    ("suggested", "2025-01-10", -2340, "debit", "Elkjøp tastatur og mus", "Elkjøp", "kontor", 0),
    ("unmatched", "2025-01-14", -890, "debit", "Clas Ohlson kontorrekvisita", "Clas Ohlson", "kontor", 0),

    # Telecom
    ("confirmed", "2025-01-07", -499, "debit", "Telenor bedrift mobil", "Telenor", "kontor", 0),
    ("unmatched", "2025-01-07", -399, "debit", "Telia bedrift bredbånd", "Telia", "kontor", 0),

    # Insurance
    ("confirmed", "2025-01-08", -3200, "debit", "Gjensidige næringsforsikring", "Gjensidige", "forsikring", 0),

    # Travel
    ("suggested", "2025-01-12", -1250, "debit", "SAS flybillett OSL-SVG", "SAS", "reise", 0),
    ("suggested", "2025-01-12", -890, "debit", "Nordic Choice Hotels Stavanger", "Nordic Choice", "reise", 0),
    ("unmatched", "2025-01-13", -345, "debit", "Ruter mnd-kort", "Ruter", "reise", 0),

    # Supplies
    ("confirmed", "2025-01-09", -12500, "debit", "Komplett.no serverdeler", "Komplett.no", "varekjop", 0),
    ("suggested", "2025-01-11", -6800, "debit", "Dustin AB nettverksutstyr", "Dustin AB", "varekjop", 0),

    # Food (private)
    ("ignored", "2025-01-10", -234, "debit", "Rema 1000 Forus", "Rema 1000", "privat", 0),
    ("ignored", "2025-01-15", -189, "debit", "Kiwi Sentrum", "Kiwi", "privat", 0),
    ("ignored", "2025-01-16", -450, "debit", "Oda.com dagligvarer", "Oda", "privat", 0),

    # Bank fees
    ("confirmed", "2025-01-31", -150, "debit", "DNB gebyr januar", "DNB", "bank", 0),

    # Salary
    ("unmatched", "2025-01-25", -65000, "debit", "Lønn Henrik Berge jan", "Lønn", "lonn", 0),
    ("unmatched", "2025-01-25", -58000, "debit", "Lønn Ingrid Nilsen jan", "Lønn", "lonn", 0),
    ("unmatched", "2025-01-25", -42000, "debit", "Lønn Lars Pedersen jan", "Lønn", "lonn", 0),

    # Tax / AGA
    ("unmatched", "2025-01-20", -28450, "debit", "Skattetrekk januar", "Skatteetaten", "mva", 0),
    ("unmatched", "2025-01-20", -23240, "debit", "Arbeidsgiveravgift jan", "NAV", "lonn", 0),

    # Accounting
    ("unmatched", "2025-01-31", -5900, "debit", "Regnskapsfører jan", "Stavanger Regnskap AS", "kontor", 0),

    # ─── FEBRUARY 2025 ───

    # Income
    ("unmatched", "2025-02-03", 95000, "credit", "Betaling Equinor feb", "Equinor ASA", "inntekt", 0),
    ("unmatched", "2025-02-10", 68000, "credit", "Aker BP konsulenthonorar", "Aker BP", "inntekt", 0),
    ("unmatched", "2025-02-17", 35000, "credit", "TechnipFMC prosjektarbeid", "TechnipFMC", "inntekt", 0),

    # Recurring IT (feb — Ciri suggests based on jan pattern, not yet confirmed)
    ("suggested", "2025-02-03", -699, "debit", "GitHub Team subscription", "GitHub", "kontor", 0),
    ("suggested", "2025-02-03", -4200, "debit", "Microsoft Azure monthly", "Microsoft Azure", "kontor", 0),
    ("unmatched", "2025-02-03", -599, "debit", "Slack Business+", "Slack Technologies", "kontor", 0),
    ("ignored",   "2025-02-05", -149, "debit", "Spotify Premium bedrift", "Spotify", "privat", 0),

    # Office & rent
    ("suggested", "2025-02-01", -18500, "debit", "Husleie februar Forus kontorlokaler", "Eiendomspartner AS", "leie", 0),
    ("unmatched", "2025-02-06", -1590, "debit", "Elkjøp skjerm 27\"", "Elkjøp", "kontor", 0),

    # Telecom
    ("suggested", "2025-02-07", -499, "debit", "Telenor bedrift mobil", "Telenor", "kontor", 0),
    ("unmatched", "2025-02-07", -399, "debit", "Telia bedrift bredbånd", "Telia", "kontor", 0),

    # Insurance
    ("suggested", "2025-02-08", -3200, "debit", "Gjensidige næringsforsikring", "Gjensidige", "forsikring", 0),

    # Travel
    ("unmatched", "2025-02-11", -2100, "debit", "Norwegian flybillett BGO-OSL", "Norwegian", "reise", 0),
    ("unmatched", "2025-02-11", -1450, "debit", "Scandic Nidelven Trondheim", "Scandic Hotels", "reise", 0),
    ("unmatched", "2025-02-12", -560, "debit", "Vy tog TRD-SVG", "Vy", "reise", 0),

    # Supplies
    ("suggested", "2025-02-09", -8900, "debit", "Komplett.no SSD og RAM", "Komplett.no", "varekjop", 0),
    ("unmatched", "2025-02-14", -3400, "debit", "Kjell & Company kabler", "Kjell & Company", "varekjop", 0),

    # Food (private)
    ("ignored",   "2025-02-10", -312, "debit", "Rema 1000 Forus", "Rema 1000", "privat", 0),
    ("ignored",   "2025-02-13", -178, "debit", "Meny Madla", "Meny", "privat", 0),
    ("ignored",   "2025-02-18", -520, "debit", "Oda.com dagligvarer", "Oda", "privat", 0),

    # Bank fees
    ("unmatched", "2025-02-28", -150, "debit", "DNB gebyr februar", "DNB", "bank", 0),

    # Salary
    ("unmatched", "2025-02-25", -65000, "debit", "Lønn Henrik Berge feb", "Lønn", "lonn", 0),
    ("unmatched", "2025-02-25", -58000, "debit", "Lønn Ingrid Nilsen feb", "Lønn", "lonn", 0),
    ("unmatched", "2025-02-25", -42000, "debit", "Lønn Lars Pedersen feb", "Lønn", "lonn", 0),

    # Tax / AGA
    ("unmatched", "2025-02-20", -28450, "debit", "Skattetrekk februar", "Skatteetaten", "mva", 0),
    ("unmatched", "2025-02-20", -23240, "debit", "Arbeidsgiveravgift feb", "NAV", "lonn", 0),

    # Accounting
    ("unmatched", "2025-02-28", -5900, "debit", "Regnskapsfører feb", "Stavanger Regnskap AS", "kontor", 0),

    # ─── Extra variety ───
    ("unmatched", "2025-01-18", -1200, "debit", "Circle K drivstoff", "Circle K", "reise", 0),
    ("unmatched", "2025-01-22", -3500, "debit", "Figma Pro annual", "Figma", "kontor", 0),
    ("unmatched", "2025-01-28", -790, "debit", "Vipps bedrift gebyr", "Vipps", "bank", 0),
    ("unmatched", "2025-02-04", -1100, "debit", "Notion Team plan", "Notion", "kontor", 0),
    ("unmatched", "2025-02-15", -2500, "debit", "Google Workspace", "Google", "kontor", 0),
    ("unmatched", "2025-02-19", -680, "debit", "Wolt bedriftslunsj", "Wolt", "kontor", 0),
    ("unmatched", "2025-02-21", -4500, "debit", "Vercel Pro hosting", "Vercel", "kontor", 0),

    # Nordea
    ("ignored",   "2025-01-15", -50000, "debit", "Overføring til driftskonto", "Intern", "bank", 1),
    ("unmatched", "2025-01-31", 1250, "credit", "Renter sparekonto januar", "Nordea", "inntekt", 1),
    ("unmatched", "2025-02-28", 1310, "credit", "Renter sparekonto februar", "Nordea", "inntekt", 1),
    ("ignored",   "2025-01-02", 100000, "credit", "Innskudd fra eier", "Intern", "inntekt", 1),
    ("ignored",   "2025-02-01", -25000, "debit", "Overføring til driftskonto", "Intern", "bank", 1),

    # ─── MARCH 2025 ───

    # Income
    ("unmatched", "2025-03-03", 110000, "credit", "Betaling Equinor mars", "Equinor ASA", "inntekt", 0),
    ("unmatched", "2025-03-07", 72000, "credit", "Kongsberg Digital prosjekt", "Kongsberg Digital AS", "inntekt", 0),
    ("unmatched", "2025-03-14", 48000, "credit", "Lyse Energi IT-rådgivning", "Lyse Energi AS", "inntekt", 0),
    ("unmatched", "2025-03-21", 29000, "credit", "Nordic Edge samarbeid", "Nordic Edge AS", "inntekt", 0),

    # Recurring IT
    ("suggested", "2025-03-03", -699, "debit", "GitHub Team subscription", "GitHub", "kontor", 0),
    ("suggested", "2025-03-03", -4200, "debit", "Microsoft Azure monthly", "Microsoft Azure", "kontor", 0),
    ("unmatched", "2025-03-03", -599, "debit", "Slack Business+", "Slack Technologies", "kontor", 0),
    ("ignored",   "2025-03-05", -149, "debit", "Spotify Premium bedrift", "Spotify", "privat", 0),

    # Office & rent
    ("suggested", "2025-03-01", -18500, "debit", "Husleie mars Forus kontorlokaler", "Eiendomspartner AS", "leie", 0),
    ("unmatched", "2025-03-08", -3890, "debit", "Elkjøp docking station", "Elkjøp", "kontor", 0),
    ("unmatched", "2025-03-12", -1250, "debit", "IKEA kontorstol", "IKEA", "kontor", 0),

    # Telecom
    ("suggested", "2025-03-07", -499, "debit", "Telenor bedrift mobil", "Telenor", "kontor", 0),
    ("unmatched", "2025-03-07", -399, "debit", "Telia bedrift bredbånd", "Telia", "kontor", 0),

    # Insurance
    ("suggested", "2025-03-08", -3200, "debit", "Gjensidige næringsforsikring", "Gjensidige", "forsikring", 0),

    # Travel
    ("unmatched", "2025-03-10", -3200, "debit", "SAS flybillett SVG-TRD", "SAS", "reise", 0),
    ("unmatched", "2025-03-10", -1690, "debit", "Scandic Bakklandet Trondheim", "Scandic Hotels", "reise", 0),
    ("unmatched", "2025-03-11", -420, "debit", "Taxi Trondheim lufthavn", "Trøndertaxi", "reise", 0),

    # Supplies
    ("unmatched", "2025-03-06", -15800, "debit", "Komplett.no MacBook Pro tilbehør", "Komplett.no", "varekjop", 0),
    ("unmatched", "2025-03-15", -2200, "debit", "Dustin AB lisenser", "Dustin AB", "varekjop", 0),

    # Food (private)
    ("ignored", "2025-03-09", -278, "debit", "Rema 1000 Forus", "Rema 1000", "privat", 0),
    ("ignored", "2025-03-14", -345, "debit", "Meny Madla", "Meny", "privat", 0),

    # Bank fees
    ("unmatched", "2025-03-31", -150, "debit", "DNB gebyr mars", "DNB", "bank", 0),

    # Salary
    ("unmatched", "2025-03-25", -65000, "debit", "Lønn Henrik Berge mars", "Lønn", "lonn", 0),
    ("unmatched", "2025-03-25", -58000, "debit", "Lønn Ingrid Nilsen mars", "Lønn", "lonn", 0),
    ("unmatched", "2025-03-25", -42000, "debit", "Lønn Lars Pedersen mars", "Lønn", "lonn", 0),
    ("unmatched", "2025-03-25", -35000, "debit", "Lønn Maria Hansen mars", "Lønn", "lonn", 0),
    ("unmatched", "2025-03-25", -48000, "debit", "Lønn Erik Johansen mars", "Lønn", "lonn", 0),

    # Tax / AGA
    ("unmatched", "2025-03-20", -34200, "debit", "Skattetrekk mars", "Skatteetaten", "mva", 0),
    ("unmatched", "2025-03-20", -35028, "debit", "Arbeidsgiveravgift mars", "NAV", "lonn", 0),

    # Accounting
    ("unmatched", "2025-03-31", -5900, "debit", "Regnskapsfører mars", "Stavanger Regnskap AS", "kontor", 0),

    # Extra variety — March
    ("unmatched", "2025-03-04", -2500, "debit", "Google Workspace mars", "Google", "kontor", 0),
    ("unmatched", "2025-03-13", -890, "debit", "Canva Pro årlig", "Canva", "kontor", 0),
    ("unmatched", "2025-03-18", -4500, "debit", "Vercel Pro hosting mars", "Vercel", "kontor", 0),
    ("unmatched", "2025-03-19", -1800, "debit", "Linear Team plan", "Linear", "kontor", 0),
    ("unmatched", "2025-03-22", -950, "debit", "1Password Business", "1Password", "kontor", 0),
    ("unmatched", "2025-03-26", -1350, "debit", "Wolt teamlunsj", "Wolt", "kontor", 0),

    # Nordea March
    ("unmatched", "2025-03-31", 1380, "credit", "Renter sparekonto mars", "Nordea", "inntekt", 1),
    ("ignored",   "2025-03-01", -30000, "debit", "Overføring til driftskonto", "Intern", "bank", 1),

    # ─── APRIL 2025 (partial — current month) ───

    # Income
    ("unmatched", "2025-04-02", 115000, "credit", "Betaling Equinor april", "Equinor ASA", "inntekt", 0),
    ("unmatched", "2025-04-08", 55000, "credit", "Stavanger Kommune digitalisering", "Stavanger Kommune", "inntekt", 0),

    # Recurring IT
    ("unmatched", "2025-04-03", -699, "debit", "GitHub Team subscription", "GitHub", "kontor", 0),
    ("unmatched", "2025-04-03", -4200, "debit", "Microsoft Azure monthly", "Microsoft Azure", "kontor", 0),
    ("unmatched", "2025-04-03", -599, "debit", "Slack Business+", "Slack Technologies", "kontor", 0),
    ("ignored",   "2025-04-05", -149, "debit", "Spotify Premium bedrift", "Spotify", "privat", 0),

    # Office & rent
    ("unmatched", "2025-04-01", -18500, "debit", "Husleie april Forus kontorlokaler", "Eiendomspartner AS", "leie", 0),

    # Telecom
    ("unmatched", "2025-04-07", -499, "debit", "Telenor bedrift mobil", "Telenor", "kontor", 0),
    ("unmatched", "2025-04-07", -399, "debit", "Telia bedrift bredbånd", "Telia", "kontor", 0),

    # Insurance
    ("unmatched", "2025-04-08", -3200, "debit", "Gjensidige næringsforsikring", "Gjensidige", "forsikring", 0),

    # Early April extras
    ("unmatched", "2025-04-04", -2500, "debit", "Google Workspace april", "Google", "kontor", 0),
    ("unmatched", "2025-04-06", -12500, "debit", "Komplett.no ny skjerm 34\"", "Komplett.no", "varekjop", 0),
    ("unmatched", "2025-04-09", -780, "debit", "Wolt teamlunsj", "Wolt", "kontor", 0),

    # Food (private)
    ("ignored", "2025-04-03", -195, "debit", "Kiwi Forus", "Kiwi", "privat", 0),
    ("ignored", "2025-04-07", -410, "debit", "Oda.com dagligvarer", "Oda", "privat", 0),
]

# Category → suggested NS 4102 account
_CATEGORY_ACCOUNT_MAP = {
    "inntekt": "3100", "varekjop": "4005", "lonn": "5000",
    "kontor": "6540", "reise": "7140", "mva": "2740",
    "privat": None, "bank": "7770", "forsikring": "6340",
    "leie": "6300", "ukategorisert": None,
}


def _create_bank_transactions() -> list[BankTransaction]:
    """Create all transactions. Status is set based on the tag."""
    now = datetime.now(timezone.utc)
    txns: list[BankTransaction] = []
    balance = Decimal("520000.00")

    for i, (tag, dt_str, amount, direction, desc, merchant, cat, acct_idx) in enumerate(_TXN_DATA):
        d = date.fromisoformat(dt_str)
        amt = Decimal(str(amount))
        if acct_idx == 0:
            balance += amt

        # Map tag → reconciliation status
        status_map = {
            "confirmed": ReconciliationStatus.MATCHED,
            "suggested": ReconciliationStatus.SUGGESTED,
            "ignored":   ReconciliationStatus.IGNORED,
            "unmatched": ReconciliationStatus.UNMATCHED,
        }

        is_confirmed = tag == "confirmed"
        is_private = cat == "privat" or tag == "ignored"

        txn = BankTransaction(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            bank_account_id=DNB_ACCOUNT_ID if acct_idx == 0 else NORDEA_ACCOUNT_ID,
            external_transaction_id=f"TXN-2025-{i+1:04d}",
            booking_date=d,
            value_date=d,
            amount=amt,
            currency="NOK",
            direction=TransactionDirection(direction),
            balance_after=balance if acct_idx == 0 else None,
            raw_description=desc,
            cleaned_description=desc,
            merchant_name=merchant,
            category=TransactionCategory(cat) if cat != "privat" else TransactionCategory.UKATEGORISERT,
            suggested_account=_CATEGORY_ACCOUNT_MAP.get(cat),
            ciri_confidence=0.92 if is_confirmed else 0.75 if tag == "suggested" else None,
            reconciliation_status=status_map[tag],
            reconciled_at=now if is_confirmed else None,
            reconciled_by_ciri=False,  # user confirmed, not auto
            is_private=is_private,
            private_marked_at=now if is_private else None,
            imported_at=now,
        )
        txns.append(txn)

    return txns


# ═══════════════════════════════════════════════════════════════════════════
# 4. Bilags
# ═══════════════════════════════════════════════════════════════════════════

def _create_bilags() -> list[Bilag]:
    now = datetime.now(timezone.utc)
    bilag_data = [
        # (number, date, description, gross, net, mva, mva_code, counterparty, category, status, suggested_account)
        ("2025-00001", "2025-01-02", "Husleie januar kontorlokaler", 18500, 14800, 3700, "3", "Eiendomspartner AS", "leie", "posted", "6300"),
        ("2025-00002", "2025-01-03", "GitHub Team abonnement", 699, 559.20, 139.80, "3", "GitHub Inc", "kontor", "posted", "6540"),
        ("2025-00003", "2025-01-03", "Azure skyplattform januar", 4200, 3360, 840, "3", "Microsoft Ireland", "kontor", "posted", "6540"),
        ("2025-00004", "2025-01-07", "Mobilabonnement bedrift", 499, 399.20, 99.80, "3", "Telenor Norge AS", "kontor", "posted", "6540"),
        ("2025-00005", "2025-01-08", "Næringsforsikring Q1", 3200, 3200, 0, "6", "Gjensidige Forsikring ASA", "forsikring", "posted", "6340"),
        ("2025-00006", "2025-01-09", "Serverdeler til prosjekt", 12500, 10000, 2500, "1", "Komplett Services AS", "varekjop", "posted", "4005"),
        ("2025-00007", "2025-01-10", "Tastatur og mus", 2340, 1872, 468, "1", "Elkjøp Norge AS", "kontor", "approved", "6540"),
        ("2025-00008", "2025-01-12", "Flybillett Stavanger-Oslo", 1250, 1250, 0, "5", "SAS AB", "reise", "approved", "7140"),
        ("2025-00009", "2025-01-12", "Hotell Stavanger 1 natt", 890, 712, 178, "3", "Nordic Choice Hospitality", "reise", "approved", "7140"),
        ("2025-00010", "2025-01-25", "Lønn Henrik Berge januar", 65000, 65000, 0, "0", "Ansatt", "lonn", "posted", "5000"),
        ("2025-00011", "2025-01-25", "Lønn Ingrid Nilsen januar", 58000, 58000, 0, "0", "Ansatt", "lonn", "posted", "5000"),
        ("2025-00012", "2025-01-25", "Lønn Lars Pedersen januar", 42000, 42000, 0, "0", "Ansatt", "lonn", "posted", "5000"),
        ("2025-00013", "2025-01-31", "Bankgebyr januar", 150, 150, 0, "0", "DNB Bank ASA", "bank", "posted", "7770"),
        ("2025-00014", "2025-02-01", "Husleie februar kontorlokaler", 18500, 14800, 3700, "3", "Eiendomspartner AS", "leie", "approved", "6300"),
        ("2025-00015", "2025-02-03", "GitHub Team abonnement feb", 699, 559.20, 139.80, "3", "GitHub Inc", "kontor", "approved", "6540"),
        ("2025-00016", "2025-02-03", "Azure skyplattform februar", 4200, 3360, 840, "3", "Microsoft Ireland", "kontor", "approved", "6540"),
        ("2025-00017", "2025-02-07", "Mobilabonnement bedrift feb", 499, 399.20, 99.80, "3", "Telenor Norge AS", "kontor", "pending", "6540"),
        ("2025-00018", "2025-02-08", "Næringsforsikring feb", 3200, 3200, 0, "6", "Gjensidige Forsikring ASA", "forsikring", "pending", "6340"),
        ("2025-00019", "2025-02-11", "Flybillett Bergen-Oslo", 2100, 2100, 0, "5", "Norwegian Air Shuttle", "reise", "pending", "7140"),
        ("2025-00020", "2025-02-25", "Lønn Henrik Berge februar", 65000, 65000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00021", "2025-02-25", "Lønn Ingrid Nilsen februar", 58000, 58000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00022", "2025-02-25", "Lønn Lars Pedersen februar", 42000, 42000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00023", "2025-02-28", "Bankgebyr februar", 150, 150, 0, "0", "DNB Bank ASA", "bank", "pending", "7770"),
        ("2025-00024", "2025-02-09", "SSD og RAM oppgradering", 8900, 7120, 1780, "1", "Komplett Services AS", "varekjop", "pending", "4005"),
        ("2025-00025", "2025-02-14", "Kabler og adaptere", 3400, 2720, 680, "1", "Kjell & Company AS", "varekjop", "pending", "4005"),

        # ─── MARCH bilags ───
        ("2025-00026", "2025-03-01", "Husleie mars kontorlokaler", 18500, 14800, 3700, "3", "Eiendomspartner AS", "leie", "approved", "6300"),
        ("2025-00027", "2025-03-03", "GitHub Team abonnement mars", 699, 559.20, 139.80, "3", "GitHub Inc", "kontor", "approved", "6540"),
        ("2025-00028", "2025-03-03", "Azure skyplattform mars", 4200, 3360, 840, "3", "Microsoft Ireland", "kontor", "approved", "6540"),
        ("2025-00029", "2025-03-06", "MacBook Pro tilbehør", 15800, 12640, 3160, "1", "Komplett Services AS", "varekjop", "approved", "4005"),
        ("2025-00030", "2025-03-07", "Mobilabonnement bedrift mars", 499, 399.20, 99.80, "3", "Telenor Norge AS", "kontor", "pending", "6540"),
        ("2025-00031", "2025-03-08", "Næringsforsikring mars", 3200, 3200, 0, "6", "Gjensidige Forsikring ASA", "forsikring", "pending", "6340"),
        ("2025-00032", "2025-03-08", "Docking station", 3890, 3112, 778, "1", "Elkjøp Norge AS", "kontor", "pending", "6540"),
        ("2025-00033", "2025-03-10", "Flybillett Stavanger-Trondheim", 3200, 3200, 0, "5", "SAS AB", "reise", "pending", "7140"),
        ("2025-00034", "2025-03-10", "Hotell Trondheim 1 natt", 1690, 1352, 338, "3", "Scandic Hotels", "reise", "pending", "7140"),
        ("2025-00035", "2025-03-12", "Kontorstol IKEA", 1250, 1000, 250, "1", "IKEA Norge AS", "kontor", "pending", "6540"),
        ("2025-00036", "2025-03-15", "Dustin programvarelisenser", 2200, 1760, 440, "1", "Dustin AB", "varekjop", "pending", "4005"),
        ("2025-00037", "2025-03-25", "Lønn Henrik Berge mars", 65000, 65000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00038", "2025-03-25", "Lønn Ingrid Nilsen mars", 58000, 58000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00039", "2025-03-25", "Lønn Lars Pedersen mars", 42000, 42000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00040", "2025-03-25", "Lønn Maria Hansen mars", 35000, 35000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00041", "2025-03-25", "Lønn Erik Johansen mars", 48000, 48000, 0, "0", "Ansatt", "lonn", "pending", "5000"),
        ("2025-00042", "2025-03-31", "Bankgebyr mars", 150, 150, 0, "0", "DNB Bank ASA", "bank", "pending", "7770"),
        ("2025-00043", "2025-03-31", "Regnskapsfører mars", 5900, 4720, 1180, "3", "Stavanger Regnskap AS", "kontor", "pending", "6700"),

        # ─── APRIL bilags (partial) ───
        ("2025-00044", "2025-04-01", "Husleie april kontorlokaler", 18500, 14800, 3700, "3", "Eiendomspartner AS", "leie", "pending", "6300"),
        ("2025-00045", "2025-04-03", "GitHub Team abonnement april", 699, 559.20, 139.80, "3", "GitHub Inc", "kontor", "pending", "6540"),
        ("2025-00046", "2025-04-03", "Azure skyplattform april", 4200, 3360, 840, "3", "Microsoft Ireland", "kontor", "pending", "6540"),
        ("2025-00047", "2025-04-06", "Ny skjerm 34\"", 12500, 10000, 2500, "1", "Komplett Services AS", "varekjop", "pending", "4005"),
        ("2025-00048", "2025-04-07", "Mobilabonnement bedrift april", 499, 399.20, 99.80, "3", "Telenor Norge AS", "kontor", "pending", "6540"),
        ("2025-00049", "2025-04-08", "Næringsforsikring april", 3200, 3200, 0, "6", "Gjensidige Forsikring ASA", "forsikring", "pending", "6340"),
    ]

    bilags = []
    for (bnum, dt_str, desc, gross, net, mva, mva_code, counterparty, cat, status, suggested) in bilag_data:
        d = date.fromisoformat(dt_str)
        bilags.append(Bilag(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            bilag_number=bnum,
            document_date=d,
            receipt_date=datetime(d.year, d.month, d.day, 10, 0, 0, tzinfo=timezone.utc),
            description=desc,
            gross_amount=Decimal(str(gross)),
            net_amount=Decimal(str(net)),
            mva_amount=Decimal(str(mva)),
            mva_code=mva_code,
            counterparty_name=counterparty,
            category=cat,
            suggested_account=suggested,
            file_path=f"/uploads/{bnum}.pdf",
            file_hash_sha256="a" * 64,
            original_filename=f"{bnum}_{counterparty.replace(' ', '_')}.pdf",
            mime_type="application/pdf",
            ocr_confidence=0.95,
            status=BilagStatus(status),
            created_by_ciri=True,
            ciri_confidence=0.93,
            created_at=now,
            updated_at=now,
            posted_at=now if status == "posted" else None,
        ))

    # ── Periodisering candidate: annual insurance ──
    bilags.append(Bilag(
        id=uuid.uuid4(),
        company_id=COMPANY_ID,
        bilag_number="2025-00050",
        document_date=date(2025, 3, 25),
        receipt_date=datetime(2025, 3, 25, 10, 0, 0, tzinfo=timezone.utc),
        description="Tryg næringsforsikring — årspolise 2025",
        gross_amount=Decimal("38400"),
        net_amount=Decimal("38400"),
        mva_amount=Decimal("0"),
        mva_code="6",
        counterparty_name="Tryg Forsikring AS",
        category="forsikring",
        suggested_account="6340",
        file_path="/uploads/2025-00050.pdf",
        file_hash_sha256="b" * 64,
        original_filename="2025-00050_Tryg_Forsikring_AS.pdf",
        mime_type="application/pdf",
        ocr_confidence=0.96,
        status=BilagStatus.POSTED,
        created_by_ciri=True,
        ciri_confidence=0.94,
        ciri_reasoning="Årspolise fra Tryg — forsikringspremie for hele 2025. Ciri foreslår periodisering over 12 måneder.",
        periodisering_suggestion={
            "is_candidate": True,
            "confidence": 0.94,
            "reason": "Årlig næringsforsikring som dekker hele 2025. Premien bør fordeles over 12 måneder i henhold til sammenstillingsprinsippet.",
            "legal_basis": "Regnskapsloven § 4-1 nr. 3 (sammenstillingsprinsippet)",
            "category": "forsikring",
            "total_amount": 38400.0,
            "period_count": 12,
            "start_period": "2025-01",
            "end_period": "2025-12",
            "monthly_amount": 3200.0,
            "remainder": 0.0,
            "expense_account": "6340",
            "balance_account": "1700",
            "direction": "kostnad",
            "dismissed": False,
            "accepted": False,
        },
        periodisering_scanned_at=now,
        created_at=now,
        updated_at=now,
        posted_at=now,
    ))

    # ── Second periodisering candidate: annual software license ──
    bilags.append(Bilag(
        id=uuid.uuid4(),
        company_id=COMPANY_ID,
        bilag_number="2025-00051",
        document_date=date(2025, 3, 20),
        receipt_date=datetime(2025, 3, 20, 10, 0, 0, tzinfo=timezone.utc),
        description="JetBrains All Products Pack — årslisens",
        gross_amount=Decimal("7490"),
        net_amount=Decimal("7490"),
        mva_amount=Decimal("0"),
        mva_code="86",
        counterparty_name="JetBrains s.r.o.",
        category="it",
        suggested_account="6540",
        file_path="/uploads/2025-00051.pdf",
        file_hash_sha256="c" * 64,
        original_filename="2025-00051_JetBrains.pdf",
        mime_type="application/pdf",
        ocr_confidence=0.97,
        status=BilagStatus.POSTED,
        created_by_ciri=True,
        ciri_confidence=0.91,
        ciri_reasoning="Årlig programvarelisens fra JetBrains. Dekker 12 måneder — kan periodiseres.",
        periodisering_suggestion={
            "is_candidate": True,
            "confidence": 0.88,
            "reason": "Årlig programvarelisens (All Products Pack) som dekker mars 2025 til februar 2026. Bør fordeles over 12 måneder.",
            "legal_basis": "Regnskapsloven § 4-1 nr. 3 (sammenstillingsprinsippet)",
            "category": "lisens",
            "total_amount": 7490.0,
            "period_count": 12,
            "start_period": "2025-03",
            "end_period": "2026-02",
            "monthly_amount": 624.17,
            "remainder": -0.04,
            "expense_account": "6540",
            "balance_account": "1700",
            "direction": "kostnad",
            "dismissed": False,
            "accepted": False,
        },
        periodisering_scanned_at=now,
        created_at=now,
        updated_at=now,
        posted_at=now,
    ))

    return bilags


# ═══════════════════════════════════════════════════════════════════════════
# 5. Posteringer (double-entry for posted/approved bilags)
# ═══════════════════════════════════════════════════════════════════════════

def _create_posteringer(bilags: list[Bilag]) -> list[Postering]:
    posteringer = []
    for i, bilag in enumerate(bilags):
        if bilag.status not in (BilagStatus.POSTED, BilagStatus.APPROVED):
            continue

        journal_id = f"J-2025-{i+1:04d}"
        acct = bilag.suggested_account or "6540"

        # Debit expense account
        posteringer.append(Postering(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=bilag.document_date,
            period=bilag.document_date.strftime("%Y-%m"),
            account_number=acct,
            description=bilag.description,
            debit_amount=bilag.net_amount,
            credit_amount=Decimal("0"),
            mva_code=bilag.mva_code if bilag.mva_amount > 0 else None,
            mva_amount=Decimal("0"),
            saft_transaction_id=f"SAFT-2025-{i*3+1:05d}",
            created_by_ciri=True,
        ))

        # Credit bank account
        posteringer.append(Postering(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=bilag.document_date,
            period=bilag.document_date.strftime("%Y-%m"),
            account_number="1920",
            description=bilag.description,
            debit_amount=Decimal("0"),
            credit_amount=bilag.gross_amount,
            saft_transaction_id=f"SAFT-2025-{i*3+2:05d}",
            created_by_ciri=True,
        ))

        # MVA entry
        if bilag.mva_amount > 0:
            posteringer.append(Postering(
                id=uuid.uuid4(),
                company_id=COMPANY_ID,
                bilag_id=bilag.id,
                journal_id=journal_id,
                posting_date=bilag.document_date,
                period=bilag.document_date.strftime("%Y-%m"),
                account_number="2710",
                description=f"Inngående MVA - {bilag.description}",
                debit_amount=bilag.mva_amount,
                credit_amount=Decimal("0"),
                mva_code=bilag.mva_code,
                mva_amount=bilag.mva_amount,
                saft_transaction_id=f"SAFT-2025-{i*3+3:05d}",
                created_by_ciri=True,
            ))

    return posteringer


# ═══════════════════════════════════════════════════════════════════════════
# 6. Simulate Avstemming
#
# Creates matches and cluster data points only — NO rules.
# Rules are created by the user through the UI (regler page, confirm, etc.)
# ═══════════════════════════════════════════════════════════════════════════

def _simulate_avstemming(
    transactions: list[BankTransaction],
    bilags: list[Bilag],
) -> tuple[list[ReconciliationMatch], list[ClusterDataPoint]]:
    """
    Simulate matches and clusters from avstemming.
    No rules — those come from user actions in the UI.
    """
    now = datetime.now(timezone.utc)
    matches: list[ReconciliationMatch] = []
    clusters: list[ClusterDataPoint] = []

    # Build bilag lookup: amount → list of bilags (for matching)
    bilag_by_amount: dict[Decimal, list[Bilag]] = defaultdict(list)
    for b in bilags:
        bilag_by_amount[abs(b.gross_amount)].append(b)
    used_bilag_ids: set[uuid.UUID] = set()

    for txn in transactions:
        tag = _get_txn_tag(txn)
        if tag not in ("confirmed", "suggested"):
            continue

        # Find matching bilag by amount
        abs_amt = abs(txn.amount)
        candidates = bilag_by_amount.get(abs_amt, [])
        bilag = None
        for b in candidates:
            if b.id not in used_bilag_ids:
                bilag = b
                break

        if bilag is None:
            continue

        used_bilag_ids.add(bilag.id)

        # ── Create ReconciliationMatch ──
        is_confirmed = tag == "confirmed"
        match = ReconciliationMatch(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            bank_transaction_id=txn.id,
            bilag_id=bilag.id,
            match_type=MatchType.ONE_TO_ONE,
            confidence=MatchConfidence.HIGH if is_confirmed else MatchConfidence.MEDIUM,
            confidence_score=Decimal("0.92") if is_confirmed else Decimal("0.75"),
            status=MatchStatus.CONFIRMED if is_confirmed else MatchStatus.SUGGESTED,
            transaction_amount=txn.amount,
            matched_amount=txn.amount,
            difference=Decimal("0"),
            match_factors={
                "amount_match": True,
                "description_similarity": True,
                "date_proximity": True,
            },
            ciri_explanation=f"Beløpet {abs_amt} kr matcher bilag {bilag.bilag_number} ({bilag.counterparty_name})",
            confirmed_at=now if is_confirmed else None,
        )
        matches.append(match)

        if not is_confirmed:
            continue

        # ── Cluster data point from confirmed match ──
        merchant_key = _extract_key_pattern(txn.raw_description)
        account = bilag.suggested_account or "0000"
        category = bilag.category or "ukategorisert"
        tx_direction = "debit" if float(txn.amount) < 0 else "credit"

        clusters.append(ClusterDataPoint(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            account_number=account,
            category=category,
            merchant_name=txn.merchant_name,
            description_key=merchant_key.lower(),
            amount=Decimal(str(abs(float(txn.amount)))),
            direction=tx_direction,
            source=DataPointSource.USER_CONFIRMED,
            match_id=match.id,
            transaction_id=txn.id,
            confirmed_at=datetime.utcnow(),
        ))

    return matches, clusters


def _get_txn_tag(txn: BankTransaction) -> str:
    """Recover the original tag from the transaction's status."""
    if txn.reconciliation_status == ReconciliationStatus.MATCHED:
        return "confirmed"
    elif txn.reconciliation_status == ReconciliationStatus.SUGGESTED:
        return "suggested"
    elif txn.reconciliation_status == ReconciliationStatus.IGNORED:
        return "ignored"
    return "unmatched"


def _extract_key_pattern(description: str) -> str:
    """
    Extract a key pattern from description for rule matching.
    Mirrors ReconciliationMatcher._extract_key_pattern_static().
    """
    desc = description.upper()
    for prefix in ["VIPPS*", "VIPPS ", "KORTBETALING ", "NETTBANK ", "GIRO "]:
        if desc.startswith(prefix):
            desc = desc[len(prefix):]
    words = desc.split()
    if words:
        key_words = [w for w in words[:3] if not w.isdigit() and len(w) > 2]
        if key_words:
            return key_words[0]
    return desc[:20]


# ═══════════════════════════════════════════════════════════════════════════
# 7. Employees
# ═══════════════════════════════════════════════════════════════════════════

def _create_employees() -> list[Employee]:
    return [
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="12345678901",
            first_name="Henrik",
            last_name="Berge",
            email="henrik@minbedrift.no",
            phone="90012345",
            position="Daglig leder",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2020, 1, 1),
            monthly_salary=Decimal("65000"),
            tax_table="7100",
            tax_percentage=Decimal("34.0"),
            tax_municipality="1103",
            bank_account="12340067890",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
        ),
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="23456789012",
            first_name="Ingrid",
            last_name="Nilsen",
            email="ingrid@minbedrift.no",
            phone="90023456",
            position="Seniorutvikler",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2021, 6, 1),
            monthly_salary=Decimal("58000"),
            tax_table="7100",
            tax_percentage=Decimal("32.0"),
            tax_municipality="1103",
            bank_account="98760054321",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
        ),
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="34567890123",
            first_name="Lars",
            last_name="Pedersen",
            email="lars@minbedrift.no",
            phone="90034567",
            position="Juniorutvikler",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2023, 8, 15),
            monthly_salary=Decimal("42000"),
            tax_table="7100",
            tax_percentage=Decimal("28.0"),
            tax_municipality="1103",
            bank_account="45670012345",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
        ),
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="45678901234",
            first_name="Maria",
            last_name="Hansen",
            email="maria@minbedrift.no",
            phone="90045678",
            position="UX Designer",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2024, 3, 1),
            monthly_salary=Decimal("35000"),
            tax_table="7100",
            tax_percentage=Decimal("26.0"),
            tax_municipality="1103",
            bank_account="56780023456",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
        ),
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="56789012345",
            first_name="Erik",
            last_name="Johansen",
            email="erik@minbedrift.no",
            phone="90056789",
            position="DevOps-ingeniør",
            employment_type=EmploymentType.FAST,
            status=EmployeeStatus.ACTIVE,
            start_date=date(2024, 9, 1),
            monthly_salary=Decimal("48000"),
            tax_table="7100",
            tax_percentage=Decimal("30.0"),
            tax_municipality="1103",
            bank_account="67890034567",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
        ),
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="67890123456",
            first_name="Kari",
            last_name="Olsen",
            email="kari@minbedrift.no",
            phone="90067890",
            position="Prosjektleder",
            employment_type=EmploymentType.DELTID,
            status=EmployeeStatus.PARENTAL_LEAVE,
            start_date=date(2022, 1, 15),
            monthly_salary=Decimal("52000"),
            hourly_rate=Decimal("325"),
            tax_table="7100",
            tax_percentage=Decimal("31.0"),
            tax_municipality="1103",
            bank_account="78900045678",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
            notes="Foreldrepermisjon fra 01.02.2025",
        ),
        Employee(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            personnummer="78901234567",
            first_name="Thomas",
            last_name="Strand",
            email="thomas@minbedrift.no",
            phone="90078901",
            position="Sommerpraktikant",
            employment_type=EmploymentType.VIKAR,
            status=EmployeeStatus.TERMINATED,
            start_date=date(2024, 6, 1),
            end_date=date(2024, 8, 31),
            monthly_salary=Decimal("28000"),
            tax_table="7100",
            tax_percentage=Decimal("22.0"),
            tax_municipality="1103",
            bank_account="89010056789",
            feriepenger_rate=Decimal("12.0"),
            otp_percentage=Decimal("2.0"),
            notes="Sommervikar 2024, kontrakt avsluttet",
        ),
    ]


# ═══════════════════════════════════════════════════════════════════════════
# 8. Payslips
# ═══════════════════════════════════════════════════════════════════════════

def _create_payslips(employees: list[Employee]) -> list[Payslip]:
    payslips = []
    for emp in employees:
        # Skip terminated employees (they have no 2025 payslips)
        if emp.status == EmployeeStatus.TERMINATED:
            continue

        # Parental leave employees only get January
        months = [1] if emp.status == EmployeeStatus.PARENTAL_LEAVE else [1, 2, 3]

        for month in months:
            gross = emp.monthly_salary
            tax_pct = emp.tax_percentage or Decimal("30.0")
            tax = (gross * tax_pct / 100).quantize(Decimal("1.00"))
            net = gross - tax
            aga = (gross * Decimal("14.1") / 100).quantize(Decimal("1.00"))
            otp = (gross * (emp.otp_percentage or Decimal("2.0")) / 100).quantize(Decimal("1.00"))
            feriepenger = (gross * (emp.feriepenger_rate or Decimal("12.0")) / 100).quantize(Decimal("1.00"))

            payslips.append(Payslip(
                id=uuid.uuid4(),
                employee_id=emp.id,
                company_id=COMPANY_ID,
                year=2025,
                month=month,
                gross_salary=gross,
                tax_deduction=tax,
                other_deductions=Decimal("0"),
                net_salary=net,
                arbeidsgiveravgift=aga,
                otp_contribution=otp,
                feriepenger_accrual=feriepenger,
                paid_at=datetime(2025, month, 25, 12, 0, 0),
                payment_reference=f"LONN-2025-{month:02d}-{emp.last_name.upper()[:3]}",
                amelding_submitted=month <= 2,
                amelding_reference=f"AM-2025-{month:02d}-{emp.last_name[:3].upper()}" if month <= 2 else None,
            ))
    return payslips


# ═══════════════════════════════════════════════════════════════════════════
# 9. Invoices
# ═══════════════════════════════════════════════════════════════════════════

def _create_invoices() -> list[Invoice]:
    invoice_data = [
        ("F-0001", "Equinor ASA", "regnskap@equinor.com", "Konsulentbistand prosjekt Nordsjøen Q4 2024", 125000, 25, "paid", "2025-01-02", "2025-02-01"),
        ("F-0002", "Aker Solutions ASA", "faktura@akersolutions.com", "Systemutvikling november-desember 2024", 85000, 25, "paid", "2025-01-06", "2025-02-05"),
        ("F-0003", "Subsea 7 Norway", "ap@subsea7.com", "Prosjektbistand Q4 sluttfaktura", 42000, 25, "paid", "2025-01-15", "2025-02-14"),
        ("F-0004", "Equinor ASA", "regnskap@equinor.com", "Konsulentbistand januar 2025", 95000, 25, "viewed", "2025-02-03", "2025-03-03"),
        ("F-0005", "Aker BP ASA", "invoice@akerbp.com", "Teknisk rådgivning jan 2025", 68000, 25, "sent", "2025-02-10", "2025-03-10"),
        ("F-0006", "TechnipFMC plc", "accounts@technipfmc.com", "Prosjektarbeid fase 2", 35000, 25, "sent", "2025-02-17", "2025-03-17"),
        ("F-0007", "Kongsberg Digital AS", "faktura@kongsberg.com", "Digital tvillingmodell utvikling", 52000, 25, "viewed", "2025-02-20", "2025-03-20"),
        ("F-0008", "Lyse Energi AS", "regnskap@lyse.no", "IT-konsulentbistand feb 2025", 38000, 25, "sent", "2025-02-22", "2025-03-22"),
        ("F-0009", "Stavanger Kommune", "faktura@stavanger.kommune.no", "Digitalisering pilot", 45000, 0, "draft", "2025-02-25", "2025-03-25"),
        ("F-0010", "Nordic Edge AS", "admin@nordicedge.org", "Smart City konferansebidrag", 15000, 25, "draft", "2025-02-28", "2025-03-28"),
        # March invoices
        ("F-0011", "Equinor ASA", "regnskap@equinor.com", "Konsulentbistand februar 2025", 110000, 25, "sent", "2025-03-03", "2025-04-02"),
        ("F-0012", "Kongsberg Digital AS", "faktura@kongsberg.com", "Digital tvilling fase 2 ferdigstilt", 72000, 25, "sent", "2025-03-07", "2025-04-06"),
        ("F-0013", "Lyse Energi AS", "regnskap@lyse.no", "IT-rådgivning mars 2025", 48000, 25, "viewed", "2025-03-14", "2025-04-13"),
        ("F-0014", "Nordic Edge AS", "admin@nordicedge.org", "Workshop fasilitering Q1", 29000, 25, "sent", "2025-03-21", "2025-04-20"),
        # April invoices
        ("F-0015", "Equinor ASA", "regnskap@equinor.com", "Konsulentbistand mars 2025", 115000, 25, "draft", "2025-04-02", "2025-05-02"),
        ("F-0016", "Stavanger Kommune", "faktura@stavanger.kommune.no", "Digitalisering fase 2", 55000, 0, "draft", "2025-04-08", "2025-05-08"),
    ]

    invoices = []
    for (num, customer, email, desc, amount, mva_rate, status, created_str, due_str) in invoice_data:
        amt = Decimal(str(amount))
        mva = (amt * mva_rate / 100).quantize(Decimal("1.00"))
        total = amt + mva
        created_d = date.fromisoformat(created_str)
        due_d = date.fromisoformat(due_str)
        status_enum = InvoiceStatus(status)

        inv = Invoice(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            invoice_number=num,
            customer_name=customer,
            customer_email=email,
            description=desc,
            amount=amt,
            mva_rate=mva_rate,
            mva_amount=mva,
            total_amount=total,
            due_date=due_d,
            bank_account="12345678903",
            kid_number=f"00{num.replace('F-', '').replace('-', '')}01" if status != "draft" else None,
            status=status_enum,
            sent_at=datetime(created_d.year, created_d.month, created_d.day, 9, 0, 0, tzinfo=timezone.utc) if status in ("sent", "viewed", "paid") else None,
            viewed_at=(datetime(created_d.year, created_d.month, created_d.day, 14, 30, 0, tzinfo=timezone.utc) + timedelta(days=2)) if status in ("viewed", "paid") else None,
            viewed_count=3 if status == "viewed" else 1 if status == "paid" else 0,
            paid_at=(datetime(created_d.year, created_d.month, created_d.day, 10, 0, 0, tzinfo=timezone.utc) + timedelta(days=15)) if status == "paid" else None,
            created_at=datetime(created_d.year, created_d.month, created_d.day, 8, 0, 0, tzinfo=timezone.utc),
        )
        invoices.append(inv)
    return invoices


# ═══════════════════════════════════════════════════════════════════════════
# 10. Notifications
# ═══════════════════════════════════════════════════════════════════════════

def _create_reconciliation_rules() -> list[ReconciliationRule]:
    """Create reconciliation rules — both user-created and AI-learned."""
    now = datetime.now(timezone.utc)
    return [
        # User-created rules
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Spotify → privat",
            description="Spotify-abonnement er personlig, ikke bedriftsrelatert",
            rule_type=RuleType.IGNORE,
            priority=RulePriority.HIGH,
            criteria={
                "description_contains": "Spotify",
                "direction": "debit",
                "amount_max": 200,
            },
            action={
                "mark_private": True,
                "reason": "Personlig abonnement",
            },
            counterparty_mapping={
                "raw_patterns": ["SPOTIFY*", "SPOTIFY PREMIUM", "SPOTIFY AB"],
                "normalized_name": "Spotify AB",
            },
            is_active=True,
            learned_from_user=False,
            times_applied=4,
            last_applied_at=now - timedelta(days=5),
            times_overridden=0,
            created_at=now - timedelta(days=60),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Dagligvarer → privat",
            description="Dagligvarehandel (Rema, Kiwi, Meny, Oda) er privat",
            rule_type=RuleType.IGNORE,
            priority=RulePriority.HIGH,
            criteria={
                "description_contains": "Rema 1000|Kiwi|Meny|Oda.com",
                "direction": "debit",
                "amount_max": 1000,
            },
            action={
                "mark_private": True,
                "reason": "Dagligvarehandel, privat utgift",
            },
            is_active=True,
            learned_from_user=False,
            times_applied=9,
            last_applied_at=now - timedelta(days=3),
            times_overridden=0,
            created_at=now - timedelta(days=55),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Husleie → 6300",
            description="Månedlig husleie kontorkontor kategoriseres automatisk",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.HIGH,
            criteria={
                "description_contains": "Husleie",
                "merchant_name": "Eiendomspartner AS",
                "direction": "debit",
                "amount_exact": 18500,
            },
            action={
                "category": "leie",
                "account": "6300",
                "mva_code": "3",
            },
            counterparty_mapping={
                "raw_patterns": ["EIENDOMSPARTNER", "HUSLEIE FORUS"],
                "normalized_name": "Eiendomspartner AS",
            },
            is_active=True,
            learned_from_user=False,
            times_applied=4,
            last_applied_at=now - timedelta(days=1),
            times_overridden=0,
            created_at=now - timedelta(days=58),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="GitHub → 6540 Kontor IT",
            description="GitHub Team-abonnement kategoriseres som kontorkostnad IT",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.MEDIUM,
            criteria={
                "description_contains": "GitHub",
                "direction": "debit",
                "amount_exact": 699,
            },
            action={
                "category": "kontor",
                "account": "6540",
                "mva_code": "3",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=4,
            last_applied_at=now - timedelta(days=3),
            times_overridden=0,
            confidence_threshold=0.85,
            created_at=now - timedelta(days=50),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Azure → 6540 Kontor IT",
            description="Microsoft Azure månedskostnad",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.MEDIUM,
            criteria={
                "description_contains": "Azure",
                "merchant_name": "Microsoft Azure",
                "direction": "debit",
            },
            action={
                "category": "kontor",
                "account": "6540",
                "mva_code": "3",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=4,
            last_applied_at=now - timedelta(days=3),
            times_overridden=0,
            confidence_threshold=0.90,
            created_at=now - timedelta(days=50),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Telenor → 6540 Kontor",
            description="Telenor bedriftsmobil kategoriseres som kontorkostnad",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.MEDIUM,
            criteria={
                "description_contains": "Telenor",
                "direction": "debit",
                "amount_max": 600,
            },
            action={
                "category": "kontor",
                "account": "6540",
                "mva_code": "3",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=3,
            last_applied_at=now - timedelta(days=7),
            times_overridden=0,
            confidence_threshold=0.88,
            created_at=now - timedelta(days=45),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Gjensidige → 6340 Forsikring",
            description="Gjensidige næringsforsikring",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.MEDIUM,
            criteria={
                "description_contains": "Gjensidige",
                "direction": "debit",
                "amount_exact": 3200,
            },
            action={
                "category": "forsikring",
                "account": "6340",
                "mva_code": "6",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=3,
            last_applied_at=now - timedelta(days=8),
            times_overridden=0,
            confidence_threshold=0.92,
            created_at=now - timedelta(days=40),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="DNB gebyr → 7770 Bankgebyr",
            description="DNB månedlig bankgebyr",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.LOW,
            criteria={
                "description_contains": "DNB gebyr",
                "direction": "debit",
                "amount_exact": 150,
            },
            action={
                "category": "bank",
                "account": "7770",
                "mva_code": "0",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=1,
            last_applied_at=now - timedelta(days=30),
            times_overridden=0,
            confidence_threshold=0.95,
            created_at=now - timedelta(days=30),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Interne overføringer → ignorer",
            description="Overføringer mellom egne kontoer trenger ikke bilag",
            rule_type=RuleType.IGNORE,
            priority=RulePriority.HIGH,
            criteria={
                "description_contains": "Overføring til driftskonto|Innskudd fra eier",
                "merchant_name": "Intern",
            },
            action={
                "mark_private": False,
                "reason": "Intern overføring mellom egne kontoer",
            },
            is_active=True,
            learned_from_user=False,
            times_applied=3,
            last_applied_at=now - timedelta(days=10),
            times_overridden=0,
            created_at=now - timedelta(days=55),
        ),
        ReconciliationRule(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            name="Komplett.no → 4005 Varekjøp",
            description="Komplett.no innkjøp kategoriseres som varekjøp",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.MEDIUM,
            criteria={
                "description_contains": "Komplett",
                "direction": "debit",
            },
            action={
                "category": "varekjop",
                "account": "4005",
                "mva_code": "1",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=3,
            last_applied_at=now - timedelta(days=5),
            times_overridden=1,
            confidence_threshold=0.80,
            created_at=now - timedelta(days=48),
        ),
    ]


def _create_audit_logs(
    bilags: list[Bilag],
    invoices: list[Invoice],
    employees: list[Employee],
) -> list[AuditLog]:
    """Create realistic audit log entries across the system's lifetime."""
    now = datetime.now(timezone.utc)
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000002")  # test user
    logs = []

    # System startup / login events
    for days_ago in [60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 7, 5, 3, 2, 1, 0]:
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=now - timedelta(days=days_ago, hours=8),
            user_id=user_id,
            company_id=COMPANY_ID,
            action="login",
            resource_type="session",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/131",
        ))

    # Bilag creation events (Ciri auto-created from email)
    for i, bilag in enumerate(bilags[:15]):
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=bilag.created_at + timedelta(seconds=i),
            company_id=COMPANY_ID,
            action="create",
            resource_type="bilag",
            resource_id=str(bilag.id),
            details={
                "bilag_number": bilag.bilag_number,
                "description": bilag.description,
                "amount": str(bilag.gross_amount),
                "source": "email_pipeline",
            },
            created_by_ciri=True,
        ))

    # Bilag approval events
    for bilag in bilags:
        if bilag.status in (BilagStatus.POSTED, BilagStatus.APPROVED):
            logs.append(AuditLog(
                id=uuid.uuid4(),
                timestamp=bilag.created_at + timedelta(hours=2),
                user_id=user_id,
                company_id=COMPANY_ID,
                action="update",
                resource_type="bilag",
                resource_id=str(bilag.id),
                details={
                    "bilag_number": bilag.bilag_number,
                    "before": {"status": "pending"},
                    "after": {"status": bilag.status.value},
                },
                ip_address="192.168.1.100",
            ))

    # Invoice events
    for inv in invoices:
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=inv.created_at,
            user_id=user_id,
            company_id=COMPANY_ID,
            action="create",
            resource_type="invoice",
            resource_id=str(inv.id),
            details={
                "invoice_number": inv.invoice_number,
                "customer": inv.customer_name,
                "total": str(inv.total_amount),
            },
            ip_address="192.168.1.100",
        ))
        if inv.sent_at:
            logs.append(AuditLog(
                id=uuid.uuid4(),
                timestamp=inv.sent_at,
                user_id=user_id,
                company_id=COMPANY_ID,
                action="export",
                resource_type="invoice",
                resource_id=str(inv.id),
                details={
                    "invoice_number": inv.invoice_number,
                    "sent_to": inv.customer_email,
                    "action": "email_sent",
                },
                ip_address="192.168.1.100",
            ))

    # Employee events
    for emp in employees:
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=now - timedelta(days=60),
            user_id=user_id,
            company_id=COMPANY_ID,
            action="create",
            resource_type="employee",
            resource_id=str(emp.id),
            details={
                "name": f"{emp.first_name} {emp.last_name}",
                "position": emp.position,
                "type": emp.employment_type.value,
            },
            ip_address="192.168.1.100",
        ))

    # Bank sync events
    for days_ago in [30, 25, 20, 15, 10, 5, 1]:
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=now - timedelta(days=days_ago, hours=6),
            company_id=COMPANY_ID,
            action="create",
            resource_type="bank_sync",
            resource_id=str(DNB_ACCOUNT_ID),
            details={
                "bank": "DNB",
                "transactions_imported": 5 + (days_ago % 4),
                "account": "Driftskonto",
            },
            created_by_ciri=True,
        ))

    # Reconciliation batch runs
    for days_ago in [28, 21, 14, 7, 1]:
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=now - timedelta(days=days_ago, hours=3),
            company_id=COMPANY_ID,
            action="create",
            resource_type="reconciliation_run",
            details={
                "matches_suggested": 8 + (days_ago % 5),
                "auto_confirmed": 2,
                "confidence_avg": 0.82,
            },
            created_by_ciri=True,
        ))

    # Report views
    for days_ago in [14, 7, 3, 1]:
        logs.append(AuditLog(
            id=uuid.uuid4(),
            timestamp=now - timedelta(days=days_ago, hours=10),
            user_id=user_id,
            company_id=COMPANY_ID,
            action="view",
            resource_type="report",
            details={
                "report_type": "resultatregnskap" if days_ago % 2 == 0 else "balanse",
                "period": "2025-Q1",
            },
            ip_address="192.168.1.100",
        ))

    return logs


def _create_notifications(invoices: list[Invoice], bilags: list[Bilag] | None = None) -> list[Notification]:
    now = datetime.now(timezone.utc)

    # Find periodisering candidate bilags for notifications
    periodisering_notifications = []
    if bilags:
        for b in bilags:
            if b.periodisering_suggestion and b.periodisering_suggestion.get("is_candidate") and not b.periodisering_suggestion.get("accepted") and not b.periodisering_suggestion.get("dismissed"):
                s = b.periodisering_suggestion
                cat = s.get("category", "kostnad")
                total = s.get("total_amount", 0)
                months = s.get("period_count", 0)
                periodisering_notifications.append(Notification(
                    id=uuid.uuid4(),
                    company_id=COMPANY_ID,
                    title=f"Periodiseringsforslag: {b.description[:50]}",
                    message=f"Ciri foreslår å fordele kostnaden på kr {total:,.0f} over {months} måneder ({cat}). Klikk for å gjennomgå.",
                    type="periodisering_suggestion",
                    reference_id=str(b.id),
                    is_read=False,
                    created_at=now - timedelta(minutes=42),
                ))

    return periodisering_notifications + [
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Faktura F-0004 åpnet",
            message="Equinor ASA har åpnet faktura F-0004 på 118 750 kr",
            type="invoice_viewed",
            reference_id=str(invoices[3].id),
            is_read=False,
            created_at=now - timedelta(hours=2),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Faktura F-0007 åpnet",
            message="Kongsberg Digital AS har åpnet faktura F-0007 på 65 000 kr",
            type="invoice_viewed",
            reference_id=str(invoices[6].id),
            is_read=False,
            created_at=now - timedelta(hours=5),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Faktura F-0003 betalt",
            message="Subsea 7 Norway har betalt faktura F-0003 — 52 500 kr mottatt",
            type="invoice_paid",
            reference_id=str(invoices[2].id),
            is_read=False,
            created_at=now - timedelta(days=1),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Banksynkronisering fullført",
            message="DNB driftskonto oppdatert — 5 nye transaksjoner importert",
            type="bank_sync",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=1, hours=6),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="MVA-termin nærmer seg",
            message="MVA for 1. termin (jan-feb) skal leveres innen 10. april",
            type="mva_reminder",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=2),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Lønnskjøring fullført",
            message="Lønn for februar 2025 er utbetalt til 3 ansatte",
            type="payroll_completed",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=3),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="A-melding sendt",
            message="A-melding for januar 2025 er sendt til Skatteetaten",
            type="amelding_submitted",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=10),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="12 transaksjoner trenger oppmerksomhet",
            message="Ciri fant 12 banktransaksjoner uten bilag — åpne avstemming for å gjennomgå",
            type="reconciliation_needed",
            reference_id=None,
            is_read=False,
            created_at=now - timedelta(hours=12),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Faktura F-0013 åpnet",
            message="Lyse Energi AS har åpnet faktura F-0013 på 60 000 kr",
            type="invoice_viewed",
            reference_id=str(invoices[12].id) if len(invoices) > 12 else None,
            is_read=False,
            created_at=now - timedelta(hours=1),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Ny regel lært",
            message="Ciri lærte en ny regel: «Komplett.no → 4005 Varekjøp» basert på dine valg",
            type="rule_learned",
            reference_id=None,
            is_read=False,
            created_at=now - timedelta(hours=6),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Banksynkronisering fullført",
            message="DNB driftskonto oppdatert — 8 nye transaksjoner importert for mars",
            type="bank_sync",
            reference_id=None,
            is_read=False,
            created_at=now - timedelta(hours=3),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="5 nye ansatte lagt til",
            message="Maria Hansen og Erik Johansen er registrert som nye ansatte",
            type="employee_added",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=5),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="Kari Olsen — foreldrepermisjon",
            message="Kari Olsen er satt som foreldrepermisjon fra 01.02.2025",
            type="employee_status",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=30),
        ),
        Notification(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            title="A-melding februar sendt",
            message="A-melding for februar 2025 er sendt til Skatteetaten for 5 ansatte",
            type="amelding_submitted",
            reference_id=None,
            is_read=True,
            created_at=now - timedelta(days=5),
        ),
    ]


# ═══════════════════════════════════════════════════════════════════════════
# CLI runner — `python seed_data.py` or `python seed_data.py --force`
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    import asyncio

    async def main():
        # Ensure all models are loaded so Base.metadata has all tables
        import models  # noqa: F401

        if "--force" in sys.argv:
            print("⚠️  Force reseeding — all existing data will be wiped!")
            await force_reseed()
        else:
            from config.database import init_db
            await init_db()
            await seed_test_data()

    asyncio.run(main())
