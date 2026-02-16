import type { ChecklistItem } from "../types";

export const checklistItems: ChecklistItem[] = [
  {
    id: "bilag",
    name: "Bilag komplett",
    description: "Alle kvitteringer og fakturaer lastet opp og matchet",
    status: "warning",
    detail: "247 av 259 bilag matchet",
    subItems: [
      { name: "Inngående fakturaer", complete: true },
      { name: "Utgående fakturaer", complete: true },
      { name: "Kvitteringer", complete: false },
      { name: "Bankbilag", complete: true }
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
    description: "Alle lønnskjøringer og rapporter sendt",
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
      { name: "Driftsmidler gruppe A", complete: true },
      { name: "Driftsmidler gruppe D", complete: false },
      { name: "Immaterielle eiendeler", complete: false }
    ],
    canAutoFix: true
  },
  {
    id: "periodisering",
    name: "Periodiseringer",
    description: "Forskuddsbetalte kostnader og påløpte inntekter",
    status: "pending",
    detail: "Venter på avskrivninger",
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
