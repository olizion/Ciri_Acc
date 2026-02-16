import type { CiriActivity } from "../types";

export const ciriActivities: CiriActivity[] = [
  { id: "1", task: "Beregner saldoavskrivninger for gruppe D", timestamp: new Date(), status: "in_progress" },
  { id: "2", task: "Avstemte konto 2740 Forskuddsbetalt", timestamp: new Date(Date.now() - 1000 * 60 * 2), status: "completed" },
  { id: "3", task: "Kontrollerte MVA-grunnlag mot bilag", timestamp: new Date(Date.now() - 1000 * 60 * 5), status: "completed" },
  { id: "4", task: "Matchet 3 bankbilag automatisk", timestamp: new Date(Date.now() - 1000 * 60 * 8), status: "completed" },
  { id: "5", task: "Genererte kontospesifikasjon", timestamp: new Date(Date.now() - 1000 * 60 * 12), status: "completed" },
];
