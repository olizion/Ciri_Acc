"""
SAF-T Financial v1.30 Mappings
NS 4102 → SAF-T StandardAccountID and Norwegian MVA codes.

Sources:
- Skatteetaten SAF-T documentation
- NS 4102 (Norsk Standard kontoplan)
- Bokføringsforskriften §5-2-1 (MVA codes)
"""

# ══════════════════════════════════════════════════════════════════════════════
# NS 4102 Account Number → SAF-T StandardAccountID
# ══════════════════════════════════════════════════════════════════════════════
#
# SAF-T requires a StandardAccountID that maps to RF-1167 / RF-1175
# (Næringsoppgave 1 and 2). The mapping is based on account number ranges.
#
# The 4-digit account numbers follow NS 4102:
#   1xxx = Eiendeler (Assets)
#   2xxx = Egenkapital og gjeld (Equity and Liabilities)
#   3xxx = Salgs- og driftsinntekter (Revenue)
#   4xxx = Varekostnad (Cost of goods)
#   5xxx-7xxx = Driftskostnader (Operating expenses)
#   8xxx = Finansposter (Financial items)
#
# StandardAccountID uses RF-1167 post numbers (e.g., "1000" for Forskning og utvikling)

# Map: (start_inclusive, end_inclusive) → (standard_account_id, description)
NS4102_TO_SAFT: list[tuple[int, int, str, str]] = [
    # ── 1: Eiendeler (Assets) ──
    (1000, 1099, "1000", "Forskning og utvikling"),
    (1100, 1199, "1100", "Konsesjoner, patenter, lisenser o.l."),
    (1200, 1299, "1200", "Utsatt skattefordel"),
    (1300, 1399, "1300", "Goodwill"),
    (1400, 1499, "1400", "Tomter, bygninger og annen fast eiendom"),
    (1500, 1599, "1500", "Maskiner og anlegg"),
    (1600, 1699, "1600", "Skip, rigger, fly o.l."),
    (1700, 1799, "1700", "Driftsløsøre, inventar, verktøy o.l."),
    (1800, 1899, "1800", "Finansielle anleggsmidler"),
    (1900, 1999, "1900", "Andre anleggsmidler"),

    # Omløpsmidler
    (1400, 1449, "1060", "Varer"),  # Override for varelager
    (1460, 1499, "1080", "Fordringer"),

    # ── Kontanter og bank ──
    (1900, 1919, "1400", "Kasse og bank"),
    (1920, 1929, "1400", "Bankinnskudd"),
    (1930, 1999, "1400", "Andre finansielle omløpsmidler"),

    # ── 2: Egenkapital og gjeld ──
    (2000, 2099, "2000", "Innskutt egenkapital"),
    (2100, 2199, "2050", "Opptjent egenkapital"),
    (2200, 2299, "2200", "Avsetning for forpliktelser"),
    (2300, 2399, "2300", "Annen langsiktig gjeld"),
    (2400, 2499, "2400", "Leverandørgjeld"),
    (2500, 2599, "2500", "Betalbar skatt"),
    (2600, 2699, "2600", "Skyldige offentlige avgifter"),
    (2700, 2799, "2700", "Annen kortsiktig gjeld"),
    (2800, 2899, "2700", "Annen kortsiktig gjeld"),
    (2900, 2999, "2700", "Annen kortsiktig gjeld"),

    # ── 3: Salgsinntekter ──
    (3000, 3099, "3000", "Salgsinntekt, avgiftspliktig"),
    (3100, 3199, "3100", "Salgsinntekt, avgiftsfri"),
    (3200, 3299, "3200", "Salgsinntekt, utenfor avgiftsområdet"),
    (3300, 3399, "3300", "Offentlige tilskudd/refusjoner"),
    (3400, 3499, "3400", "Leieinntekt"),
    (3500, 3599, "3500", "Provisjonsinntekt"),
    (3600, 3699, "3600", "Gevinst ved avgang anleggsmidler"),
    (3700, 3899, "3700", "Annen driftsinntekt"),
    (3900, 3999, "3900", "Annen driftsinntekt"),

    # ── 4: Varekostnad ──
    (4000, 4099, "4000", "Varekostnad"),
    (4100, 4199, "4100", "Varekostnad"),
    (4200, 4299, "4200", "Fremmedytelser og underentreprise"),
    (4300, 4399, "4300", "Innleie av arbeidskraft"),
    (4400, 4499, "4400", "Varekostnad"),
    (4500, 4599, "4500", "Fremmedytelser og underentreprise"),
    (4600, 4699, "4600", "Varekostnad"),
    (4700, 4799, "4700", "Varekostnad"),
    (4800, 4899, "4800", "Varekostnad"),
    (4900, 4999, "4900", "Beholdningsendring"),

    # ── 5: Lønnskostnad ──
    (5000, 5099, "5000", "Lønn og feriepenger"),
    (5100, 5199, "5100", "Fri bil"),
    (5200, 5299, "5200", "Fri telefon, andre ytelser"),
    (5300, 5399, "5300", "Annen oppgavepliktig godtgjørelse"),
    (5400, 5499, "5400", "Arbeidsgiveravgift"),
    (5500, 5599, "5500", "Annen personalkostnad"),
    (5600, 5699, "5600", "Arbeidsgiveravgift"),
    (5700, 5799, "5700", "Offentlige tilskudd vedr. arbeidskraft"),
    (5800, 5899, "5800", "Annen personalkostnad"),
    (5900, 5999, "5900", "Annen personalkostnad"),

    # ── 6: Driftskostnader ──
    (6000, 6099, "6000", "Avskrivning"),
    (6100, 6199, "6100", "Frakt og transportkostnad"),
    (6200, 6299, "6200", "Energi, brensel o.l."),
    (6300, 6399, "6300", "Leie av lokaler"),
    (6400, 6499, "6400", "Leie av maskiner, inventar o.l."),
    (6500, 6599, "6500", "Verktøy, inventar o.l."),
    (6600, 6699, "6600", "Reparasjon og vedlikehold"),
    (6700, 6799, "6700", "Fremmed tjeneste (revisjon, regnskap)"),
    (6800, 6899, "6800", "Kontorkostnad"),
    (6900, 6999, "6900", "Telefon, porto"),

    # ── 7: Driftskostnader forts. ──
    (7000, 7099, "7000", "Reise- og diettkostnad"),
    (7100, 7199, "7100", "Bilkostnad"),
    (7200, 7299, "7200", "Provisjonskostnad"),
    (7300, 7399, "7300", "Salgskostnad, reklame"),
    (7400, 7499, "7400", "Kontingent og gave"),
    (7500, 7599, "7500", "Forsikringspremie"),
    (7600, 7699, "7600", "Lisens- og patentkostnad"),
    (7700, 7799, "7700", "Annen driftskostnad"),
    (7800, 7899, "7800", "Tap på fordringer"),
    (7900, 7999, "7900", "Annen driftskostnad"),

    # ── 8: Finansposter ──
    (8000, 8099, "8000", "Finansinntekt"),
    (8100, 8199, "8100", "Finanskostnad"),
    (8200, 8299, "8200", "Finansinntekt"),
    (8300, 8399, "8300", "Finanskostnad"),
    (8400, 8499, "8400", "Ekstraordinære poster"),
    (8500, 8599, "8500", "Ekstraordinære poster"),
    (8600, 8699, "8600", "Skattekostnad"),
    (8700, 8799, "8700", "Skattekostnad"),
    (8800, 8899, "8800", "Årsresultat"),
    (8900, 8999, "8900", "Overføringer og disponeringer"),
]


def get_standard_account_id(account_number: str) -> str | None:
    """
    Map a NS 4102 account number to SAF-T StandardAccountID.
    Returns the RF-1167 post number or None if unmapped.
    """
    try:
        num = int(account_number)
    except (ValueError, TypeError):
        return None

    # Search in reverse — later entries override earlier for overlapping ranges
    for start, end, standard_id, _desc in reversed(NS4102_TO_SAFT):
        if start <= num <= end:
            return standard_id
    return None


def get_standard_account_description(account_number: str) -> str | None:
    """Get the SAF-T standard description for an account number."""
    try:
        num = int(account_number)
    except (ValueError, TypeError):
        return None

    for start, end, _standard_id, desc in reversed(NS4102_TO_SAFT):
        if start <= num <= end:
            return desc
    return None


# ══════════════════════════════════════════════════════════════════════════════
# SAF-T Account Type mapping
# ══════════════════════════════════════════════════════════════════════════════

ACCOUNT_TYPE_MAP = {
    "asset": "GL",      # General Ledger
    "liability": "GL",
    "equity": "GL",
    "income": "GL",
    "expense": "GL",
}

def get_saft_account_type(account_number: str) -> str:
    """
    Get SAF-T GroupingCategory for an account.
    Norwegian SAF-T uses simplified categorization.
    """
    try:
        num = int(account_number)
    except (ValueError, TypeError):
        return "GL"

    if 1000 <= num <= 1999:
        return "GL"  # Assets
    elif 2000 <= num <= 2999:
        return "GL"  # Equity + Liabilities
    elif 3000 <= num <= 3999:
        return "GL"  # Income
    elif 4000 <= num <= 7999:
        return "GL"  # Expenses
    elif 8000 <= num <= 8999:
        return "GL"  # Financial items
    return "GL"


def get_saft_grouping_code(account_number: str) -> str:
    """Map account number to SAF-T GroupingCode (D=Debit, C=Credit typical balance)."""
    try:
        num = int(account_number)
    except (ValueError, TypeError):
        return "D"

    if 1000 <= num <= 1999:
        return "D"  # Assets = debit balance
    elif 2000 <= num <= 2199:
        return "C"  # Equity = credit balance
    elif 2200 <= num <= 2999:
        return "C"  # Liabilities = credit balance
    elif 3000 <= num <= 3999:
        return "C"  # Revenue = credit balance
    elif 4000 <= num <= 8599:
        return "D"  # Expenses/costs = debit balance
    return "D"


# ══════════════════════════════════════════════════════════════════════════════
# Norwegian MVA (VAT) Codes → SAF-T TaxCode
# ══════════════════════════════════════════════════════════════════════════════
#
# Bokføringsforskriften §5-2-1 defines the standard MVA codes.
# SAF-T requires mapping these to standardized tax codes.

MVA_CODES: dict[str, dict] = {
    "0": {
        "code": "0",
        "description": "Ingen merverdiavgift",
        "rate": 0.0,
        "saft_code": "0",
    },
    "1": {
        "code": "1",
        "description": "Inngående MVA, alminnelig sats",
        "rate": 25.0,
        "saft_code": "1",
    },
    "11": {
        "code": "11",
        "description": "Inngående MVA, redusert sats (mat)",
        "rate": 15.0,
        "saft_code": "11",
    },
    "13": {
        "code": "13",
        "description": "Inngående MVA, lav sats",
        "rate": 12.0,
        "saft_code": "13",
    },
    "3": {
        "code": "3",
        "description": "Utgående MVA, alminnelig sats",
        "rate": 25.0,
        "saft_code": "3",
    },
    "31": {
        "code": "31",
        "description": "Utgående MVA, redusert sats (mat)",
        "rate": 15.0,
        "saft_code": "31",
    },
    "33": {
        "code": "33",
        "description": "Utgående MVA, lav sats",
        "rate": 12.0,
        "saft_code": "33",
    },
    "5": {
        "code": "5",
        "description": "Innenlands omsetning, fritatt",
        "rate": 0.0,
        "saft_code": "5",
    },
    "6": {
        "code": "6",
        "description": "Omsetning utenfor MVA-loven",
        "rate": 0.0,
        "saft_code": "6",
    },
    "14": {
        "code": "14",
        "description": "Innførsel av varer, alminnelig sats",
        "rate": 25.0,
        "saft_code": "14",
    },
    "15": {
        "code": "15",
        "description": "Innførsel av varer, redusert sats",
        "rate": 15.0,
        "saft_code": "15",
    },
    "81": {
        "code": "81",
        "description": "Kjøp tjenester utlandet, alminnelig sats (snudd avregning)",
        "rate": 25.0,
        "saft_code": "81",
    },
    "83": {
        "code": "83",
        "description": "Kjøp tjenester utlandet, lav sats (snudd avregning)",
        "rate": 12.0,
        "saft_code": "83",
    },
    "86": {
        "code": "86",
        "description": "Kjøp klimakvoter og gull, alminnelig sats",
        "rate": 25.0,
        "saft_code": "86",
    },
    "87": {
        "code": "87",
        "description": "Kjøp klimakvoter og gull, redusert sats",
        "rate": 12.0,
        "saft_code": "87",
    },
    "91": {
        "code": "91",
        "description": "Kjøp varer utlandet, alminnelig sats (snudd avregning)",
        "rate": 25.0,
        "saft_code": "91",
    },
    "92": {
        "code": "92",
        "description": "Kjøp varer utlandet, redusert sats (snudd avregning)",
        "rate": 15.0,
        "saft_code": "92",
    },
}


def get_mva_rate(code: str | None) -> float:
    """Get MVA rate for a given code. Returns 0.0 for unknown codes."""
    if not code:
        return 0.0
    entry = MVA_CODES.get(code)
    return entry["rate"] if entry else 0.0


def get_mva_description(code: str | None) -> str:
    """Get human-readable description for a MVA code."""
    if not code:
        return "Ingen merverdiavgift"
    entry = MVA_CODES.get(code)
    return entry["description"] if entry else f"Ukjent MVA-kode ({code})"
