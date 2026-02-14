"""
Reports API Routes
Balance sheet, income statement, and other reports
"""

from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import select, func, extract, case
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.bilag import Bilag, BilagStatus
from models.postering import Postering

router = APIRouter()

# Account code to name mapping
ACCOUNT_NAMES = {
    "1200": "Maskiner og anlegg",
    "1280": "Kontormaskiner",
    "6300": "Leie lokaler",
    "6340": "Lys, varme",
    "6500": "Leie/lisens EDB-utstyr",
    "6540": "Programvare",
    "6700": "Regnskaps- og revisjonshonorar",
    "6800": "Kontorrekvisita",
    "6840": "Aviser og tidsskrifter",
    "6900": "Telefon",
    "6912": "Internett",
    "6940": "Porto",
    "7100": "Bilkostnader",
    "7140": "Reisekostnader",
    "7330": "Markedsføring",
    "7350": "Representasjon",
    "7500": "Forsikringer",
    "4005": "Varekjøp",
}

# Category mapping for grouping
CATEGORY_MAP = {
    "1200": "Anleggsmidler",
    "1280": "Anleggsmidler",
    "6300": "Lokalkostnader",
    "6340": "Lokalkostnader",
    "6500": "IT-kostnader",
    "6540": "IT-kostnader",
    "6700": "Ekstern bistand",
    "6800": "Kontorkostnader",
    "6840": "Kontorkostnader",
    "6900": "Kommunikasjon",
    "6912": "Kommunikasjon",
    "6940": "Kommunikasjon",
    "7100": "Transport",
    "7140": "Transport",
    "7330": "Salg og markedsføring",
    "7350": "Salg og markedsføring",
    "7500": "Forsikring",
    "4005": "Varekostnad",
}


class BalanceItem(BaseModel):
    """Balance sheet line item."""
    account_number: str
    account_name: str
    balance: Decimal
    previous_balance: Decimal | None = None
    change_percent: float | None = None


class BalanceSection(BaseModel):
    """Balance sheet section."""
    name: str
    items: list[BalanceItem]
    total: Decimal


class BalanceSheetResponse(BaseModel):
    """Full balance sheet."""
    as_of_date: date
    assets: list[BalanceSection]
    total_assets: Decimal
    liabilities: list[BalanceSection]
    equity: list[BalanceSection]
    total_liabilities_equity: Decimal
    is_balanced: bool


class IncomeStatementResponse(BaseModel):
    """Income statement."""
    period_start: date
    period_end: date
    income: list[BalanceSection]
    total_income: Decimal
    expenses: list[BalanceSection]
    total_expenses: Decimal
    net_result: Decimal
    comparison: dict | None = None


@router.get("/balance", response_model=BalanceSheetResponse)
async def get_balance_sheet(
    as_of: date | None = None,
    compare_to: date | None = None,
):
    """
    Generate balance sheet.

    Features:
    - Real-time calculation
    - Period comparison
    - Trend indicators
    """
    # TODO: Implement actual calculation
    return BalanceSheetResponse(
        as_of_date=as_of or date.today(),
        assets=[
            BalanceSection(
                name="Anleggsmidler",
                items=[
                    BalanceItem(
                        account_number="1200",
                        account_name="Kontormaskiner",
                        balance=Decimal("150000"),
                        previous_balance=Decimal("180000"),
                        change_percent=-16.7
                    )
                ],
                total=Decimal("150000")
            ),
            BalanceSection(
                name="Omløpsmidler",
                items=[
                    BalanceItem(
                        account_number="1500",
                        account_name="Kundefordringer",
                        balance=Decimal("125000"),
                        change_percent=15.0
                    ),
                    BalanceItem(
                        account_number="1920",
                        account_name="Bank",
                        balance=Decimal("360000"),
                        change_percent=-8.0
                    )
                ],
                total=Decimal("485000")
            )
        ],
        total_assets=Decimal("635000"),
        liabilities=[
            BalanceSection(
                name="Kortsiktig gjeld",
                items=[
                    BalanceItem(
                        account_number="2400",
                        account_name="Leverandørgjeld",
                        balance=Decimal("85000")
                    ),
                    BalanceItem(
                        account_number="2740",
                        account_name="MVA",
                        balance=Decimal("45000")
                    ),
                    BalanceItem(
                        account_number="2780",
                        account_name="Skyldig lønn",
                        balance=Decimal("85000")
                    )
                ],
                total=Decimal("215000")
            )
        ],
        equity=[
            BalanceSection(
                name="Egenkapital",
                items=[
                    BalanceItem(
                        account_number="2050",
                        account_name="Annen egenkapital",
                        balance=Decimal("420000")
                    )
                ],
                total=Decimal("420000")
            )
        ],
        total_liabilities_equity=Decimal("635000"),
        is_balanced=True
    )


@router.get("/income", response_model=IncomeStatementResponse)
async def get_income_statement(
    period_start: date | None = None,
    period_end: date | None = None,
    compare_previous: bool = False,
):
    """
    Generate income statement.

    Features:
    - Customizable period
    - Year-over-year comparison
    - Category breakdown
    """
    # TODO: Implement actual calculation
    return IncomeStatementResponse(
        period_start=period_start or date(2025, 1, 1),
        period_end=period_end or date.today(),
        income=[
            BalanceSection(
                name="Inntekter",
                items=[
                    BalanceItem(
                        account_number="3000",
                        account_name="Salgsinntekt",
                        balance=Decimal("1145000")
                    ),
                    BalanceItem(
                        account_number="3900",
                        account_name="Andre inntekter",
                        balance=Decimal("100000")
                    )
                ],
                total=Decimal("1245000")
            )
        ],
        total_income=Decimal("1245000"),
        expenses=[
            BalanceSection(
                name="Kostnader",
                items=[
                    BalanceItem(
                        account_number="4000",
                        account_name="Varekostnad",
                        balance=Decimal("320000")
                    ),
                    BalanceItem(
                        account_number="5000",
                        account_name="Lønnskostnader",
                        balance=Decimal("412000")
                    ),
                    BalanceItem(
                        account_number="6000",
                        account_name="Andre driftskostnader",
                        balance=Decimal("160110")
                    )
                ],
                total=Decimal("892110")
            )
        ],
        total_expenses=Decimal("892110"),
        net_result=Decimal("352890"),
        comparison={
            "previous_result": Decimal("306430"),
            "change_percent": 15.2
        } if compare_previous else None
    )


@router.get("/trial-balance")
async def get_trial_balance(as_of: date | None = None):
    """
    Generate trial balance (saldobalanse).
    """
    # TODO: Implement trial balance
    return {"message": "Trial balance"}


@router.get("/saft/export")
async def export_saft(
    period_start: date,
    period_end: date,
):
    """
    Export SAF-T v1.30 file.

    1. Validate data completeness
    2. Map to næringsspesifikasjon
    3. Generate XML
    4. Validate against schema
    5. Return file
    """
    # TODO: Implement SAF-T export
    return {"message": "SAF-T export", "download_url": "/api/reports/saft/download/abc123"}


@router.get("/saft/validate")
async def validate_saft(period_start: date, period_end: date):
    """
    Validate data for SAF-T compliance.

    Returns list of issues to fix before export.
    """
    return {
        "valid": True,
        "issues": [],
        "warnings": [
            "3 bilag mangler motkonto-organisasjonsnummer"
        ]
    }


# =============================================================================
# Bilag Aggregation Endpoints
# =============================================================================

class AccountAggregate(BaseModel):
    """Aggregated data for a single account."""
    account_code: str
    account_name: str
    total_gross: float
    total_net: float
    total_mva: float
    bilag_count: int
    monthly_amounts: list[float]  # 12 months


class BilagResultatResponse(BaseModel):
    """Resultat data from bilags."""
    year: int
    accounts: list[AccountAggregate]
    total_gross: float
    total_net: float
    total_mva: float
    by_category: dict[str, float]


class BilagBalanseResponse(BaseModel):
    """Balanse data from bilags."""
    as_of_date: date
    leverandorgjeld: float  # Pending invoices
    leverandorgjeld_count: int
    posted_total: float
    posted_count: int


@router.get("/bilag/resultat", response_model=BilagResultatResponse)
async def get_bilag_resultat(
    year: int = Query(default=2026, description="Year for the report"),
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get expense data from posteringer (journal entries) for resultatregnskap.

    This queries the actual double-entry ledger (posteringer), not source documents (bilag).
    Expense accounts (4xxx-7xxx) are aggregated by account code with monthly breakdown.
    """
    company_uuid = uuid.UUID(company_id)

    # Get all expense posteringer for the year (debit entries on expense accounts 4xxx-7xxx)
    # These are the actual booked expenses from the double-entry ledger
    result = await db.execute(
        select(Postering)
        .where(
            Postering.company_id == company_uuid,
            extract('year', Postering.posting_date) == year,
            # Expense accounts: 4xxx (varekostnad) through 7xxx (andre driftskostnader)
            Postering.account_number >= "4000",
            Postering.account_number < "8000",
            Postering.debit_amount > 0,  # Only debit entries (expenses)
        )
        .order_by(Postering.posting_date)
    )
    posteringer = result.scalars().all()

    # Also get bilag count per account for reference
    bilag_counts: dict[str, int] = {}
    bilag_ids_seen: dict[str, set] = {}

    # Aggregate by account
    account_data: dict[str, dict] = {}
    category_totals: dict[str, float] = {}

    for p in posteringer:
        account = p.account_number
        month = p.posting_date.month  # 1-12
        category = CATEGORY_MAP.get(account, "Annet")

        if account not in account_data:
            account_data[account] = {
                "account_code": account,
                "account_name": ACCOUNT_NAMES.get(account, f"Konto {account}"),
                "total_gross": 0.0,  # We'll use net amounts from posteringer
                "total_net": 0.0,
                "total_mva": 0.0,
                "bilag_count": 0,
                "monthly_amounts": [0.0] * 12,
            }
            bilag_ids_seen[account] = set()

        # Debit amount is the expense amount
        amount = float(p.debit_amount)
        account_data[account]["total_net"] += amount
        account_data[account]["total_gross"] += amount  # For expense accounts, this is net
        account_data[account]["monthly_amounts"][month - 1] += amount

        # Track unique bilags for count
        if p.bilag_id and p.bilag_id not in bilag_ids_seen[account]:
            bilag_ids_seen[account].add(p.bilag_id)
            account_data[account]["bilag_count"] += 1

        # Category totals
        if category not in category_totals:
            category_totals[category] = 0.0
        category_totals[category] += amount

    # Get MVA totals from MVA accounts (2710-2719 are inngående MVA)
    mva_result = await db.execute(
        select(
            Postering.account_number,
            func.sum(Postering.debit_amount).label("total_mva")
        )
        .where(
            Postering.company_id == company_uuid,
            extract('year', Postering.posting_date) == year,
            Postering.account_number >= "2710",
            Postering.account_number < "2720",
        )
        .group_by(Postering.account_number)
    )
    mva_by_account = {row.account_number: float(row.total_mva or 0) for row in mva_result}
    total_mva = sum(mva_by_account.values())

    # Convert to list and sort by account code
    accounts = [
        AccountAggregate(**data)
        for data in sorted(account_data.values(), key=lambda x: x["account_code"])
    ]

    total_gross = sum(a.total_gross for a in accounts)
    total_net = sum(a.total_net for a in accounts)

    return BilagResultatResponse(
        year=year,
        accounts=accounts,
        total_gross=total_gross + total_mva,  # Gross = net expenses + MVA
        total_net=total_net,
        total_mva=total_mva,
        by_category=category_totals,
    )


@router.get("/bilag/balanse", response_model=BilagBalanseResponse)
async def get_bilag_balanse(
    as_of_date: Optional[date] = Query(default=None, description="Balance as of date"),
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get balance data from posteringer (journal entries).

    Leverandørgjeld (accounts payable) = credit balance on account 2400.
    This represents posted invoices that haven't been paid yet.

    When an invoice is posted: CREDIT 2400 (increases leverandørgjeld)
    When an invoice is paid: DEBIT 2400 (decreases leverandørgjeld)

    The net balance (credits - debits) on 2400 = outstanding payables.
    """
    company_uuid = uuid.UUID(company_id)
    report_date = as_of_date or date.today()

    # Calculate leverandørgjeld from account 2400 balance in posteringer
    # Credit balance = what we owe to suppliers
    leverandorgjeld_result = await db.execute(
        select(
            func.coalesce(func.sum(Postering.credit_amount), 0).label("total_credit"),
            func.coalesce(func.sum(Postering.debit_amount), 0).label("total_debit"),
            func.count(func.distinct(Postering.bilag_id)).label("bilag_count")
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.account_number == "2400",  # Leverandørgjeld account
            Postering.posting_date <= report_date
        )
    )
    lev = leverandorgjeld_result.one()

    # Net credit balance = outstanding payables
    # (credit entries increase payables, debit entries decrease when paid)
    leverandorgjeld = float(lev.total_credit) - float(lev.total_debit)

    # Get total posted expenses (debit entries on expense accounts)
    posted_result = await db.execute(
        select(
            func.count(func.distinct(Postering.bilag_id)).label("count"),
            func.coalesce(func.sum(Postering.debit_amount), 0).label("total")
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.posting_date <= report_date,
            # Expense accounts 4xxx-7xxx
            Postering.account_number >= "4000",
            Postering.account_number < "8000",
        )
    )
    posted = posted_result.one()

    return BilagBalanseResponse(
        as_of_date=report_date,
        leverandorgjeld=max(0, leverandorgjeld),  # Should be positive (we owe money)
        leverandorgjeld_count=lev.bilag_count,
        posted_total=float(posted.total),
        posted_count=posted.count,
    )


@router.get("/bilag/summary")
async def get_bilag_summary(
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Quick bilag summary for dashboard.

    Combines data from both bilags (pending review) and posteringer (posted expenses).
    """
    company_uuid = uuid.UUID(company_id)

    # Total posted expenses from posteringer (the actual ledger)
    expenses_result = await db.execute(
        select(
            func.count(func.distinct(Postering.bilag_id)).label("count"),
            func.coalesce(func.sum(Postering.debit_amount), 0).label("total"),
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.account_number >= "4000",
            Postering.account_number < "8000",
        )
    )
    expenses = expenses_result.one()

    # Total MVA from posteringer (inngående MVA accounts 2710-2719)
    mva_result = await db.execute(
        select(
            func.coalesce(func.sum(Postering.debit_amount), 0).label("total_mva"),
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.account_number >= "2710",
            Postering.account_number < "2720",
        )
    )
    mva = mva_result.one()

    # Pending bilags (not yet posted - need review)
    pending_result = await db.execute(
        select(
            func.count(Bilag.id).label("count"),
            func.coalesce(func.sum(Bilag.gross_amount), 0).label("total")
        )
        .where(
            Bilag.company_id == company_uuid,
            Bilag.status == BilagStatus.PENDING,
        )
    )
    pending = pending_result.one()

    # Outstanding leverandørgjeld (credit balance on 2400)
    lev_result = await db.execute(
        select(
            func.coalesce(func.sum(Postering.credit_amount), 0).label("credit"),
            func.coalesce(func.sum(Postering.debit_amount), 0).label("debit"),
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.account_number == "2400",
        )
    )
    lev = lev_result.one()
    outstanding_payables = float(lev.credit) - float(lev.debit)

    return {
        "posted_count": expenses.count,
        "posted_total": float(expenses.total),
        "posted_mva": float(mva.total_mva),
        "pending_count": pending.count,
        "pending_total": float(pending.total),
        "outstanding_payables": max(0, outstanding_payables),
    }


# =============================================================================
# Hovedbok (General Ledger) Endpoints
# =============================================================================

class HovedboTransaksjon(BaseModel):
    """Single transaction in the general ledger."""
    id: str
    dato: str
    bilag_id: str
    bilag_number: str
    beskrivelse: str
    debet: float
    kredit: float
    motpart: str  # Counter-account


class HovedboKonto(BaseModel):
    """Account with transactions for hovedbok."""
    kontonummer: str
    kontonavn: str
    klasse: str
    klasse_nummer: int
    inngaende_balanse: float
    debet: float
    kredit: float
    utgaende_balanse: float
    transaksjoner: list[HovedboTransaksjon]


class HovedboResponse(BaseModel):
    """Full hovedbok response."""
    period_start: date
    period_end: date
    kontoer: list[HovedboKonto]
    total_debet: float
    total_kredit: float


# Account class definitions
KONTO_KLASSER = {
    1: "Eiendeler",
    2: "Egenkapital og gjeld",
    3: "Salgs- og driftsinntekter",
    4: "Varekostnad",
    5: "Lønnskostnader",
    6: "Andre driftskostnader",
    7: "Andre driftskostnader",
    8: "Finansposter",
}


@router.get("/hovedbok", response_model=HovedboResponse)
async def get_hovedbok(
    period_start: date = Query(default=None, description="Start of period"),
    period_end: date = Query(default=None, description="End of period"),
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get hovedbok (general ledger) with all accounts and their transactions.

    Shows all posteringer grouped by account with running balances.
    """
    company_uuid = uuid.UUID(company_id)
    start = period_start or date(date.today().year, 1, 1)
    end = period_end or date.today()

    # Get all posteringer for the period
    result = await db.execute(
        select(Postering, Bilag.bilag_number)
        .join(Bilag, Postering.bilag_id == Bilag.id)
        .where(
            Postering.company_id == company_uuid,
            Postering.posting_date >= start,
            Postering.posting_date <= end,
        )
        .order_by(Postering.account_number, Postering.posting_date)
    )
    rows = result.all()

    # Group by account
    account_data: dict[str, dict] = {}

    for postering, bilag_number in rows:
        account = postering.account_number
        klasse_nummer = int(account[0]) if account[0].isdigit() else 0

        if account not in account_data:
            account_data[account] = {
                "kontonummer": account,
                "kontonavn": ACCOUNT_NAMES.get(account, f"Konto {account}"),
                "klasse": KONTO_KLASSER.get(klasse_nummer, "Annet"),
                "klasse_nummer": klasse_nummer,
                "inngaende_balanse": 0.0,  # Would need opening balance query
                "debet": 0.0,
                "kredit": 0.0,
                "transaksjoner": [],
            }

        account_data[account]["debet"] += float(postering.debit_amount)
        account_data[account]["kredit"] += float(postering.credit_amount)

        # Find counter-account (motpart) from same journal_id
        account_data[account]["transaksjoner"].append({
            "id": str(postering.id),
            "dato": postering.posting_date.isoformat(),
            "bilag_id": str(postering.bilag_id),
            "bilag_number": bilag_number,
            "beskrivelse": postering.description,
            "debet": float(postering.debit_amount),
            "kredit": float(postering.credit_amount),
            "motpart": "",  # Would need separate query
        })

    # Calculate utgående balanse
    for account, data in account_data.items():
        klasse = data["klasse_nummer"]
        # For assets (1) and expenses (4-7): debit increases balance
        # For liabilities (2), equity (2), and income (3): credit increases balance
        if klasse in [1, 4, 5, 6, 7, 8]:
            data["utgaende_balanse"] = data["inngaende_balanse"] + data["debet"] - data["kredit"]
        else:
            data["utgaende_balanse"] = data["inngaende_balanse"] + data["kredit"] - data["debet"]

    # Convert to response format
    kontoer = [
        HovedboKonto(
            kontonummer=data["kontonummer"],
            kontonavn=data["kontonavn"],
            klasse=data["klasse"],
            klasse_nummer=data["klasse_nummer"],
            inngaende_balanse=data["inngaende_balanse"],
            debet=data["debet"],
            kredit=data["kredit"],
            utgaende_balanse=data["utgaende_balanse"],
            transaksjoner=[HovedboTransaksjon(**t) for t in data["transaksjoner"]],
        )
        for data in sorted(account_data.values(), key=lambda x: x["kontonummer"])
    ]

    total_debet = sum(k.debet for k in kontoer)
    total_kredit = sum(k.kredit for k in kontoer)

    return HovedboResponse(
        period_start=start,
        period_end=end,
        kontoer=kontoer,
        total_debet=total_debet,
        total_kredit=total_kredit,
    )


# =============================================================================
# Bilag Details by Account
# =============================================================================

class BilagDetail(BaseModel):
    """Bilag summary for drill-down."""
    id: str
    bilag_number: str
    document_date: str
    description: str
    counterparty_name: str | None
    gross_amount: float
    net_amount: float
    mva_amount: float


class AccountBilagResponse(BaseModel):
    """Bilags for a specific account."""
    account_code: str
    account_name: str
    year: int
    bilags: list[BilagDetail]
    total_amount: float


@router.get("/account/{account_code}/bilags", response_model=AccountBilagResponse)
async def get_account_bilags(
    account_code: str,
    year: int = Query(default=2026, description="Year to filter"),
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all bilags posted to a specific account.

    Used for drill-down from resultat or hovedbok to see actual source documents.
    """
    company_uuid = uuid.UUID(company_id)

    # Get distinct bilag IDs from posteringer on this account
    result = await db.execute(
        select(Postering.bilag_id)
        .distinct()
        .where(
            Postering.company_id == company_uuid,
            Postering.account_number == account_code,
            extract('year', Postering.posting_date) == year,
        )
    )
    bilag_ids = [row[0] for row in result.all()]

    if not bilag_ids:
        return AccountBilagResponse(
            account_code=account_code,
            account_name=ACCOUNT_NAMES.get(account_code, f"Konto {account_code}"),
            year=year,
            bilags=[],
            total_amount=0.0,
        )

    # Get bilag details
    bilag_result = await db.execute(
        select(Bilag)
        .where(Bilag.id.in_(bilag_ids))
        .order_by(Bilag.document_date.desc())
    )
    bilags = bilag_result.scalars().all()

    bilag_details = [
        BilagDetail(
            id=str(b.id),
            bilag_number=b.bilag_number,
            document_date=b.document_date.isoformat(),
            description=b.description,
            counterparty_name=b.counterparty_name,
            gross_amount=float(b.gross_amount),
            net_amount=float(b.net_amount),
            mva_amount=float(b.mva_amount),
        )
        for b in bilags
    ]

    total = sum(b.net_amount for b in bilag_details)

    return AccountBilagResponse(
        account_code=account_code,
        account_name=ACCOUNT_NAMES.get(account_code, f"Konto {account_code}"),
        year=year,
        bilags=bilag_details,
        total_amount=total,
    )
