import type { MissingBilag } from "../types";

export const missingBilagData: MissingBilag[] = [
  { id: "1", date: "2025-11-15", amount: -2340, description: "VIPPS *TEKNISK", bankAccount: "1920.10.12345", status: "missing" },
  { id: "2", date: "2025-11-22", amount: -890, description: "REMA 1000 OSLO", bankAccount: "1920.10.12345", status: "missing" },
  { id: "3", date: "2025-12-03", amount: -15600, description: "ELKJØP STORMARKED", bankAccount: "1920.10.12345", status: "needs_review" },
  { id: "4", date: "2025-12-10", amount: -450, description: "SPOTIFY AB", bankAccount: "1920.10.12345", status: "missing" },
  { id: "5", date: "2025-12-12", amount: -1200, description: "CLAS OHLSON", bankAccount: "1920.10.12345", status: "needs_review" },
  { id: "6", date: "2025-12-18", amount: -3400, description: "AMAZON EU", bankAccount: "1920.10.12345", status: "missing" },
  { id: "7", date: "2025-12-20", amount: -780, description: "UBER TRIP", bankAccount: "1920.10.12345", status: "missing" },
  { id: "8", date: "2025-12-22", amount: -5200, description: "POWER NORWAY", bankAccount: "1920.10.12345", status: "needs_review" },
];
