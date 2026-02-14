import type { RuleStats, ClusterStatsData } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

export const categoryLabels: Record<string, string> = {
  inntekt: "Inntekt",
  varekjop: "Varekjop",
  lonn: "Lonn",
  kontor: "Kontor",
  reise: "Reise",
  mva: "MVA",
  privat: "Privat",
  it: "IT & Programvare",
  bank: "Bank & Finans",
  forsikring: "Forsikring",
  leie: "Leie",
  ukategorisert: "Ukategorisert",
};

export const accountOptions = [
  { value: "6540", label: "6540 - Programvare" },
  { value: "6720", label: "6720 - Databehandling" },
  { value: "7140", label: "7140 - Reisekostnad" },
  { value: "6800", label: "6800 - Kontorutstyr" },
  { value: "4300", label: "4300 - Varekjop" },
  { value: "5000", label: "5000 - Lonn" },
  { value: "6300", label: "6300 - Leiekostnad" },
  { value: "6900", label: "6900 - Telefon/internett" },
  { value: "7100", label: "7100 - Bilkostnad" },
  { value: "7770", label: "7770 - Bank/kortgebyr" },
];

export const emptyStats: RuleStats = {
  total_rules: 0,
  active_rules: 0,
  learned_rules: 0,
  total_applied: 0,
  total_transactions: 0,
  matched_transactions: 0,
  auto_handled: 0,
  autonomy_percentage: 0,
  autonomy_level: "Starter opp",
};

export const emptyClusterStats: ClusterStatsData = {
  total_clusters: 0,
  strong_clusters: 0,
  growing_clusters: 0,
  weak_clusters: 0,
  total_data_points: 0,
  overridden_data_points: 0,
  global_minimums_passed: false,
  global_minimums_reason: "",
  clusters: [],
};

export const strengthLevelConfig: Record<
  string,
  {
    label: string;
    color: string;
    colorEnd: string;
    bgClass: string;
    textClass: string;
  }
> = {
  weak: {
    label: "Svak",
    color: "#8B8FAE",
    colorEnd: "#A7AACA",
    bgClass: "bg-slate-100/60 dark:bg-slate-800/30",
    textClass: "text-slate-500 dark:text-slate-400",
  },
  growing: {
    label: "Vokser",
    color: "#D4853A",
    colorEnd: "#EDB86A",
    bgClass: "bg-orange-50 dark:bg-orange-950/20",
    textClass: "text-orange-700 dark:text-amber-400",
  },
  strong: {
    label: "Sterk",
    color: "#3A8FBF",
    colorEnd: "#6FC4E8",
    bgClass: "bg-sky-50 dark:bg-sky-950/20",
    textClass: "text-sky-700 dark:text-sky-400",
  },
};

export const EASE_SMOOTH: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export const USE_DEV_DATA = false;
