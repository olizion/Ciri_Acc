/**
 * Bilag Store
 *
 * Provides shared state for bilags across pages using localStorage.
 * Allows the MVA page to update revisjonslogg for corrections.
 */

export interface RevisionEntry {
  timestamp: string;
  handling: string;
  bruker: string;
  detaljer?: string;
}

export interface BilagRevisionUpdate {
  bilagId: string;
  bilagNo: string;
  entry: RevisionEntry;
}

const STORAGE_KEY = "ciri_bilag_revisions";

/**
 * Get all stored revision updates
 */
export function getStoredRevisions(): BilagRevisionUpdate[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a revision entry for a bilag
 */
export function addRevisionEntry(bilagNo: string, entry: RevisionEntry): void {
  if (typeof window === "undefined") return;

  const revisions = getStoredRevisions();
  revisions.push({
    bilagId: bilagNo,
    bilagNo,
    entry
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(revisions));

  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent("bilag-revision-updated", {
    detail: { bilagNo, entry }
  }));
}

/**
 * Get revision entries for a specific bilag
 */
export function getRevisionsForBilag(bilagNo: string): RevisionEntry[] {
  const revisions = getStoredRevisions();
  return revisions
    .filter(r => r.bilagNo === bilagNo)
    .map(r => r.entry);
}

/**
 * Clear all stored revisions (for testing)
 */
export function clearStoredRevisions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Create a correction revision entry following Bokføringsloven
 */
export function createCorrectionRevisionEntry(
  originalPosting: {
    bilagNo: string;
    amount: number;
    mva: number;
    accountCode: string;
  },
  correction: {
    newAmount: number;
    newMva: number;
    newAccountCode: string;
    reasonLabel: string;
    reasonText?: string;
  },
  crossReferences: {
    reverseringRef: string;
    correctionRef: string;
  }
): RevisionEntry {
  const changes: string[] = [];

  if (originalPosting.amount !== correction.newAmount) {
    changes.push(`Beløp: kr ${originalPosting.amount.toLocaleString("nb-NO")} → kr ${correction.newAmount.toLocaleString("nb-NO")}`);
  }
  if (originalPosting.mva !== correction.newMva) {
    changes.push(`MVA: kr ${originalPosting.mva.toLocaleString("nb-NO")} → kr ${correction.newMva.toLocaleString("nb-NO")}`);
  }
  if (originalPosting.accountCode !== correction.newAccountCode) {
    changes.push(`Konto: ${originalPosting.accountCode} → ${correction.newAccountCode}`);
  }

  return {
    timestamp: new Date().toISOString(),
    handling: `Postering korrigert (${correction.reasonLabel})`,
    bruker: "Bruker",
    detaljer: [
      ...changes,
      `Reversering: ${crossReferences.reverseringRef}`,
      `Ny postering: ${crossReferences.correctionRef}`,
      correction.reasonText ? `Begrunnelse: ${correction.reasonText}` : null
    ].filter(Boolean).join(". ")
  };
}
