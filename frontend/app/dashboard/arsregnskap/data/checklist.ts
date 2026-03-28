import type { ChecklistItem } from "../types";

/** Total bilag count (static for now — would come from API) */
export const TOTAL_BILAG_COUNT = 259;

/** Base checklist items. The "bilag" item's detail/status is overridden at the page level. */
export const checklistItems: ChecklistItem[] = [
  {
    id: "bilag",
    name: "Bilag komplett",
    description: "Alle bilag lastet opp og matchet",
    status: "warning",
    detail: "",
    subItems: [
      { name: "Inngående fakturaer", complete: true },
      { name: "Utgående fakturaer", complete: true },
      { name: "Bilag fra banktransaksjoner", complete: false },
    ],
    canAutoFix: false
  },
  {
    id: "bank",
    name: "Bankavstemming",
    description: "Alle bankkontoer avstemt mot regnskap",
    status: "complete",
    detail: "Avstemt per 31.12.2025",
    subItems: [
      { name: "Driftskonto 1920.10.12345", complete: true },
      { name: "Skattetrekkskonto 1950.20.67890", complete: true }
    ]
  },
  {
    id: "mva",
    name: "MVA-oppgaver",
    description: "Alle 6 MVA-terminer sendt og godkjent",
    status: "complete",
    detail: "6 av 6 terminer sendt"
  },
  {
    id: "lonn",
    name: "Lønn og A-meldinger",
    description: "Alle lønnskjøringer og A-meldinger sendt til Skatteetaten",
    status: "complete",
    detail: "12 av 12 A-meldinger sendt"
  },
  {
    id: "avskrivning",
    name: "Avskrivninger",
    description: "Årlige avskrivninger beregnet og bokført",
    status: "in_progress",
    detail: "Ciri beregner saldoavskrivninger",
    subItems: [
      { name: "Kontormøbler og inventar", complete: true },
      { name: "Kjøretøy og maskiner", complete: false },
      { name: "Programvare og immaterielle eiendeler", complete: false }
    ],
    canAutoFix: true
  },
  {
    id: "periodisering",
    name: "Periodiseringer",
    description: "Kostnader og inntekter ført i riktig periode",
    status: "pending",
    detail: "Venter på avskrivninger",
    subItems: [
      { name: "Forskuddsbetalte kostnader (f.eks. forsikring, husleie)", complete: false },
      { name: "Påløpte kostnader (f.eks. renter, feriepenger)", complete: false },
      { name: "Opptjent, ikke-fakturert inntekt", complete: false }
    ],
    canAutoFix: true
  },
  {
    id: "skatt",
    name: "Skatteberegning",
    description: "Betalbar skatt og utsatt skatt beregnet",
    status: "pending",
    detail: "Avhenger av periodiseringer"
  },
  {
    id: "kontroll",
    name: "Kontroll og godkjenning",
    description: "Gjennomgang og signering av regnskapet",
    status: "pending",
    detail: "Siste steg før innsending"
  }
];
