import { useEffect } from "react";

// ============================================================================
// TYPES
// ============================================================================

export interface CiriAction {
  id: string;
  label: string;
  /** If true, this suggestion triggers a page action (shown with ZapIcon) */
  isAction: boolean;
  /** Ciri's response message after the action fires */
  response?: string;
}

export interface CiriActionEvent {
  actionId: string;
}

// ============================================================================
// EVENT BUS
// ============================================================================

const CIRI_ACTION_EVENT = "ciri:action";

export function dispatchCiriAction(actionId: string) {
  window.dispatchEvent(
    new CustomEvent<CiriActionEvent>(CIRI_ACTION_EVENT, {
      detail: { actionId },
    })
  );
}

/**
 * Register a handler for a Ciri action on the current page.
 * Cleans up automatically when the component unmounts.
 */
export function useCiriActionListener(
  actionId: string,
  handler: () => void
) {
  useEffect(() => {
    function onAction(e: Event) {
      const detail = (e as CustomEvent<CiriActionEvent>).detail;
      if (detail.actionId === actionId) {
        handler();
      }
    }
    window.addEventListener(CIRI_ACTION_EVENT, onAction);
    return () => window.removeEventListener(CIRI_ACTION_EVENT, onAction);
  }, [actionId, handler]);
}

// ============================================================================
// PAGE SUGGESTIONS — upgraded from plain strings to typed actions
// ============================================================================

export const PAGE_ACTIONS: Record<string, CiriAction[]> = {
  "/dashboard": [
    { id: "vis-siste-bilag", label: "Vis siste bilag", isAction: false },
    { id: "mva-status", label: "MVA-status", isAction: false },
    { id: "okonomisk-oversikt", label: "Økonomisk oversikt", isAction: false },
  ],
  "/dashboard/bilag": [
    {
      id: "sok-bilag",
      label: "Søk bilag",
      isAction: true,
      response: "Søkefeltet er klart — skriv inn leverandør eller bilagsnummer.",
    },
    {
      id: "vis-manglende-bilag",
      label: "Manglende bilag",
      isAction: true,
      response: "Filtrerer til bilag som venter på gjennomgang.",
    },
    {
      id: "last-opp-bilag",
      label: "Last opp bilag",
      isAction: true,
      response: "Opplastingsdialogen er åpen — dra inn filer eller klikk for å velge.",
    },
  ],
  "/dashboard/mva": [
    {
      id: "forhandsvis-mva",
      label: "Forhåndsvis MVA",
      isAction: true,
      response: "Åpner forhåndsvisning av MVA-meldingen.",
    },
    { id: "mva-status", label: "MVA-status", isAction: false },
    { id: "neste-frist", label: "Neste frist", isAction: false },
  ],
  "/dashboard/bank/faktura": [
    {
      id: "lag-faktura",
      label: "Lag faktura",
      isAction: true,
      response: "Fakturaskjemaet er klart. Fyll inn kunde og beløp.",
    },
    {
      id: "vis-sendte-fakturaer",
      label: "Vis sendte",
      isAction: true,
      response: "Filtrert til sendte fakturaer.",
    },
    {
      id: "vis-ubetalte-fakturaer",
      label: "Ubetalte",
      isAction: true,
      response: "Filtrert til sendte fakturaer som ikke er betalt.",
    },
  ],
  "/dashboard/bank": [
    {
      id: "uavstemt",
      label: "Gå til avstemming",
      isAction: true,
      response: "Navigerer til avstemming-siden.",
    },
    {
      id: "vis-manglende-bilag-bank",
      label: "Manglende bilag",
      isAction: true,
      response: "Filtrert til transaksjoner uten bilag.",
    },
    { id: "siste-transaksjoner", label: "Siste transaksjoner", isAction: false },
  ],
  "/dashboard/bank/avstemming": [
    {
      id: "avstem-alle",
      label: "Avstem alle",
      isAction: true,
      response: "Bekrefter alle forslag med **høy sikkerhet**. Transaksjonene oppdateres nå.",
    },
    {
      id: "vis-differanser",
      label: "Vis differanser",
      isAction: true,
      response: "Filtrert til uavstemte transaksjoner.",
    },
    {
      id: "foresla-match",
      label: "Foreslå match",
      isAction: true,
      response: "Kjører avstemmingsmotoren på nytt — nye forslag dukker opp om et øyeblikk.",
    },
  ],
  "/dashboard/bank/regler": [
    {
      id: "ny-regel",
      label: "Ny regel",
      isAction: true,
      response: "Opprettingsdialogen er åpen — definer betingelser og handling.",
    },
    {
      id: "kjor-regler",
      label: "Kjør alle regler",
      isAction: true,
      response: "Kjører alle aktive regler mot ubehandlede transaksjoner.",
    },
    {
      id: "vis-klynger",
      label: "Vis klynger",
      isAction: true,
      response: "Byttet til klyngevisning — her ser du grupperte transaksjoner.",
    },
  ],
  "/dashboard/resultat": [
    { id: "vis-siste-bilag", label: "Vis siste bilag", isAction: false },
    { id: "okonomisk-oversikt", label: "Økonomisk oversikt", isAction: false },
  ],
  "/dashboard/balanse": [
    {
      id: "utvid-alle-balanse",
      label: "Utvid alle",
      isAction: true,
      response: "Alle kategorier er utvidet.",
    },
    { id: "okonomisk-oversikt", label: "Økonomisk oversikt", isAction: false },
  ],
  "/dashboard/hovedbok": [
    {
      id: "sok-konto",
      label: "Søk konto",
      isAction: true,
      response: "Søkefeltet er klart — skriv inn kontonavn eller nummer.",
    },
    {
      id: "vis-filter",
      label: "Åpne filter",
      isAction: true,
      response: "Filterpanelet er åpent.",
    },
  ],
  "/dashboard/lonn": [
    { id: "neste-lonnskjoring", label: "Neste lønnskjøring", isAction: false },
    { id: "a-melding-status", label: "A-melding status", isAction: false },
  ],
  "/dashboard/arsregnskap": [
    { id: "start-arsoppgjor", label: "Start årsoppgjør", isAction: false },
    { id: "sjekkliste", label: "Sjekkliste", isAction: false },
  ],
  "/dashboard/innstillinger": [
    { id: "firmainformasjon", label: "Firmainformasjon", isAction: false },
    { id: "kontoplan", label: "Kontoplan", isAction: false },
  ],
  "/dashboard/innstillinger/email": [
    { id: "test-tilkobling", label: "Test tilkobling", isAction: false },
    { id: "e-postregler", label: "E-postregler", isAction: false },
  ],
};

/**
 * Get actions for the current page, with fallback to parent paths.
 */
export function getPageActions(pathname: string): CiriAction[] {
  if (PAGE_ACTIONS[pathname]) return PAGE_ACTIONS[pathname];
  const segments = pathname.split("/");
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join("/");
    if (PAGE_ACTIONS[parent]) return PAGE_ACTIONS[parent];
  }
  return [
    { id: "hva-kan-du", label: "Hva kan du hjelpe med?", isAction: false },
    { id: "vis-oversikt", label: "Vis oversikt", isAction: false },
  ];
}
