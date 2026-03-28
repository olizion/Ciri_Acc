"""
MVA XML Builder
Generates XML payloads for MVA melding submission to Skatteetaten.

Two XML documents are needed:
1. MvaMelding (skattemeldingformerverdiavgift) — the actual VAT return data
2. MvaMeldingInnsending — the submission envelope/metadata

Schema references:
- https://github.com/Skatteetaten/mva-meldingen/blob/master/docs/informasjonsmodell_filer/xsd/
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from xml.etree.ElementTree import Element, SubElement, tostring
import xml.dom.minidom


# =============================================================================
# NAMESPACES
# =============================================================================

NS_MELDING = "no:skatteetaten:fastsetting:avgift:mva:skattemeldingformerverdiavgift:v1.0"
NS_INNSENDING = "no:skatteetaten:fastsetting:avgift:mva:mvameldinginnsending:v1.0"


# =============================================================================
# MVA CODES (mvaKodeSAFT)
# =============================================================================

MVA_CODES = {
    # Inngående (input VAT / deductions)
    1:  {"desc": "Kjøp med fradragsrett (høy sats)", "rate": 25, "direction": "inngaaende"},
    11: {"desc": "Kjøp med fradragsrett (middels sats)", "rate": 15, "direction": "inngaaende"},
    12: {"desc": "Kjøp av fisk (11,11%)", "rate": 11.11, "direction": "inngaaende"},
    13: {"desc": "Kjøp med fradragsrett (lav sats)", "rate": 12, "direction": "inngaaende"},
    14: {"desc": "Fradrag innførsel varer (høy sats)", "rate": 25, "direction": "inngaaende"},
    15: {"desc": "Fradrag innførsel varer (middels sats)", "rate": 15, "direction": "inngaaende"},
    # Utgående (output VAT / sales)
    3:  {"desc": "Salg og uttak (høy sats)", "rate": 25, "direction": "utgaaende"},
    31: {"desc": "Salg og uttak (middels sats)", "rate": 15, "direction": "utgaaende"},
    32: {"desc": "Salg av fisk (11,11%)", "rate": 11.11, "direction": "utgaaende"},
    33: {"desc": "Salg og uttak (lav sats)", "rate": 12, "direction": "utgaaende"},
    5:  {"desc": "Salg fritatt for MVA (nullsats)", "rate": 0, "direction": "utgaaende"},
    6:  {"desc": "Salg unntatt merverdiavgiftsloven", "rate": None, "direction": "utgaaende"},
    51: {"desc": "Salg klimakvoter og gull", "rate": 0, "direction": "utgaaende"},
    52: {"desc": "Eksport fritatt MVA (nullsats)", "rate": 0, "direction": "utgaaende"},
    # Import goods (both inngående + utgående)
    81: {"desc": "Kjøp varer utlandet med fradrag (høy sats)", "rate": 25, "direction": "begge"},
    82: {"desc": "Kjøp varer utlandet uten fradrag (høy sats)", "rate": 25, "direction": "utgaaende"},
    83: {"desc": "Kjøp varer utlandet med fradrag (middels sats)", "rate": 15, "direction": "begge"},
    84: {"desc": "Kjøp varer utlandet uten fradrag (middels sats)", "rate": 15, "direction": "utgaaende"},
    85: {"desc": "Kjøp varer utlandet (nullsats)", "rate": 0, "direction": "utgaaende"},
    # Import services
    86: {"desc": "Kjøp tjenester utlandet med fradrag (høy sats)", "rate": 25, "direction": "begge"},
    87: {"desc": "Kjøp tjenester utlandet uten fradrag (høy sats)", "rate": 25, "direction": "utgaaende"},
    88: {"desc": "Kjøp tjenester utlandet med fradrag (lav sats)", "rate": 12, "direction": "begge"},
    89: {"desc": "Kjøp tjenester utlandet uten fradrag (lav sats)", "rate": 12, "direction": "utgaaende"},
    # Emission allowances / gold
    91: {"desc": "Kjøp klimakvoter/gull med fradrag (høy sats)", "rate": 25, "direction": "begge"},
    92: {"desc": "Kjøp klimakvoter/gull uten fradrag (høy sats)", "rate": 25, "direction": "utgaaende"},
}

# Valid MVA rates
MVA_RATES = {0, 6, 11.11, 12, 15, 25}

# Period descriptions for bimonthly reporting
BIMONTHLY_PERIODS = {
    (1, 2): "januar-februar",
    (3, 4): "mars-april",
    (5, 6): "mai-juni",
    (7, 8): "juli-august",
    (9, 10): "september-oktober",
    (11, 12): "november-desember",
}

# Period descriptions for quarterly reporting
QUARTERLY_PERIODS = {
    (1, 3): "januar-mars",
    (4, 6): "april-juni",
    (7, 9): "juli-september",
    (10, 12): "oktober-desember",
}


# =============================================================================
# SPECIFICATION LINE
# =============================================================================

class MvaSpesifikasjonslinje:
    """A single line in the MVA return."""

    def __init__(
        self,
        mva_kode: int,
        merverdiavgift: Decimal,
        grunnlag: Optional[Decimal] = None,
        sats: Optional[float] = None,
        spesifikasjon: Optional[str] = None,
        merknad: Optional[str] = None,
    ):
        if mva_kode not in MVA_CODES:
            raise ValueError(f"Ugyldig MVA-kode: {mva_kode}")

        self.mva_kode = mva_kode
        self.merverdiavgift = merverdiavgift
        self.grunnlag = grunnlag
        self.sats = sats
        self.spesifikasjon = spesifikasjon
        self.merknad = merknad

    def to_dict(self) -> dict:
        """Serialize for JSON storage."""
        d = {
            "mvaKode": str(self.mva_kode),
            "merverdiavgift": str(self.merverdiavgift),
        }
        if self.grunnlag is not None:
            d["grunnlag"] = str(self.grunnlag)
        if self.sats is not None:
            d["sats"] = str(self.sats)
        if self.spesifikasjon:
            d["spesifikasjon"] = self.spesifikasjon
        if self.merknad:
            d["merknad"] = self.merknad
        return d


# =============================================================================
# MVA MELDING XML BUILDER
# =============================================================================

class MvaMeldingXmlBuilder:
    """
    Builds the MvaMelding XML (skattemeldingformerverdiavgift).

    This is the actual VAT return content with specification lines.
    """

    def __init__(
        self,
        organisasjonsnummer: str,
        meldingskategori: str,
        periode: str,            # e.g. "januar-februar"
        aar: int,
        kildesystem: str = "Ciri",
    ):
        self.organisasjonsnummer = organisasjonsnummer
        self.meldingskategori = meldingskategori
        self.periode = periode
        self.aar = aar
        self.kildesystem = kildesystem
        self._linjer: list[MvaSpesifikasjonslinje] = []
        self._kid: Optional[str] = None
        self._merknad: Optional[str] = None
        self._regnskapsreferanse: Optional[str] = None

    def add_linje(self, linje: MvaSpesifikasjonslinje) -> "MvaMeldingXmlBuilder":
        """Add a specification line."""
        self._linjer.append(linje)
        return self

    def set_kid(self, kid: str) -> "MvaMeldingXmlBuilder":
        """Set KID (payment reference) number."""
        self._kid = kid
        return self

    def set_merknad(self, merknad: str) -> "MvaMeldingXmlBuilder":
        """Set overall remark."""
        self._merknad = merknad
        return self

    def set_regnskapsreferanse(self, ref: str) -> "MvaMeldingXmlBuilder":
        """Set accounting system reference."""
        self._regnskapsreferanse = ref
        return self

    def compute_fastsatt_merverdiavgift(self) -> Decimal:
        """Calculate net VAT (sum of all merverdiavgift lines)."""
        return sum(l.merverdiavgift for l in self._linjer)

    def build_xml(self) -> str:
        """Build the MvaMelding XML string."""
        root = Element("mvaMeldingDto", xmlns=NS_MELDING)

        # Innsending metadata
        innsending = SubElement(root, "innsending")
        if self._regnskapsreferanse:
            SubElement(innsending, "regnskapssystemsreferanse").text = self._regnskapsreferanse
        regnskapssystem = SubElement(innsending, "regnskapssystem")
        SubElement(regnskapssystem, "systemnavn").text = self.kildesystem
        SubElement(regnskapssystem, "systemversjon").text = "1.0"

        # Skattegrunnlag og beregnet skatt
        skatt = SubElement(root, "skattegrunnlagOgBeregnetSkatt")

        # Skattleggingsperiode
        periode_el = SubElement(skatt, "skattleggingsperiode")
        periode_besk = SubElement(periode_el, "periode")
        periode_type = self._resolve_period_type(self.periode)
        SubElement(periode_besk, periode_type).text = self.periode
        SubElement(periode_el, "aar").text = str(self.aar)

        # Fastsatt merverdiavgift
        fastsatt = self.compute_fastsatt_merverdiavgift()
        SubElement(skatt, "fastsattMerverdiavgift").text = str(fastsatt)

        # Specification lines
        for linje in self._linjer:
            linje_el = SubElement(skatt, "mvaSpesifikasjonslinje")
            SubElement(linje_el, "mvaKode").text = str(linje.mva_kode)
            if linje.spesifikasjon:
                SubElement(linje_el, "spesifikasjon").text = linje.spesifikasjon
            if linje.grunnlag is not None:
                SubElement(linje_el, "grunnlag").text = str(linje.grunnlag)
            if linje.sats is not None:
                SubElement(linje_el, "sats").text = str(linje.sats)
            SubElement(linje_el, "merverdiavgift").text = str(linje.merverdiavgift)
            if linje.merknad:
                merknad_el = SubElement(linje_el, "merknad")
                SubElement(merknad_el, "beskrivelse").text = linje.merknad

        # Betalingsinformasjon
        betaling = SubElement(root, "betalingsinformasjon")
        if self._kid:
            SubElement(betaling, "kundeIdentifikasjonsnummer").text = self._kid

        # Skattepliktig
        skattepliktig = SubElement(root, "skattepliktig")
        SubElement(skattepliktig, "organisasjonsnummer").text = self.organisasjonsnummer

        # Meldingskategori
        SubElement(root, "meldingskategori").text = self.meldingskategori

        # Overall merknad
        if self._merknad:
            merknad_el = SubElement(root, "merknad")
            SubElement(merknad_el, "beskrivelse").text = self._merknad

        return _pretty_xml(root)

    def _resolve_period_type(self, periode: str) -> str:
        """Determine the XML element name for the period type."""
        if periode in ("aarlig",):
            return "skattleggingsperiodeAar"
        if periode.startswith("uke "):
            return "skattleggingsperiodeUke"
        if "halvdel" in periode:
            return "skattleggingsperiodeHalvMaaned"
        # Check bimonthly (two months)
        bimonthly_values = set(BIMONTHLY_PERIODS.values())
        if periode in bimonthly_values:
            return "skattleggingsperiodeToMaaneder"
        # Check quarterly
        quarterly_values = set(QUARTERLY_PERIODS.values())
        if periode in quarterly_values:
            return "skattleggingsperiodeTreMaaneder"
        # Check six-monthly
        if periode in ("januar-juni", "juli-desember"):
            return "skattleggingsperiodeSeksMaaneder"
        # Single month
        return "skattleggingsperiodeMaaned"


# =============================================================================
# MVA MELDING INNSENDING (ENVELOPE) XML BUILDER
# =============================================================================

class MvaMeldingInnsendingXmlBuilder:
    """
    Builds the MvaMeldingInnsending XML (submission envelope/metadata).

    This wraps the actual MvaMelding and is uploaded as a separate step.
    """

    def __init__(
        self,
        organisasjonsnummer: str,
        meldingskategori: str,
        periode: str,
        aar: int,
        opprettet_av: str = "Ciri",
    ):
        self.organisasjonsnummer = organisasjonsnummer
        self.meldingskategori = meldingskategori
        self.periode = periode
        self.aar = aar
        self.opprettet_av = opprettet_av
        self._vedlegg: list[dict] = []

    def add_melding_vedlegg(self, filnavn: str = "mvaMelding.xml") -> "MvaMeldingInnsendingXmlBuilder":
        """Add the MVA melding as an attachment reference."""
        self._vedlegg.append({
            "vedleggstype": "mva-melding",
            "kildegruppe": "sluttbrukersystem",
            "opprettetAv": self.opprettet_av,
            "filnavn": filnavn,
            "filekstensjon": "xml",
            "filinnhold": "mva-melding",
        })
        return self

    def add_binaer_vedlegg(
        self,
        filnavn: str,
        filekstensjon: str,
        filinnhold: str = "vedlegg",
    ) -> "MvaMeldingInnsendingXmlBuilder":
        """Add a binary attachment reference."""
        self._vedlegg.append({
            "vedleggstype": "binaerVedlegg",
            "kildegruppe": "sluttbrukersystem",
            "opprettetAv": self.opprettet_av,
            "filnavn": filnavn,
            "filekstensjon": filekstensjon,
            "filinnhold": filinnhold,
        })
        return self

    def build_xml(self) -> str:
        """Build the MvaMeldingInnsending XML string."""
        root = Element("mvaMeldingInnsending", xmlns=NS_INNSENDING)

        # Norsk identifikator
        norsk_id = SubElement(root, "norskIdentifikator")
        SubElement(norsk_id, "organisasjonsnummer").text = self.organisasjonsnummer

        # Skattleggingsperiode
        periode_el = SubElement(root, "skattleggingsperiode")
        periode_besk = SubElement(periode_el, "periode")
        periode_type = MvaMeldingXmlBuilder._resolve_period_type(None, self.periode)
        SubElement(periode_besk, periode_type).text = self.periode
        SubElement(periode_el, "aar").text = str(self.aar)

        # Meldingskategori
        SubElement(root, "meldingskategori").text = self.meldingskategori

        # Innsendingstype
        SubElement(root, "innsendingstype").text = "komplett"

        # Opprettet av
        SubElement(root, "opprettetAv").text = self.opprettet_av

        # Opprettingstidspunkt
        SubElement(root, "opprettingstidspunkt").text = datetime.utcnow().strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        # Vedlegg
        for v in self._vedlegg:
            vedlegg_el = SubElement(root, "vedlegg")
            SubElement(vedlegg_el, "vedleggstype").text = v["vedleggstype"]
            SubElement(vedlegg_el, "kildegruppe").text = v["kildegruppe"]
            SubElement(vedlegg_el, "opprettetAv").text = v["opprettetAv"]
            fil_el = SubElement(vedlegg_el, "vedleggsfil")
            SubElement(fil_el, "filnavn").text = v["filnavn"]
            SubElement(fil_el, "filekstensjon").text = v["filekstensjon"]
            SubElement(fil_el, "filinnhold").text = v["filinnhold"]

        return _pretty_xml(root)


# =============================================================================
# HELPERS
# =============================================================================

def _pretty_xml(element: Element) -> str:
    """Convert ElementTree element to pretty-printed XML string."""
    rough = tostring(element, encoding="unicode", xml_declaration=True)
    parsed = xml.dom.minidom.parseString(rough)
    return parsed.toprettyxml(indent="  ", encoding=None)


def get_bimonthly_period(month: int) -> str:
    """Get bimonthly period description for a given month (1-12)."""
    # Round up to even month
    end_month = month if month % 2 == 0 else month + 1
    start_month = end_month - 1
    period = BIMONTHLY_PERIODS.get((start_month, end_month))
    if not period:
        raise ValueError(f"Could not determine bimonthly period for month {month}")
    return period


def get_quarterly_period(month: int) -> str:
    """Get quarterly period description for a given month (1-12)."""
    if month <= 3:
        return "januar-mars"
    elif month <= 6:
        return "april-juni"
    elif month <= 9:
        return "juli-september"
    else:
        return "oktober-desember"
