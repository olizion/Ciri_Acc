export interface Transaksjon {
  id: string;
  dato: string;
  bilagId?: string;
  bilagsnummer: string;
  beskrivelse: string;
  debet: number;
  kredit: number;
  motpart: string;
  createdByCiri?: boolean;
}

export interface HovedboKonto {
  kontonummer: string;
  kontonavn: string;
  klasse: string;
  klasseNummer: number;
  inngaendeBalanse: number;
  debet: number;
  kredit: number;
  utgaendeBalanse: number;
  transaksjoner: Transaksjon[];
}

export interface KontoKlasse {
  nummer: number;
  navn: string;
  kontoer: HovedboKonto[];
}

export interface PeriodeValg {
  id: string;
  label: string;
  shortLabel: string;
}

export interface CiriInnsikt {
  type: "warning" | "info";
  message: string;
  konto: string;
}

export interface Filters {
  kontoFra: string;
  kontoTil: string;
  avdeling: string;
  prosjekt: string;
}

export interface Totals {
  totalDebet: number;
  totalKredit: number;
  kontoCount: number;
  transaksjonCount: number;
  differanse: number;
}
