export interface RecurringPattern {
  id: string;
  merchantName: string;
  category: string;
  categoryLabel: string;
  suggestedAccount: string;
  frequency: "monthly" | "quarterly" | "weekly";
  frequencyLabel: string;
  avgAmount: number;
  currency: string;
  transactions: {
    date: string;
    amount: number;
    description: string;
  }[];
  /** User's decision: true = recurring, false = not recurring, null = undecided */
  confirmed: boolean | null;
}

/**
 * 6 realistic Norwegian recurring transaction patterns
 * spanning ~3 months (PSD2 minimum history window)
 */
export const mockRecurringPatterns: RecurringPattern[] = [
  {
    id: "rec-1",
    merchantName: "Malling & Co Eiendomsforvaltning",
    category: "leie",
    categoryLabel: "Husleie",
    suggestedAccount: "6300",
    frequency: "monthly",
    frequencyLabel: "Månedlig",
    avgAmount: -15000,
    currency: "NOK",
    transactions: [
      { date: "2025-12-01", amount: -15000, description: "MALLING&CO HUSLEIE DES" },
      { date: "2026-01-01", amount: -15000, description: "MALLING&CO HUSLEIE JAN" },
      { date: "2026-02-01", amount: -15000, description: "MALLING&CO HUSLEIE FEB" },
    ],
    confirmed: null,
  },
  {
    id: "rec-2",
    merchantName: "Telenor Norge AS",
    category: "kontor",
    categoryLabel: "Telefon og internett",
    suggestedAccount: "6900",
    frequency: "monthly",
    frequencyLabel: "Månedlig",
    avgAmount: -599,
    currency: "NOK",
    transactions: [
      { date: "2025-12-15", amount: -599, description: "TELENOR MOBILABONNEMENT" },
      { date: "2026-01-15", amount: -599, description: "TELENOR MOBILABONNEMENT" },
      { date: "2026-02-15", amount: -599, description: "TELENOR MOBILABONNEMENT" },
    ],
    confirmed: null,
  },
  {
    id: "rec-3",
    merchantName: "Spotify AB",
    category: "kontor",
    categoryLabel: "Programvare",
    suggestedAccount: "6540",
    frequency: "monthly",
    frequencyLabel: "Månedlig",
    avgAmount: -119,
    currency: "NOK",
    transactions: [
      { date: "2025-12-08", amount: -119, description: "SPOTIFY PREMIUM" },
      { date: "2026-01-08", amount: -119, description: "SPOTIFY PREMIUM" },
      { date: "2026-02-08", amount: -119, description: "SPOTIFY PREMIUM" },
    ],
    confirmed: null,
  },
  {
    id: "rec-4",
    merchantName: "Gjensidige Forsikring ASA",
    category: "forsikring",
    categoryLabel: "Forsikring",
    suggestedAccount: "7500",
    frequency: "quarterly",
    frequencyLabel: "Kvartalsvis",
    avgAmount: -4850,
    currency: "NOK",
    transactions: [
      { date: "2025-09-01", amount: -4800, description: "GJENSIDIGE NÆRINGSFORSIKRING Q3" },
      { date: "2025-12-01", amount: -4850, description: "GJENSIDIGE NÆRINGSFORSIKRING Q4" },
      { date: "2026-03-01", amount: -4900, description: "GJENSIDIGE NÆRINGSFORSIKRING Q1" },
    ],
    confirmed: null,
  },
  {
    id: "rec-5",
    merchantName: "Adobe Systems",
    category: "kontor",
    categoryLabel: "Programvare",
    suggestedAccount: "6540",
    frequency: "monthly",
    frequencyLabel: "Månedlig",
    avgAmount: -659,
    currency: "NOK",
    transactions: [
      { date: "2025-12-20", amount: -659, description: "ADOBE CREATIVE CLOUD" },
      { date: "2026-01-20", amount: -659, description: "ADOBE CREATIVE CLOUD" },
      { date: "2026-02-20", amount: -659, description: "ADOBE CREATIVE CLOUD" },
    ],
    confirmed: null,
  },
  {
    id: "rec-6",
    merchantName: "Vipps AS",
    category: "bank",
    categoryLabel: "Bankgebyr",
    suggestedAccount: "7770",
    frequency: "monthly",
    frequencyLabel: "Månedlig",
    avgAmount: -49,
    currency: "NOK",
    transactions: [
      { date: "2025-12-28", amount: -49, description: "VIPPS NETTHANDEL GEBYR" },
      { date: "2026-01-28", amount: -49, description: "VIPPS NETTHANDEL GEBYR" },
      { date: "2026-02-28", amount: -49, description: "VIPPS NETTHANDEL GEBYR" },
    ],
    confirmed: null,
  },
];

export const MOCK_TOTAL_TRANSACTIONS = 147;
export const MOCK_BANK_NAME = "DNB";
export const MOCK_ACCOUNT_NAME = "Bedriftskonto";
