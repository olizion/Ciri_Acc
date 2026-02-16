import type { MockTransaction } from "./mock-transactions";
import type { RecurringPattern } from "./mock-data";

// ── Configuration ───────────────────────────────────────────

/** Minimum occurrences to consider a pattern recurring */
const MIN_OCCURRENCES = 3;

/** Max amount variance ratio (0.15 = ±15% from median) for fixed-amount detection */
const AMOUNT_VARIANCE_THRESHOLD = 0.15;

/** Interval tolerance: how close to a perfect interval (as ratio of interval) */
const INTERVAL_TOLERANCE = 0.25; // 25% tolerance (e.g. 30 ± 7.5 days for monthly)

/** Known intervals in days */
const KNOWN_INTERVALS: { name: "monthly" | "quarterly" | "weekly"; days: number; label: string }[] = [
  { name: "weekly", days: 7, label: "Ukentlig" },
  { name: "monthly", days: 30, label: "Månedlig" },
  { name: "quarterly", days: 91, label: "Kvartalsvis" },
];

/** Categories to exclude from recurring detection (salary, tax, transfers) */
const EXCLUDED_CATEGORIES = new Set(["lonn", "mva", "privat"]);

/** Merchant names to exclude (internal transfers, salary) */
const EXCLUDED_MERCHANTS = new Set(["Intern", "Privat", "Lønn", "Skatteetaten"]);

// Category → suggested account mapping
const CATEGORY_ACCOUNTS: Record<string, { account: string; label: string }> = {
  leie: { account: "6300", label: "Husleie" },
  kontor: { account: "6540", label: "Kontor/programvare" },
  forsikring: { account: "7500", label: "Forsikring" },
  bank: { account: "7770", label: "Bankgebyr" },
  reise: { account: "7000", label: "Reisekostnader" },
};

// ── Helpers ──────────────────────────────────────────────────

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function amountVariance(amounts: number[]): number {
  const med = median(amounts);
  if (med === 0) return Infinity;
  const maxDeviation = Math.max(...amounts.map((a) => Math.abs(a - med)));
  return maxDeviation / Math.abs(med);
}

// ── Core Detection ──────────────────────────────────────────

interface MerchantGroup {
  merchantName: string;
  transactions: MockTransaction[];
  category: string;
}

function groupByMerchant(transactions: MockTransaction[]): MerchantGroup[] {
  const groups = new Map<string, MockTransaction[]>();

  for (const tx of transactions) {
    // Skip excluded categories and merchants
    if (EXCLUDED_CATEGORIES.has(tx.category)) continue;
    if (EXCLUDED_MERCHANTS.has(tx.merchantName)) continue;
    // Only look at expenses (negative amounts)
    if (tx.amount >= 0) continue;

    const key = tx.merchantName.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  return Array.from(groups.entries()).map(([_, txs]) => ({
    merchantName: txs[0].merchantName,
    transactions: txs.sort((a, b) => a.date.localeCompare(b.date)),
    category: txs[0].category,
  }));
}

function detectInterval(
  dates: string[],
): { frequency: "monthly" | "quarterly" | "weekly"; label: string } | null {
  if (dates.length < 2) return null;

  // Calculate gaps between consecutive dates
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push(daysBetween(dates[i - 1], dates[i]));
  }

  const medianGap = median(gaps);

  // Try to match against known intervals
  for (const interval of KNOWN_INTERVALS) {
    const tolerance = interval.days * INTERVAL_TOLERANCE;
    if (Math.abs(medianGap - interval.days) <= tolerance) {
      // Verify all gaps are within tolerance
      const allWithinTolerance = gaps.every(
        (gap) => Math.abs(gap - interval.days) <= tolerance
      );
      if (allWithinTolerance) {
        return { frequency: interval.name, label: interval.label };
      }
    }
  }

  return null;
}

function scorePattern(group: MerchantGroup): {
  score: number;
  frequency: "monthly" | "quarterly" | "weekly";
  frequencyLabel: string;
  avgAmount: number;
  isVariableAmount: boolean;
  coreTxs: MockTransaction[];
} | null {
  // Try full group first, then try with outliers removed
  const result = tryScoreSubset(group.transactions);
  if (result) return result;

  // Remove outlier transactions and retry
  if (group.transactions.length > MIN_OCCURRENCES) {
    const core = removeAmountOutliers(group.transactions);
    if (core.length >= MIN_OCCURRENCES) {
      return tryScoreSubset(core);
    }
  }

  return null;
}

/** Remove transactions whose amount deviates >50% from the median */
function removeAmountOutliers(txs: MockTransaction[]): MockTransaction[] {
  const amounts = txs.map((t) => t.amount);
  const med = median(amounts);
  if (med === 0) return txs;
  return txs.filter((t) => Math.abs(t.amount - med) / Math.abs(med) <= 0.5);
}

function tryScoreSubset(txs: MockTransaction[]): {
  score: number;
  frequency: "monthly" | "quarterly" | "weekly";
  frequencyLabel: string;
  avgAmount: number;
  isVariableAmount: boolean;
  coreTxs: MockTransaction[];
} | null {
  if (txs.length < MIN_OCCURRENCES) return null;

  // Detect interval
  const dates = txs.map((t) => t.date);
  const interval = detectInterval(dates);
  if (!interval) return null;

  // Check amount consistency
  const amounts = txs.map((t) => t.amount);
  const variance = amountVariance(amounts);
  const isVariableAmount = variance > AMOUNT_VARIANCE_THRESHOLD;

  // Score: higher is better
  let score = 0;

  // Base score for having enough occurrences
  score += Math.min(txs.length / 3, 1.0) * 0.3; // up to 0.3

  // Interval regularity (lower variance = higher score)
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push(daysBetween(dates[i - 1], dates[i]));
  }
  const gapVariance = gaps.length > 1
    ? Math.max(...gaps.map((g) => Math.abs(g - median(gaps)))) / median(gaps)
    : 0;
  score += Math.max(0, 1 - gapVariance) * 0.35; // up to 0.35

  // Amount consistency (lower variance = higher score)
  // Variable amounts (like electricity) still get partial credit
  score += Math.max(0, 1 - variance) * 0.35; // up to 0.35

  // Minimum score threshold
  if (score < 0.4) return null;

  const avgAmount = Math.round(median(amounts));

  return {
    score,
    frequency: interval.frequency,
    frequencyLabel: interval.label,
    avgAmount,
    isVariableAmount,
    coreTxs: txs,
  };
}

// ── Public API ──────────────────────────────────────────────

export interface DetectedPattern extends RecurringPattern {
  score: number;
  isVariableAmount: boolean;
}

export function detectRecurringPatterns(
  transactions: MockTransaction[],
): DetectedPattern[] {
  const groups = groupByMerchant(transactions);
  const patterns: DetectedPattern[] = [];

  for (const group of groups) {
    const result = scorePattern(group);
    if (!result) continue;

    const accountInfo = CATEGORY_ACCOUNTS[group.category] || {
      account: "6540",
      label: "Diverse",
    };

    patterns.push({
      id: `detected-${group.merchantName.toLowerCase().replace(/\s+/g, "-")}`,
      merchantName: group.merchantName,
      category: group.category,
      categoryLabel: accountInfo.label,
      suggestedAccount: accountInfo.account,
      frequency: result.frequency,
      frequencyLabel: result.frequencyLabel,
      avgAmount: result.avgAmount,
      currency: "NOK",
      transactions: result.coreTxs.map((t) => ({
        date: t.date,
        amount: t.amount,
        description: t.description,
      })),
      confirmed: null,
      score: result.score,
      isVariableAmount: result.isVariableAmount,
    });
  }

  // Sort by score descending
  return patterns.sort((a, b) => b.score - a.score);
}
