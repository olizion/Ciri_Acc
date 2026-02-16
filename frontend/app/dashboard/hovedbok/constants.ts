import { PeriodeValg, CiriInnsikt } from "./types";

export const kontoKlasser: Record<number, string> = {
  1: "Eiendeler",
  2: "Egenkapital og gjeld",
  3: "Salgs- og driftsinntekter",
  4: "Varekostnad",
  5: "Lønnskostnader",
  6: "Avskrivninger og nedskrivninger",
  7: "Andre driftskostnader",
  8: "Finansposter",
};

export const periodeValg: PeriodeValg[] = [
  { id: "denne-maned", label: "Denne måned", shortLabel: "Mnd" },
  { id: "forrige-maned", label: "Forrige måned", shortLabel: "Forr." },
  { id: "dette-kvartal", label: "Dette kvartal", shortLabel: "Kv." },
  { id: "dette-ar", label: "Dette år", shortLabel: "År" },
  { id: "egendefinert", label: "Egendefinert", shortLabel: "..." },
];

export const ciriInnsikter: CiriInnsikt[] = [
  {
    type: "warning",
    message: "Konto 2400 har uvanlig høy aktivitet denne måneden (+127% fra forrige)",
    konto: "2400"
  },
  {
    type: "info",
    message: "Konto 6500 nærmer seg budsjettgrense (87% brukt)",
    konto: "6500"
  },
];
