// Norwegian legal requirements for bilag (Bokforingsloven §§ 5-13)
// Primary documentation must be stored for 5 years from end of fiscal year
// Required fields: bilagsnr, dato, leverandor, beskrivelse, belop, MVA, konto

// Bilag types according to Norwegian accounting standards
export type BilagType =
  | "inngaende_faktura"    // Incoming invoice
  | "utgaende_faktura"     // Outgoing invoice
  | "kvittering"           // Receipt
  | "kreditnota"           // Credit note
  | "bankbilag"            // Bank statement entry
  | "lønnsbilag"           // Payroll document
  | "reiseregning"         // Travel expense
  | "kontantbilag";        // Cash receipt

export type BilagStatus = "bokfort" | "venter" | "venter_transaksjon" | "trenger_gjennomgang" | "arkivert";

// Missing field tracking for incomplete bilags
export interface MissingFields {
  leverandor?: boolean;
  leverandorOrgnr?: boolean;
  kontonummer?: boolean;
  mvaKode?: boolean;
  beskrivelse?: boolean;
}

export interface Bilag {
  id: string;
  bilagsnummer: string;
  bilagstype: BilagType;
  bilagsdato: string;
  registreringsdato: string;
  forfallsdato?: string;
  leverandor: string;
  leverandorOrgnr?: string;
  leverandorAdresse?: string;
  leverandorDomain?: string; // For Brandfetch logo
  beskrivelse: string;
  belopEksMva: number;
  mvaGrunnlag: number;
  mvaBelop: number;
  mvaSats: number;
  mvaKode: string;
  totalBelop: number;
  valuta: string;

  // Foreign currency conversion (for non-NOK invoices)
  originalCurrency?: string;     // Original invoice currency
  originalAmount?: number;       // Original amount in foreign currency
  exchangeRate?: number;         // Conversion rate used
  exchangeRateDate?: string;     // Date of exchange rate
  vatTreatment?: {               // VAT treatment explanation
    hasVAT: boolean;
    vatCode: string;
    vatCodeDescription: string;
    explanation: string;
  };

  kontonummer: string;
  kontonavn: string;
  koststed?: string;
  prosjekt?: string;
  status: BilagStatus;
  ciriKonfidans?: number;
  posteringsreferanse?: string;
  oppbevaringsfrist: string;
  arkivertDato?: string;
  originalFilnavn?: string;
  originalFiltype?: string;
  originalFilUrl?: string;
  opprettetAv: string;
  endretAv?: string;
  endretDato?: string;
  revisjonslogg: RevisionEntry[];
  missingFields?: MissingFields; // Track what Ciri couldn't detect
  ciriMessage?: string; // Ciri's explanation of what's needed
  summary?: string; // AI-generated short description of the invoice
  ciriExplanation?: string; // Ciri's friendly explanation for layman
  periodiseringSuggestion?: PeriodiseringSuggestion;
}

export interface PeriodiseringSuggestion {
  is_candidate: boolean;
  confidence: number;
  reason: string;
  legal_basis: string;
  category: string;
  total_amount: number;
  period_count: number;
  start_period: string;
  end_period: string;
  monthly_amount: number;
  remainder?: number;
  expense_account: string;
  balance_account: string;
  direction?: "kostnad" | "inntekt";
  dismissed: boolean;
  accepted: boolean;
  accepted_at?: string | null;
  user_overrode?: boolean;
  original_period_count?: number;
  original_start_period?: string;
}

export interface RevisionEntry {
  timestamp: string;
  handling: string;
  bruker: string;
  detaljer?: string;
}

// Match assessment from Ciri's scoring algorithm
export interface MatchAssessment {
  score: number;
  confidence: "high" | "medium" | "low";
  explanation: string;
  warning: string | null;
  factors: Record<string, { score: number; matched: boolean; [key: string]: unknown }>;
}
