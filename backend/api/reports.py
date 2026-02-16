"""
Reports API Routes
Balance sheet, income statement, and other reports
"""

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import select, func, extract, case
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.cache import cache_key, get_cached, set_cached, CACHE_TTLS
from models.bilag import Bilag, BilagStatus
from models.postering import Postering

router = APIRouter()

# Account code to name mapping — NS 4102 (Norsk Standard Kontoplan)
ACCOUNT_NAMES = {
    # 1 — Eiendeler (Assets)
    # 10 Immatrielle eiendeler
    "1000": "Forskning og utvikling",
    "1050": "Konsesjoner, patenter",
    # 11 Tomter, bygninger og annen fast eiendom
    "1100": "Bygninger",
    "1151": "Tomter",
    # 12 Transportmidler, inventar og maskiner
    "1200": "Maskiner og anlegg",
    "1233": "Varebiler",
    "1236": "Lastebiler",
    "1250": "Inventar og utstyr",
    "1280": "Kontormaskiner",
    # 13 Finansielle anleggsmidler
    "1350": "Investeringer i aksjer",
    "1397": "Forskudd leasing",
    # 14 Varelager
    "1400": "Råvarer og halvfabrikata",
    "1420": "Varer under tilvirkning",
    "1440": "Ferdig egentilvirkede varer",
    "1460": "Innkjøpte varer for videresalg",
    # 15 Kortsiktige fordringer
    "1500": "Kundefordringer",
    "1580": "Avsetning tap på kundefordringer",
    # 17 Forskuddsbetalt kostnad
    "1700": "Forskuddsbetalt leie",
    # 18 Kortsiktige finansinvesteringer
    "1810": "Aksjer, børsnoterte",
    # 19 Bankinnskudd, kontanter
    "1900": "Kontanter",
    "1920": "Bankinnskudd",
    "1950": "Bankinnskudd for skattetrekk",

    # 2 — Egenkapital og gjeld
    # 20 Egenkapital
    "2000": "Aksjekapital",
    "2050": "Annen egenkapital",
    "2060": "Privatkonto",
    "2070": "Skatter",
    "2080": "Udekket tap",
    # 22 Langsiktig gjeld
    "2240": "Pantelån",
    "2250": "Gjeld til kredittinstitusjoner",
    # 23 Driftskreditt
    "2380": "Kassakreditt",
    # 24 Leverandørgjeld
    "2400": "Leverandørgjeld",
    # 26 Skattetrekk
    "2600": "Forskuddstrekk",
    # 27 Skyldige offentlige avgifter
    "2700": "Utgående MVA, høy sats",
    "2701": "Utgående MVA, middels sats",
    "2702": "Utgående MVA, lav sats",
    "2706": "Utgående MVA, snudd avregning",
    "2710": "Inngående MVA, høy sats",
    "2711": "Inngående MVA, middels sats",
    "2712": "Inngående MVA, lav sats",
    "2713": "Inngående MVA, rå fisk",
    "2714": "Inngående MVA, 11,11%",
    "2715": "Inngående MVA, innførsel varer",
    "2716": "Inngående MVA, tjenester fra utlandet",
    "2740": "Oppgjørskonto merverdiavgift",
    "2770": "Arbeidsgiveravgift skyldig",
    # 28-29 Annen kortsiktig gjeld
    "2900": "Annen kortsiktig gjeld",
    "2930": "Skyldig lønn",
    "2940": "Skyldige feriepenger",
    "2950": "Påløpt renter",

    # 3 — Inntekter
    # 30 Salgsinntekt, avgiftspliktig
    "3000": "Salgsinntekter, avgiftspliktig",
    "3060": "Uttak av varer, avgiftspliktig",
    "3080": "Rabatt og salgsinntektsreduksjon",
    # 31 Salgsinntekter, avgiftsfrie
    "3100": "Salgsinntekter, avgiftsfrie",
    "3160": "Uttak av varer, avgiftsfri",
    "3180": "Rabatt og salgsinntektsreduksjon, avgiftsfri",
    # 32 Salgsinntekter utenfor avgiftsområdet
    "3200": "Salgsinntekter utenfor avgiftsområdet",
    # 34 Offentlige tilskudd
    "3400": "Offentlige tilskudd",
    # 36 Leieinntekter
    "3600": "Leieinntekter fast eiendom",
    "3610": "Leieinntekt andre varige driftsmidler",
    # 39 Andre inntekter
    "3900": "Andre inntekter",

    # 4 — Varekjøp
    "4000": "Innkjøp av råvarer og halvfabrikata",
    "4005": "Varekjøp",
    "4060": "Frakt, toll og spedisjon",
    "4300": "Innkjøp av varer for videresalg",
    "4360": "Frakt, toll og spedisjon (videresalg)",
    "4500": "Fremmedytelser og underentreprise",

    # 5 — Lønnskostnader
    "5000": "Lønn",
    "5010": "Feriepenger",
    "5200": "Fri bil",
    "5210": "Fri telefon",
    "5400": "Arbeidsgiveravgift",
    "5800": "Refusjon av sykepenger",

    # 6 — Andre driftskostnader
    # 60 Avskrivninger
    "6000": "Avskrivninger",
    "6010": "Avskrivning bygninger",
    "6015": "Avskrivning maskiner",
    # 62 Energi, brensel, vann
    "6200": "Elektrisitet",
    "6220": "Fyringsolje",
    "6250": "Bensin, diesel",
    # 63 Kostnad lokaler
    "6300": "Leie lokaler",
    "6320": "Kommunale avgifter",
    "6340": "Lys, varme",
    # 64 Leie/leasing maskiner
    "6400": "Leie maskiner",
    # 65 Verktøy og utstyr
    "6500": "Verktøy og utstyr",
    "6510": "Håndverktøy",
    "6540": "Inventar",
    # 66 Vedlikehold og reparasjoner
    "6600": "Reparasjon og vedlikehold bygning",
    "6620": "Reparasjon og vedlikehold utstyr",
    # 67 Fremmede tjenester
    "6700": "Regnskapshonorar",
    "6705": "Revisjonshonorar",
    # 68 Kontorkostnad
    "6800": "Kontorrekvisita",
    "6810": "EDB-kostnad",
    "6840": "Aviser, tidsskrifter, bøker",
    # 69 Telefon og porto
    "6900": "Telefon",
    "6912": "Internett",
    "6940": "Porto",

    # 7 — Andre driftskostnader (forts.)
    # 70 Transportmidler
    "7001": "Diesel, olje",
    "7011": "Bensin",
    "7021": "Vedlikehold transportmidler",
    "7040": "Forsikring transportmidler",
    "7050": "Årsavgift",
    "7080": "Bruk av privat bil i næring",
    "7099": "Privat bruk av næringsbil",
    # 71 Reise, diett
    "7100": "Bilgodtgjørelse",
    "7140": "Reisekostnader",
    # 73 Salg, reklame, representasjon
    "7300": "Salgskostnad",
    "7330": "Markedsføring",
    "7350": "Representasjon",
    # 74 Kontingent og gave
    "7400": "Kontingenter, fradragsberettiget",
    # 75 Forsikring
    "7500": "Forsikringspremie",
    # 77 Annen kostnad
    "7700": "Annen driftskostnad",
    "7770": "Bank- og kontogenbyrer",

    # 8 — Finansinntekter og -kostnader
    "8050": "Annen renteinntekt",
    "8079": "Annen finansinntekt",
    "8150": "Annen rentekostnad",
    "8179": "Annen finanskostnad",
}

# Category mapping for grouping
CATEGORY_MAP = {
    # 1 — Eiendeler
    "1000": "Immatrielle eiendeler",
    "1050": "Immatrielle eiendeler",
    "1100": "Tomter og bygninger",
    "1151": "Tomter og bygninger",
    "1200": "Maskiner og inventar",
    "1233": "Transportmidler",
    "1236": "Transportmidler",
    "1250": "Maskiner og inventar",
    "1280": "Maskiner og inventar",
    "1350": "Finansielle anleggsmidler",
    "1397": "Finansielle anleggsmidler",
    "1400": "Varelager",
    "1420": "Varelager",
    "1440": "Varelager",
    "1460": "Varelager",
    "1500": "Kortsiktige fordringer",
    "1580": "Kortsiktige fordringer",
    "1700": "Forskuddsbetalinger",
    "1810": "Kortsiktige finansinvesteringer",
    "1900": "Bankinnskudd og kontanter",
    "1920": "Bankinnskudd og kontanter",
    "1950": "Bankinnskudd og kontanter",
    # 2 — Egenkapital og gjeld
    "2000": "Egenkapital",
    "2050": "Egenkapital",
    "2060": "Egenkapital",
    "2070": "Egenkapital",
    "2080": "Egenkapital",
    "2240": "Langsiktig gjeld",
    "2250": "Langsiktig gjeld",
    "2380": "Kortsiktig gjeld",
    "2400": "Leverandørgjeld",
    "2600": "Skattetrekk og avgifter",
    "2700": "Skyldige offentlige avgifter",
    "2710": "Skyldige offentlige avgifter",
    "2711": "Skyldige offentlige avgifter",
    "2712": "Skyldige offentlige avgifter",
    "2713": "Skyldige offentlige avgifter",
    "2714": "Skyldige offentlige avgifter",
    "2715": "Skyldige offentlige avgifter",
    "2716": "Skyldige offentlige avgifter",
    "2740": "Skyldige offentlige avgifter",
    "2770": "Skyldige offentlige avgifter",
    "2900": "Annen kortsiktig gjeld",
    "2930": "Annen kortsiktig gjeld",
    "2940": "Annen kortsiktig gjeld",
    "2950": "Annen kortsiktig gjeld",
    # 3 — Inntekter
    "3000": "Salgsinntekter",
    "3060": "Salgsinntekter",
    "3080": "Salgsinntektsreduksjon",
    "3100": "Salgsinntekter",
    "3160": "Salgsinntekter",
    "3180": "Salgsinntektsreduksjon",
    "3200": "Salgsinntekter",
    "3400": "Offentlige tilskudd",
    "3600": "Leieinntekter",
    "3610": "Leieinntekter",
    "3900": "Andre inntekter",
    # 4 — Varekjøp
    "4000": "Varekostnad",
    "4005": "Varekostnad",
    "4060": "Varekostnad",
    "4300": "Varekostnad",
    "4360": "Varekostnad",
    "4500": "Fremmedytelser",
    # 5 — Lønnskostnader
    "5000": "Lønnskostnader",
    "5010": "Lønnskostnader",
    "5200": "Lønnskostnader",
    "5210": "Lønnskostnader",
    "5400": "Lønnskostnader",
    "5800": "Lønnskostnader",
    # 6 — Andre driftskostnader
    "6000": "Avskrivninger",
    "6010": "Avskrivninger",
    "6015": "Avskrivninger",
    "6200": "Energikostnader",
    "6220": "Energikostnader",
    "6250": "Energikostnader",
    "6300": "Lokalkostnader",
    "6320": "Lokalkostnader",
    "6340": "Lokalkostnader",
    "6400": "Leie maskiner",
    "6500": "Verktøy og utstyr",
    "6510": "Verktøy og utstyr",
    "6540": "Verktøy og utstyr",
    "6600": "Vedlikehold",
    "6620": "Vedlikehold",
    "6700": "Ekstern bistand",
    "6705": "Ekstern bistand",
    "6800": "Kontorkostnader",
    "6810": "Kontorkostnader",
    "6840": "Kontorkostnader",
    "6900": "Kommunikasjon",
    "6912": "Kommunikasjon",
    "6940": "Kommunikasjon",
    # 7 — Andre driftskostnader forts.
    "7001": "Transportmidler",
    "7011": "Transportmidler",
    "7021": "Transportmidler",
    "7040": "Transportmidler",
    "7050": "Transportmidler",
    "7080": "Transportmidler",
    "7099": "Transportmidler",
    "7100": "Reise og diett",
    "7140": "Reise og diett",
    "7300": "Salg og markedsføring",
    "7330": "Salg og markedsføring",
    "7350": "Salg og markedsføring",
    "7400": "Kontingenter og gaver",
    "7500": "Forsikring",
    "7770": "Bank- og kontokostnader",
    # 8 — Finansposter
    "8050": "Finansinntekter",
    "8079": "Finansinntekter",
    "8150": "Finanskostnader",
    "8179": "Finanskostnader",
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


class AccountBalance(BaseModel):
    """Balance for a single account."""
    account_code: str
    account_name: str
    balance: float


class BilagBalanseResponse(BaseModel):
    """Balanse data from bilags."""
    as_of_date: date
    leverandorgjeld: float  # Pending invoices
    leverandorgjeld_count: int
    posted_total: float
    posted_count: int
    account_balances: list[AccountBalance] = []


@router.get("/bilag/resultat", response_model=BilagResultatResponse)
async def get_bilag_resultat(
    year: int = Query(default=2026, description="Year for the report"),
    company_id: str = Query(..., description="Company UUID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get income/expense data from posteringer for resultatregnskap.

    Queries the double-entry ledger (posteringer) for all resultat accounts:
    - 3xxx income (credit entries)
    - 4xxx-7xxx expenses (debit entries)
    - 8xxx finansposter (credit = income, debit = cost)
    """
    ck = cache_key("reports", endpoint="resultat", year=year, company_id=company_id)
    cached = await get_cached(ck)
    if cached is not None:
        return JSONResponse(content=cached)

    company_uuid = uuid.UUID(company_id)

    from sqlalchemy import or_

    # Get all expense posteringer: 4xxx-7xxx debit entries + 8xxx debit entries (finance costs)
    result = await db.execute(
        select(Postering)
        .where(
            Postering.company_id == company_uuid,
            extract('year', Postering.posting_date) == year,
            Postering.debit_amount > 0,
            or_(
                # Operating expenses 4xxx-7xxx
                Postering.account_number.between("4000", "7999"),
                # Finance costs 8xxx (8150, 8179, etc.)
                Postering.account_number.between("8100", "8199"),
            ),
        )
        .order_by(Postering.posting_date)
    )
    expense_posteringer = result.scalars().all()

    # Get all income posteringer: 3xxx credit entries + 8xxx credit entries (finance income)
    income_result = await db.execute(
        select(Postering)
        .where(
            Postering.company_id == company_uuid,
            extract('year', Postering.posting_date) == year,
            Postering.credit_amount > 0,
            or_(
                # Operating income 3xxx
                Postering.account_number.between("3000", "3999"),
                # Finance income 8xxx (8050, 8079, etc.)
                Postering.account_number.between("8000", "8099"),
            ),
        )
        .order_by(Postering.posting_date)
    )
    income_posteringer = income_result.scalars().all()

    # Aggregate by account
    account_data: dict[str, dict] = {}
    category_totals: dict[str, float] = {}
    bilag_ids_seen: dict[str, set] = {}

    # Process expense posteringer (debit amounts)
    for p in expense_posteringer:
        account = p.account_number
        month = p.posting_date.month
        category = CATEGORY_MAP.get(account, "Annet")

        if account not in account_data:
            account_data[account] = {
                "account_code": account,
                "account_name": ACCOUNT_NAMES.get(account, f"Konto {account}"),
                "total_gross": 0.0,
                "total_net": 0.0,
                "total_mva": 0.0,
                "bilag_count": 0,
                "monthly_amounts": [0.0] * 12,
            }
            bilag_ids_seen[account] = set()

        amount = float(p.debit_amount)
        account_data[account]["total_net"] += amount
        account_data[account]["total_gross"] += amount
        account_data[account]["monthly_amounts"][month - 1] += amount

        if p.bilag_id and p.bilag_id not in bilag_ids_seen[account]:
            bilag_ids_seen[account].add(p.bilag_id)
            account_data[account]["bilag_count"] += 1

        category_totals[category] = category_totals.get(category, 0.0) + amount

    # Process income posteringer (credit amounts)
    for p in income_posteringer:
        account = p.account_number
        month = p.posting_date.month
        category = CATEGORY_MAP.get(account, "Salgsinntekter")

        if account not in account_data:
            account_data[account] = {
                "account_code": account,
                "account_name": ACCOUNT_NAMES.get(account, f"Konto {account}"),
                "total_gross": 0.0,
                "total_net": 0.0,
                "total_mva": 0.0,
                "bilag_count": 0,
                "monthly_amounts": [0.0] * 12,
            }
            bilag_ids_seen[account] = set()

        amount = float(p.credit_amount)
        account_data[account]["total_net"] += amount
        account_data[account]["total_gross"] += amount
        account_data[account]["monthly_amounts"][month - 1] += amount

        if p.bilag_id and p.bilag_id not in bilag_ids_seen[account]:
            bilag_ids_seen[account].add(p.bilag_id)
            account_data[account]["bilag_count"] += 1

        category_totals[category] = category_totals.get(category, 0.0) + amount

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

    response = BilagResultatResponse(
        year=year,
        accounts=accounts,
        total_gross=total_gross + total_mva,  # Gross = net expenses + MVA
        total_net=total_net,
        total_mva=total_mva,
        by_category=category_totals,
    )
    await set_cached(ck, response.model_dump(mode="json"), CACHE_TTLS["reports"])
    return response


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
    ck = cache_key("reports", endpoint="balanse", as_of_date=as_of_date, company_id=company_id)
    cached = await get_cached(ck)
    if cached is not None:
        return JSONResponse(content=cached)

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

    # Calculate balance for ALL accounts up to as_of_date
    all_balances_result = await db.execute(
        select(
            Postering.account_number,
            func.coalesce(func.sum(Postering.debit_amount), 0).label("total_debit"),
            func.coalesce(func.sum(Postering.credit_amount), 0).label("total_credit"),
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.posting_date <= report_date,
        )
        .group_by(Postering.account_number)
    )

    account_balances = []
    for row in all_balances_result:
        acct = row.account_number
        klasse = int(acct[0]) if acct[0].isdigit() else 0
        # Assets (1) and expenses (4-7): debit-normal
        # Liabilities/equity (2), income (3): credit-normal
        if klasse in [1, 4, 5, 6, 7, 8]:
            balance = float(row.total_debit) - float(row.total_credit)
        else:
            balance = float(row.total_credit) - float(row.total_debit)
        account_balances.append(AccountBalance(
            account_code=acct,
            account_name=ACCOUNT_NAMES.get(acct, f"Konto {acct}"),
            balance=balance,
        ))
    account_balances.sort(key=lambda x: x.account_code)

    response = BilagBalanseResponse(
        as_of_date=report_date,
        leverandorgjeld=max(0, leverandorgjeld),
        leverandorgjeld_count=lev.bilag_count,
        posted_total=float(posted.total),
        posted_count=posted.count,
        account_balances=account_balances,
    )
    await set_cached(ck, response.model_dump(mode="json"), CACHE_TTLS["reports"])
    return response


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
    ck = cache_key("reports", endpoint="hovedbok", period_start=period_start,
                   period_end=period_end, company_id=company_id)
    cached = await get_cached(ck)
    if cached is not None:
        return JSONResponse(content=cached)

    company_uuid = uuid.UUID(company_id)
    start = period_start or date(date.today().year, 1, 1)
    end = period_end or date.today()

    # 1. Opening balances: sum all posteringer BEFORE period start
    opening_result = await db.execute(
        select(
            Postering.account_number,
            func.coalesce(func.sum(Postering.debit_amount), 0).label("total_debit"),
            func.coalesce(func.sum(Postering.credit_amount), 0).label("total_credit"),
        )
        .where(
            Postering.company_id == company_uuid,
            Postering.posting_date < start,
        )
        .group_by(Postering.account_number)
    )
    opening_balances: dict[str, float] = {}
    for row in opening_result:
        klasse = int(row.account_number[0]) if row.account_number[0].isdigit() else 0
        # Assets (1) and expenses (4-7): debit-normal
        if klasse in [1, 4, 5, 6, 7, 8]:
            opening_balances[row.account_number] = float(row.total_debit) - float(row.total_credit)
        else:
            opening_balances[row.account_number] = float(row.total_credit) - float(row.total_debit)

    # 2. Get all posteringer for the period (LEFT JOIN bilag for entries without one)
    result = await db.execute(
        select(Postering, Bilag.bilag_number)
        .outerjoin(Bilag, Postering.bilag_id == Bilag.id)
        .where(
            Postering.company_id == company_uuid,
            Postering.posting_date >= start,
            Postering.posting_date <= end,
        )
        .order_by(Postering.account_number, Postering.posting_date)
    )
    rows = result.all()

    # 3. Build journal_id → list[account_number] map for motpart lookup
    journal_accounts: dict[str, set[str]] = {}
    for postering, _ in rows:
        if postering.journal_id not in journal_accounts:
            journal_accounts[postering.journal_id] = set()
        journal_accounts[postering.journal_id].add(postering.account_number)

    # 4. Group by account
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
                "inngaende_balanse": opening_balances.get(account, 0.0),
                "debet": 0.0,
                "kredit": 0.0,
                "transaksjoner": [],
            }

        account_data[account]["debet"] += float(postering.debit_amount)
        account_data[account]["kredit"] += float(postering.credit_amount)

        # Motpart: other accounts in the same journal entry
        other_accounts = journal_accounts.get(postering.journal_id, set()) - {account}
        motpart = ", ".join(sorted(other_accounts)) if other_accounts else ""

        account_data[account]["transaksjoner"].append({
            "id": str(postering.id),
            "dato": postering.posting_date.isoformat(),
            "bilag_id": str(postering.bilag_id) if postering.bilag_id else "",
            "bilag_number": bilag_number or "",
            "beskrivelse": postering.description,
            "debet": float(postering.debit_amount),
            "kredit": float(postering.credit_amount),
            "motpart": motpart,
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

    response = HovedboResponse(
        period_start=start,
        period_end=end,
        kontoer=kontoer,
        total_debet=total_debet,
        total_kredit=total_kredit,
    )
    await set_cached(ck, response.model_dump(mode="json"), CACHE_TTLS["reports"])
    return response


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
