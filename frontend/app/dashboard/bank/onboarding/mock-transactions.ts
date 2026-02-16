/**
 * ~200 realistic mock bank transactions over 3 months (Dec 2025 – Feb 2026).
 * Mix of:
 *   - RECURRING: known monthly/quarterly patterns that the detector should find
 *   - ONE-OFF: random purchases, transfers, etc. that should NOT be detected
 *   - TRICKY: same merchant one-off (e.g. Telenor hardware), similar amounts
 */

export interface MockTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  merchantName: string;
  category: string;
}

let _id = 0;
function tx(
  date: string,
  amount: number,
  description: string,
  merchantName: string,
  category: string,
): MockTransaction {
  return { id: `mock-tx-${++_id}`, date, amount, description, merchantName, category };
}

// ── RECURRING PATTERNS (should be detected) ─────────────────

const recurring = [
  // 1. Husleie — Malling & Co, monthly ~15000, 1st of month
  tx("2025-12-01", -15000, "MALLING&CO HUSLEIE DES", "Malling & Co", "leie"),
  tx("2026-01-02", -15000, "MALLING&CO HUSLEIE JAN", "Malling & Co", "leie"),  // weekend drift
  tx("2026-02-02", -15000, "MALLING&CO HUSLEIE FEB", "Malling & Co", "leie"),

  // 2. Telenor mobil — monthly 599, mid-month
  tx("2025-12-15", -599, "TELENOR MOBILABONNEMENT", "Telenor", "kontor"),
  tx("2026-01-15", -599, "TELENOR MOBILABONNEMENT", "Telenor", "kontor"),
  tx("2026-02-15", -599, "TELENOR MOBILABONNEMENT", "Telenor", "kontor"),

  // 3. Spotify — monthly 119
  tx("2025-12-08", -119, "SPOTIFY PREMIUM", "Spotify", "kontor"),
  tx("2026-01-08", -119, "SPOTIFY PREMIUM", "Spotify", "kontor"),
  tx("2026-02-08", -119, "SPOTIFY PREMIUM", "Spotify", "kontor"),

  // 4. Adobe Creative Cloud — monthly 659
  tx("2025-12-20", -659, "ADOBE CREATIVE CLOUD", "Adobe", "kontor"),
  tx("2026-01-20", -659, "ADOBE CREATIVE CLOUD", "Adobe", "kontor"),
  tx("2026-02-20", -659, "ADOBE CREATIVE CLOUD", "Adobe", "kontor"),

  // 5. Gjensidige forsikring — quarterly ~4850 (slight variance)
  tx("2025-09-01", -4800, "GJENSIDIGE NÆRINGSFORSIKRING Q3", "Gjensidige", "forsikring"),
  tx("2025-12-01", -4850, "GJENSIDIGE NÆRINGSFORSIKRING Q4", "Gjensidige", "forsikring"),
  tx("2026-03-02", -4900, "GJENSIDIGE NÆRINGSFORSIKRING Q1", "Gjensidige", "forsikring"),

  // 6. Vipps gebyr — monthly 49
  tx("2025-12-28", -49, "VIPPS NETTHANDEL GEBYR", "Vipps", "bank"),
  tx("2026-01-28", -49, "VIPPS NETTHANDEL GEBYR", "Vipps", "bank"),
  tx("2026-02-28", -49, "VIPPS NETTHANDEL GEBYR", "Vipps", "bank"),

  // 7. Microsoft 365 — monthly 899
  tx("2025-12-05", -899, "MICROSOFT 365 BUSINESS", "Microsoft", "kontor"),
  tx("2026-01-05", -899, "MICROSOFT 365 BUSINESS", "Microsoft", "kontor"),
  tx("2026-02-05", -899, "MICROSOFT 365 BUSINESS", "Microsoft", "kontor"),

  // 8. Fjordkraft strøm — monthly, VARYING amounts (electricity)
  tx("2025-12-10", -2340, "FJORDKRAFT STRØM DES", "Fjordkraft", "kontor"),
  tx("2026-01-12", -3180, "FJORDKRAFT STRØM JAN", "Fjordkraft", "kontor"),
  tx("2026-02-10", -2890, "FJORDKRAFT STRØM FEB", "Fjordkraft", "kontor"),

  // 9. DNB bankgebyr — monthly 150
  tx("2025-12-31", -150, "DNB KONTOPAKKE BEDRIFT", "DNB", "bank"),
  tx("2026-01-31", -150, "DNB KONTOPAKKE BEDRIFT", "DNB", "bank"),
  tx("2026-02-28", -150, "DNB KONTOPAKKE BEDRIFT", "DNB", "bank"),

  // 10. Slack — monthly 1299
  tx("2025-12-12", -1299, "SLACK TECHNOLOGIES PRO", "Slack", "kontor"),
  tx("2026-01-12", -1299, "SLACK TECHNOLOGIES PRO", "Slack", "kontor"),
  tx("2026-02-12", -1299, "SLACK TECHNOLOGIES PRO", "Slack", "kontor"),
];

// ── TRICKY ONE-OFFS (same merchant as recurring, but one-off) ────

const trickyOneOffs = [
  // Telenor hardware purchase (NOT recurring — different amount, one-time)
  tx("2026-01-22", -3499, "TELENOR NETTBUTIKK IPHONE CASE", "Telenor", "kontor"),

  // Microsoft one-off (NOT recurring — different product)
  tx("2026-02-14", -4500, "MICROSOFT AZURE ENGANGS", "Microsoft", "kontor"),

  // Gjensidige one-off claim refund (positive amount!)
  tx("2026-01-15", 2500, "GJENSIDIGE ERSTATNING", "Gjensidige", "forsikring"),

  // DNB one-off fee
  tx("2026-01-10", -350, "DNB VALUTAGEBYR", "DNB", "bank"),
];

// ── REGULAR ONE-OFFS (should NOT be detected) ───────────────

const oneOffs = [
  // Client payments (income, irregular)
  tx("2025-12-03", 125000, "BETALING FRA KUNDE AS", "Kunde AS", "inntekt"),
  tx("2025-12-18", 89000, "BETALING FRA NORDIC TECH", "Nordic Tech", "inntekt"),
  tx("2026-01-05", 156000, "BETALING FRA KONSULENT PARTNER", "Konsulent Partner", "inntekt"),
  tx("2026-01-22", 95000, "BETALING FRA DESIGN BUREAU", "Design Bureau", "inntekt"),
  tx("2026-02-03", 112000, "BETALING FRA FINANS GRUPPEN", "Finans Gruppen", "inntekt"),
  tx("2026-02-15", 78000, "BETALING FRA STARTUP CO", "Startup Co", "inntekt"),

  // Salary payments
  tx("2025-12-22", -85000, "LØNNSUTBETALING DES", "Lønn", "lonn"),
  tx("2026-01-22", -85000, "LØNNSUTBETALING JAN", "Lønn", "lonn"),
  tx("2026-02-22", -85000, "LØNNSUTBETALING FEB", "Lønn", "lonn"),

  // Employer tax (AGA) — follows salary
  tx("2025-12-22", -11985, "AGA DESEMBER", "Skatteetaten", "lonn"),
  tx("2026-01-22", -11985, "AGA JANUAR", "Skatteetaten", "lonn"),
  tx("2026-02-22", -11985, "AGA FEBRUAR", "Skatteetaten", "lonn"),

  // VAT payments (quarterly — but these are tax, not subscriptions)
  tx("2025-12-10", -45000, "MVA 5. TERMIN 2025", "Skatteetaten", "mva"),

  // Random purchases
  tx("2025-12-02", -1299, "ELKJØP TASTATUR", "Elkjøp", "kontor"),
  tx("2025-12-05", -459, "REMA 1000 JULEBORD", "Rema 1000", "kontor"),
  tx("2025-12-09", -890, "FLYTOGET", "Flytoget", "reise"),
  tx("2025-12-11", -2450, "SAS FLYBILLETT OSL-BGO", "SAS", "reise"),
  tx("2025-12-14", -189, "NARVESEN OSLO S", "Narvesen", "kontor"),
  tx("2025-12-16", -3200, "CLAS OHLSON KONTORUTSTYR", "Clas Ohlson", "kontor"),
  tx("2025-12-19", -750, "KAFFEBRENNERIET", "Kaffebrenneriet", "kontor"),
  tx("2025-12-23", -4500, "VINMONOPOLET JULEGAVE", "Vinmonopolet", "kontor"),
  tx("2025-12-27", -15800, "KOMPLETT.NO SKJERM", "Komplett", "kontor"),

  tx("2026-01-03", -340, "CIRCLE K DRIVSTOFF", "Circle K", "reise"),
  tx("2026-01-07", -1890, "POWER ADAPTER", "Power", "kontor"),
  tx("2026-01-09", -599, "UBER OSLO", "Uber", "reise"),
  tx("2026-01-11", -245, "7-ELEVEN KAFFE", "7-Eleven", "kontor"),
  tx("2026-01-14", -6700, "SCANDIC HOTELL BERGEN", "Scandic", "reise"),
  tx("2026-01-17", -890, "WOLT LEVERING", "Wolt", "kontor"),
  tx("2026-01-19", -12500, "PROFF.NO ANNONSERING", "Proff.no", "kontor"),
  tx("2026-01-24", -3400, "NORWEGIAN FLYBILLETT", "Norwegian", "reise"),
  tx("2026-01-26", -199, "MENY OSLO CITY", "Meny", "kontor"),
  tx("2026-01-29", -8900, "DUSTIN SKRIVER", "Dustin", "kontor"),

  tx("2026-02-01", -450, "CIRCLE K DRIVSTOFF", "Circle K", "reise"),
  tx("2026-02-04", -2100, "IKEA KONTORSTOL", "IKEA", "kontor"),
  tx("2026-02-06", -789, "FOODORA TEAMLUNSJ", "Foodora", "kontor"),
  tx("2026-02-09", -1560, "NEMLIG.COM KONTORSNACKS", "Nemlig", "kontor"),
  tx("2026-02-11", -340, "JOKER LILLESTRØM", "Joker", "kontor"),
  tx("2026-02-13", -4200, "THON HOTEL GARDERMOEN", "Thon Hotels", "reise"),
  tx("2026-02-16", -5600, "LINKEDIN PREMIUM", "LinkedIn", "kontor"),
  tx("2026-02-18", -950, "PEPPES PIZZA TEAMBUILDING", "Peppes Pizza", "kontor"),
  tx("2026-02-21", -3300, "SAS FLYBILLETT OSL-TRD", "SAS", "reise"),
  tx("2026-02-24", -175, "NARVESEN GARDERMOEN", "Narvesen", "kontor"),
  tx("2026-02-26", -7800, "FINN.NO STILLINGSANNONSE", "Finn.no", "kontor"),

  // Private transactions (marked private, should be ignored)
  tx("2025-12-24", -3500, "PRIVAT OVERFØRING", "Privat", "privat"),
  tx("2026-01-15", -1200, "PRIVAT OVERFØRING", "Privat", "privat"),
  tx("2026-02-10", -2800, "PRIVAT OVERFØRING", "Privat", "privat"),

  // Transfers between own accounts
  tx("2025-12-15", -50000, "OVERF TIL SKATTETREKK", "Intern", "bank"),
  tx("2026-01-15", -50000, "OVERF TIL SKATTETREKK", "Intern", "bank"),
  tx("2026-02-15", -50000, "OVERF TIL SKATTETREKK", "Intern", "bank"),

  // More random one-offs to pad to ~200
  tx("2025-12-06", -2890, "PLANTASJEN KONTOR", "Plantasjen", "kontor"),
  tx("2025-12-13", -445, "STARBUCKS AKER BRYGGE", "Starbucks", "kontor"),
  tx("2025-12-17", -1680, "JULA VERKTØY", "Jula", "kontor"),
  tx("2025-12-21", -960, "VITA GAVEKORT", "Vita", "kontor"),
  tx("2025-12-29", -5400, "EXTRA LEKER JULEGAVE", "Extra Leker", "kontor"),
  tx("2026-01-02", -780, "ESPRESSO HOUSE", "Espresso House", "kontor"),
  tx("2026-01-06", -2350, "XXL SPORT TRENINGSUTSTYR", "XXL", "kontor"),
  tx("2026-01-13", -1120, "APOTEK 1 KONTOR", "Apotek 1", "kontor"),
  tx("2026-01-16", -4200, "BILTEMA GARASJE", "Biltema", "kontor"),
  tx("2026-01-20", -560, "DELI DE LUCA LUNSJ", "Deli de Luca", "kontor"),
  tx("2026-01-25", -8500, "WEBHALLEN.NO SERVER", "Webhallen", "kontor"),
  tx("2026-01-27", -340, "REMA 1000 KONTORVARER", "Rema 1000", "kontor"),
  tx("2026-02-02", -6900, "PRISJAKT NO ANNONSERING", "Prisjakt", "kontor"),
  tx("2026-02-07", -420, "BURGER KING LUNSJ", "Burger King", "kontor"),
  tx("2026-02-12", -1890, "TEKNIKMAGASINET USB", "Teknikmagasinet", "kontor"),
  tx("2026-02-14", -550, "NORLI FAGBOK", "Norli", "kontor"),
  tx("2026-02-17", -3100, "COOP OBS KONTORVARER", "Coop Obs", "kontor"),
  tx("2026-02-19", -780, "WAYNES COFFEE MØTE", "Waynes Coffee", "kontor"),
  tx("2026-02-22", -2400, "CLAES OHLSON LAGER", "Clas Ohlson", "kontor"),
  tx("2026-02-25", -690, "KONDOMERIET TEAMGAVE", "Diverse", "kontor"),
  tx("2026-02-27", -4100, "POSTEN FRAKT", "Posten", "kontor"),
];

export const allMockTransactions: MockTransaction[] = [
  ...recurring,
  ...trickyOneOffs,
  ...oneOffs,
].sort((a, b) => a.date.localeCompare(b.date));

// Ground truth for testing: these merchant names should be detected as recurring
export const EXPECTED_RECURRING_MERCHANTS = [
  "Malling & Co",
  "Telenor",
  "Spotify",
  "Adobe",
  "Gjensidige",
  "Vipps",
  "Microsoft",
  "Fjordkraft",
  "DNB",
  "Slack",
];

// These should NOT be detected despite appearing multiple times
export const EXPECTED_NOT_RECURRING = [
  "Rema 1000",      // 2 purchases, irregular amounts
  "SAS",            // 2 flights, irregular
  "Circle K",       // 2 gas fills, irregular amounts
  "Narvesen",       // 2 purchases, different locations
  "Clas Ohlson",    // 2 purchases, very different amounts
];
