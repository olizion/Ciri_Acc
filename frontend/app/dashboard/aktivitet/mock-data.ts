/**
 * Mock data for the Activity Dashboard.
 * Represents what real API data would look like from the 3-phase pipeline.
 */

// ── Types ──────────────────────────────────────────────────

export type DecisionTier = 1 | 2 | 3 | 4;
export type DecisionOutcome = "auto_posted" | "suggested" | "flagged" | "ignored" | "overridden";
export type BatchStatus = "completed" | "partial" | "rejected";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "batch_complete" | "rule_fired" | "user_override" | "cluster_update" | "bilag_posted" | "match_suggested" | "surveillance_sweep" | "batch_scheduled" | "mva_deadline";
  title: string;
  description: string;
  metadata?: Record<string, string | number>;
  planned?: boolean;
}

export interface BatchCall {
  id: string;
  timestamp: string;
  status: BatchStatus;
  totalItems: number;
  approved: number;
  flagged: number;
  items: BatchItem[];
  durationMs: number;
  tokenCost: number;
}

export interface BatchItem {
  id: string;
  merchantName: string;
  amount: number;
  bilagNumber: string;
  account: string;
  accountLabel: string;
  tier: DecisionTier;
  confidenceScore: number;
  clusterFit: "HIGH" | "PARTIAL" | "NONE";
  clusterName: string;
  outcome: "approved" | "flagged";
  ciriReasoning: string;
}

export interface Decision {
  id: string;
  timestamp: string;
  merchantName: string;
  amount: number;
  description: string;
  tier: DecisionTier;
  outcome: DecisionOutcome;
  confidenceScore: number;
  account: string;
  accountLabel: string;
  phase1Score: number;
  phase2ClusterFit: "HIGH" | "PARTIAL" | "NONE";
  phase3AiApproved: boolean | null;
  ruleName?: string;
  ciriReasoning?: string;
}

export interface ClusterStat {
  account: string;
  label: string;
  strength: number;
  strengthLevel: "STRONG" | "GROWING" | "WEAK";
  dataPoints: number;
  distinctMerchants: number;
  overrideRate: number;
  amountRange: [number, number];
  recentActivity: number;
}

export interface PipelineStats {
  totalTransactions: number;
  phase1Passed: number;
  phase2Passed: number;
  phase3Queued: number;
  phase3Approved: number;
  phase3Flagged: number;
  suggestedToUser: number;
  autoPosted: number;
  userOverrides: number;
  rulesApplied: number;
}

export interface StrategyConfig {
  autonomyLevel: "assistant" | "autonomous";
  batchSchedule: "mon_fri" | "daily" | "weekly";
  phase3Model: "opus" | "sonnet" | "haiku";
  minClusterStrength: number;
  minConfidenceForQueue: number;
  autoIgnorePrivate: boolean;
}

// ── Mock Data ──────────────────────────────────────────────

export const PIPELINE_STATS: PipelineStats = {
  totalTransactions: 1247,
  phase1Passed: 892,
  phase2Passed: 634,
  phase3Queued: 487,
  phase3Approved: 461,
  phase3Flagged: 26,
  suggestedToUser: 258,
  autoPosted: 461,
  userOverrides: 14,
  rulesApplied: 355,
};

export const STRATEGY_CONFIG: StrategyConfig = {
  autonomyLevel: "autonomous",
  batchSchedule: "mon_fri",
  phase3Model: "opus",
  minClusterStrength: 0.75,
  minConfidenceForQueue: 0.65,
  autoIgnorePrivate: true,
};

export const CLUSTER_STATS: ClusterStat[] = [
  { account: "6540", label: "IT / Programvare", strength: 0.92, strengthLevel: "STRONG", dataPoints: 34, distinctMerchants: 8, overrideRate: 0.0, amountRange: [49, 2890], recentActivity: 12 },
  { account: "6300", label: "Husleie", strength: 0.88, strengthLevel: "STRONG", dataPoints: 24, distinctMerchants: 1, overrideRate: 0.0, amountRange: [15000, 15000], recentActivity: 6 },
  { account: "7770", label: "Bankgebyr", strength: 0.85, strengthLevel: "STRONG", dataPoints: 18, distinctMerchants: 3, overrideRate: 0.06, amountRange: [29, 350], recentActivity: 8 },
  { account: "7500", label: "Forsikring", strength: 0.78, strengthLevel: "STRONG", dataPoints: 12, distinctMerchants: 2, overrideRate: 0.0, amountRange: [4800, 4900], recentActivity: 3 },
  { account: "7000", label: "Reisekostnader", strength: 0.62, strengthLevel: "GROWING", dataPoints: 9, distinctMerchants: 5, overrideRate: 0.11, amountRange: [340, 6700], recentActivity: 4 },
  { account: "6800", label: "Kontorutstyr", strength: 0.54, strengthLevel: "GROWING", dataPoints: 7, distinctMerchants: 4, overrideRate: 0.14, amountRange: [890, 15800], recentActivity: 2 },
  { account: "3000", label: "Salgsinntekt", strength: 0.48, strengthLevel: "WEAK", dataPoints: 6, distinctMerchants: 6, overrideRate: 0.0, amountRange: [78000, 156000], recentActivity: 3 },
  { account: "7100", label: "Bilkostnader", strength: 0.38, strengthLevel: "WEAK", dataPoints: 4, distinctMerchants: 2, overrideRate: 0.25, amountRange: [340, 890], recentActivity: 1 },
];

export const BATCH_CALLS: BatchCall[] = [
  {
    id: "batch-2026-02-14",
    timestamp: "2026-02-14T06:00:12Z",
    status: "completed",
    totalItems: 7,
    approved: 6,
    flagged: 1,
    durationMs: 2340,
    tokenCost: 0.062,
    items: [
      { id: "bi-1", merchantName: "Spotify", amount: -119, bilagNumber: "F-2026-089", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.96, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Gjenkjent abonnement. Beløp og leverandør stemmer overens med 6 tidligere posteringer til konto 6540." },
      { id: "bi-2", merchantName: "Adobe", amount: -659, bilagNumber: "F-2026-090", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.94, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Adobe Creative Cloud abonnement. Identisk beløp som forrige 3 måneder. Korrekt konto." },
      { id: "bi-3", merchantName: "Malling & Co", amount: -15000, bilagNumber: "F-2026-091", account: "6300", accountLabel: "Husleie", tier: 1, confidenceScore: 0.98, clusterFit: "HIGH", clusterName: "Husleie", outcome: "approved", ciriReasoning: "Månedlig husleie. Beløp identisk med kontrakt. Ingen avvik." },
      { id: "bi-4", merchantName: "Figma", amount: -1620, bilagNumber: "F-2026-093", account: "6540", accountLabel: "IT-kostnader", tier: 2, confidenceScore: 0.82, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Design-verktøy. Beløp innenfor normalområde for IT-klyngen (kr 49–2890). Ny leverandør, men passer profilen." },
      { id: "bi-5", merchantName: "Vipps", amount: -49, bilagNumber: "F-2026-094", account: "7770", accountLabel: "Bankgebyr", tier: 1, confidenceScore: 0.95, clusterFit: "HIGH", clusterName: "Bankgebyr", outcome: "approved", ciriReasoning: "Fast månedlig gebyr. Identisk med 6 tidligere posteringer." },
      { id: "bi-6", merchantName: "DNB", amount: -150, bilagNumber: "F-2026-095", account: "7770", accountLabel: "Bankgebyr", tier: 1, confidenceScore: 0.93, clusterFit: "HIGH", clusterName: "Bankgebyr", outcome: "approved", ciriReasoning: "Kontopakke bedrift. Gjentakende gebyr, korrekt kategorisert." },
      { id: "bi-7", merchantName: "Telenor", amount: -12990, bilagNumber: "F-2026-096", account: "6540", accountLabel: "IT-kostnader", tier: 2, confidenceScore: 0.71, clusterFit: "PARTIAL", clusterName: "IT / Programvare", outcome: "flagged", ciriReasoning: "Beløpet kr 12 990 er uvanlig høyt for IT-abonnement (normalt kr 49–2 890). Kan dette være maskinvarekjøp? Anbefaler manuell gjennomgang — bør kanskje konteres til 1200 (Kontormaskiner) i stedet." },
    ],
  },
  {
    id: "batch-2026-02-10",
    timestamp: "2026-02-10T06:00:08Z",
    status: "completed",
    totalItems: 5,
    approved: 5,
    flagged: 0,
    durationMs: 1890,
    tokenCost: 0.048,
    items: [
      { id: "bi-8", merchantName: "Slack", amount: -1299, bilagNumber: "F-2026-082", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.95, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Slack Pro abonnement. Gjenkjent leverandør og beløp. Korrekt konto 6540." },
      { id: "bi-9", merchantName: "Microsoft", amount: -899, bilagNumber: "F-2026-083", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.94, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Microsoft 365 Business. Identisk med forrige 5 måneder." },
      { id: "bi-10", merchantName: "Fjordkraft", amount: -2890, bilagNumber: "F-2026-084", account: "6540", accountLabel: "IT-kostnader", tier: 2, confidenceScore: 0.78, clusterFit: "PARTIAL", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Strømkostnad. Variabelt beløp (kr 2 340–3 180) men innenfor forventet sesongvariasjon. Godkjent." },
      { id: "bi-11", merchantName: "Gjensidige", amount: -4900, bilagNumber: "F-2026-085", account: "7500", accountLabel: "Forsikring", tier: 1, confidenceScore: 0.91, clusterFit: "HIGH", clusterName: "Forsikring", outcome: "approved", ciriReasoning: "Kvartalsvis næringsforsikring. Beløp stemmer med Q1-forfall (±2% fra forrige)." },
      { id: "bi-12", merchantName: "Telenor", amount: -599, bilagNumber: "F-2026-086", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.96, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Mobilabonnement. Fast beløp, gjenkjent mønster." },
    ],
  },
  {
    id: "batch-2026-02-07",
    timestamp: "2026-02-07T06:00:15Z",
    status: "partial",
    totalItems: 4,
    approved: 2,
    flagged: 2,
    durationMs: 2120,
    tokenCost: 0.055,
    items: [
      { id: "bi-13", merchantName: "SAS", amount: -3300, bilagNumber: "F-2026-078", account: "7000", accountLabel: "Reisekostnader", tier: 2, confidenceScore: 0.72, clusterFit: "PARTIAL", clusterName: "Reisekostnader", outcome: "approved", ciriReasoning: "Flybillett. Beløp innenfor normalområde for reiseklyngen. Godkjent som reisekostnad." },
      { id: "bi-14", merchantName: "Thon Hotels", amount: -4200, bilagNumber: "F-2026-079", account: "7000", accountLabel: "Reisekostnader", tier: 2, confidenceScore: 0.69, clusterFit: "PARTIAL", clusterName: "Reisekostnader", outcome: "approved", ciriReasoning: "Hotellovernatting. Passer reisekostnadsklyngen. Akseptabelt beløpsnivå." },
      { id: "bi-15", merchantName: "LinkedIn", amount: -5600, bilagNumber: "F-2026-080", account: "6540", accountLabel: "IT-kostnader", tier: 2, confidenceScore: 0.65, clusterFit: "PARTIAL", clusterName: "IT / Programvare", outcome: "flagged", ciriReasoning: "LinkedIn Premium. Beløpet kr 5 600 er i øvre sjikt for IT-klyngen. Kan dette være en årsavtale? Sjekk om dette bør periodiseres over 12 måneder." },
      { id: "bi-16", merchantName: "Finn.no", amount: -7800, bilagNumber: "F-2026-081", account: "6540", accountLabel: "IT-kostnader", tier: 2, confidenceScore: 0.61, clusterFit: "NONE", clusterName: "—", outcome: "flagged", ciriReasoning: "Stillingsannonse på Finn.no. Dette er ikke IT-kostnad — bør konteres til 5900 (Annen personalkostnad) eller 7300 (Markedsføring). Feil kontoforslag." },
    ],
  },
  {
    id: "batch-2026-02-03",
    timestamp: "2026-02-03T06:00:09Z",
    status: "completed",
    totalItems: 6,
    approved: 6,
    flagged: 0,
    durationMs: 2560,
    tokenCost: 0.071,
    items: [
      { id: "bi-17", merchantName: "Malling & Co", amount: -15000, bilagNumber: "F-2026-068", account: "6300", accountLabel: "Husleie", tier: 1, confidenceScore: 0.98, clusterFit: "HIGH", clusterName: "Husleie", outcome: "approved", ciriReasoning: "Husleie januar. Identisk beløp som kontrakt. Alt i orden." },
      { id: "bi-18", merchantName: "Spotify", amount: -119, bilagNumber: "F-2026-069", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.96, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Spotify Premium. Gjentakende, identisk beløp. Godkjent." },
      { id: "bi-19", merchantName: "Adobe", amount: -659, bilagNumber: "F-2026-070", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.94, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Adobe Creative Cloud. Korrekt konto og beløp." },
      { id: "bi-20", merchantName: "Vipps", amount: -49, bilagNumber: "F-2026-071", account: "7770", accountLabel: "Bankgebyr", tier: 1, confidenceScore: 0.95, clusterFit: "HIGH", clusterName: "Bankgebyr", outcome: "approved", ciriReasoning: "Vipps netthandel gebyr. Standard månedlig gebyr." },
      { id: "bi-21", merchantName: "Microsoft", amount: -899, bilagNumber: "F-2026-072", account: "6540", accountLabel: "IT-kostnader", tier: 1, confidenceScore: 0.94, clusterFit: "HIGH", clusterName: "IT / Programvare", outcome: "approved", ciriReasoning: "Microsoft 365 Business. Gjenkjent mønster." },
      { id: "bi-22", merchantName: "DNB", amount: -150, bilagNumber: "F-2026-073", account: "7770", accountLabel: "Bankgebyr", tier: 1, confidenceScore: 0.93, clusterFit: "HIGH", clusterName: "Bankgebyr", outcome: "approved", ciriReasoning: "DNB kontopakke. Fast månedlig gebyr." },
    ],
  },
];

export const RECENT_DECISIONS: Decision[] = [
  { id: "d-1", timestamp: "2026-02-15T08:12:00Z", merchantName: "Rema 1000", amount: -189, description: "KORTBETALING REMA 1000 TORSHOV", tier: 1, outcome: "ignored", confidenceScore: 1.0, account: "—", accountLabel: "Privat", phase1Score: 1.0, phase2ClusterFit: "NONE", phase3AiApproved: null, ruleName: "Ignorer: REMA" },
  { id: "d-2", timestamp: "2026-02-15T08:12:00Z", merchantName: "Netflix", amount: -149, description: "NETFLIX.COM", tier: 1, outcome: "ignored", confidenceScore: 1.0, account: "—", accountLabel: "Privat", phase1Score: 1.0, phase2ClusterFit: "NONE", phase3AiApproved: null, ruleName: "Ignorer: NETFLIX" },
  { id: "d-3", timestamp: "2026-02-14T06:00:12Z", merchantName: "Spotify", amount: -119, description: "SPOTIFY PREMIUM", tier: 1, outcome: "auto_posted", confidenceScore: 0.96, account: "6540", accountLabel: "IT-kostnader", phase1Score: 0.96, phase2ClusterFit: "HIGH", phase3AiApproved: true },
  { id: "d-4", timestamp: "2026-02-14T06:00:12Z", merchantName: "Telenor", amount: -12990, description: "TELENOR NETTBUTIKK IPHONE", tier: 2, outcome: "flagged", confidenceScore: 0.71, account: "6540", accountLabel: "IT-kostnader", phase1Score: 0.71, phase2ClusterFit: "PARTIAL", phase3AiApproved: false, ciriReasoning: "Uvanlig høyt beløp for IT-abonnement. Kan være maskinvare." },
  { id: "d-5", timestamp: "2026-02-14T06:00:12Z", merchantName: "Malling & Co", amount: -15000, description: "MALLING&CO HUSLEIE FEB", tier: 1, outcome: "auto_posted", confidenceScore: 0.98, account: "6300", accountLabel: "Husleie", phase1Score: 0.98, phase2ClusterFit: "HIGH", phase3AiApproved: true },
  { id: "d-6", timestamp: "2026-02-14T06:00:12Z", merchantName: "Figma", amount: -1620, description: "FIGMA INC SUBSCRIPTION", tier: 2, outcome: "auto_posted", confidenceScore: 0.82, account: "6540", accountLabel: "IT-kostnader", phase1Score: 0.82, phase2ClusterFit: "HIGH", phase3AiApproved: true },
  { id: "d-7", timestamp: "2026-02-13T11:34:00Z", merchantName: "Uber", amount: -289, description: "UBER *TRIP OSLO", tier: 4, outcome: "suggested", confidenceScore: 0.45, account: "7000", accountLabel: "Reisekostnader", phase1Score: 0.45, phase2ClusterFit: "NONE", phase3AiApproved: null },
  { id: "d-8", timestamp: "2026-02-12T09:22:00Z", merchantName: "Komplett.no", amount: -8490, description: "KOMPLETT.NO MONITOR", tier: 3, outcome: "suggested", confidenceScore: 0.68, account: "1200", accountLabel: "Kontormaskiner", phase1Score: 0.68, phase2ClusterFit: "PARTIAL", phase3AiApproved: null },
  { id: "d-9", timestamp: "2026-02-11T14:05:00Z", merchantName: "Foodora", amount: -459, description: "FOODORA TEAMLUNSJ", tier: 4, outcome: "overridden", confidenceScore: 0.52, account: "6540", accountLabel: "IT-kostnader", phase1Score: 0.52, phase2ClusterFit: "NONE", phase3AiApproved: null, ciriReasoning: "Bruker endret konto fra 6540 → 6800 (Kontorkostnader)" },
  { id: "d-10", timestamp: "2026-02-10T06:00:08Z", merchantName: "Slack", amount: -1299, description: "SLACK TECHNOLOGIES PRO", tier: 1, outcome: "auto_posted", confidenceScore: 0.95, account: "6540", accountLabel: "IT-kostnader", phase1Score: 0.95, phase2ClusterFit: "HIGH", phase3AiApproved: true },
  { id: "d-11", timestamp: "2026-02-10T06:00:08Z", merchantName: "Gjensidige", amount: -4900, description: "GJENSIDIGE NÆRINGSFORSIKRING Q1", tier: 1, outcome: "auto_posted", confidenceScore: 0.91, account: "7500", accountLabel: "Forsikring", phase1Score: 0.91, phase2ClusterFit: "HIGH", phase3AiApproved: true },
  { id: "d-12", timestamp: "2026-02-09T16:40:00Z", merchantName: "Circle K", amount: -450, description: "CIRCLE K DRIVSTOFF", tier: 4, outcome: "suggested", confidenceScore: 0.38, account: "7100", accountLabel: "Bilkostnader", phase1Score: 0.38, phase2ClusterFit: "NONE", phase3AiApproved: null },
];

export const ACTIVITY_TIMELINE: ActivityEvent[] = [
  { id: "e-1", timestamp: "2026-02-15T08:12:00Z", type: "surveillance_sweep", title: "Overvåkningssveip fullført", description: "2 nye transaksjoner skannet, 2 ignorert via regler", metadata: { scanned: 2, matched: 0, ignored: 2 } },
  { id: "e-2", timestamp: "2026-02-15T08:12:00Z", type: "rule_fired", title: "Regel: Ignorer REMA 1000", description: "Transaksjonen ble automatisk markert som privat", metadata: { rule: "Ignorer: REMA", txAmount: -189 } },
  { id: "e-3", timestamp: "2026-02-14T06:00:12Z", type: "batch_complete", title: "Fase 3 batch fullført", description: "7 transaksjoner verifisert av Claude Opus — 6 godkjent, 1 flagget", metadata: { approved: 6, flagged: 1, cost: 0.062, durationMs: 2340 } },
  { id: "e-4", timestamp: "2026-02-14T06:00:12Z", type: "bilag_posted", title: "6 bilag autopostert", description: "Spotify, Adobe, Malling & Co, Figma, Vipps, DNB ble bokført automatisk" },
  { id: "e-5", timestamp: "2026-02-13T11:34:00Z", type: "surveillance_sweep", title: "Overvåkningssveip fullført", description: "5 transaksjoner skannet, 1 match foreslått (Uber → Reisekostnader)", metadata: { scanned: 5, matched: 1, suggested: 1 } },
  { id: "e-6", timestamp: "2026-02-12T09:22:00Z", type: "match_suggested", title: "Match foreslått: Komplett.no", description: "kr 8 490 → Kontormaskiner (1200). Konfidensverdi 68% — trenger godkjenning", metadata: { confidence: 0.68, tier: 3 } },
  { id: "e-7", timestamp: "2026-02-11T14:05:00Z", type: "user_override", title: "Bruker endret postering", description: "Foodora kr 459 ble ompotert fra 6540 (IT) til 6800 (Kontorkostnader)", metadata: { fromAccount: "6540", toAccount: "6800" } },
  { id: "e-8", timestamp: "2026-02-10T06:00:08Z", type: "batch_complete", title: "Fase 3 batch fullført", description: "5 transaksjoner verifisert — alle godkjent", metadata: { approved: 5, flagged: 0, cost: 0.048, durationMs: 1890 } },
  { id: "e-9", timestamp: "2026-02-10T06:00:08Z", type: "cluster_update", title: "Klynge oppdatert: IT / Programvare", description: "Styrke økt fra 0.89 → 0.92 etter 5 nye datapunkter", metadata: { from: 0.89, to: 0.92, newPoints: 5 } },
  { id: "e-10", timestamp: "2026-02-07T06:00:15Z", type: "batch_complete", title: "Fase 3 batch fullført", description: "4 transaksjoner verifisert — 2 godkjent, 2 flagget", metadata: { approved: 2, flagged: 2, cost: 0.055, durationMs: 2120 } },
  // Planned / upcoming events
  { id: "e-11", timestamp: "2026-02-16T06:00:00Z", type: "batch_scheduled", title: "Planlagt: Fase 3 batch", description: "Neste batch kjører mandag kl. 06:00 — 3 transaksjoner i kø", metadata: { queued: 3 }, planned: true },
  { id: "e-12", timestamp: "2026-02-20T06:00:00Z", type: "batch_scheduled", title: "Planlagt: Fase 3 batch", description: "Fredag-batch — estimert 4–6 nye transaksjoner", planned: true },
  { id: "e-13", timestamp: "2026-03-10T23:59:00Z", type: "mva_deadline", title: "MVA-frist: 1. termin", description: "Frist for MVA-melding 1. termin 2026 (jan–feb)", planned: true },
];

// ── Derived Stats ──────────────────────────────────────────

export const OUTCOME_DISTRIBUTION = [
  { name: "Autopostert", value: PIPELINE_STATS.autoPosted, color: "var(--chart-1)" },
  { name: "Foreslått", value: PIPELINE_STATS.suggestedToUser, color: "var(--chart-2)" },
  { name: "Ignorert (regler)", value: PIPELINE_STATS.rulesApplied, color: "var(--chart-3)" },
  { name: "Flagget av AI", value: PIPELINE_STATS.phase3Flagged, color: "var(--chart-4)" },
  { name: "Overstyrte", value: PIPELINE_STATS.userOverrides, color: "var(--chart-5)" },
];

export const WEEKLY_ACTIVITY = [
  { week: "Uke 2", autoPosted: 28, suggested: 12, overrides: 1 },
  { week: "Uke 3", autoPosted: 35, suggested: 8, overrides: 2 },
  { week: "Uke 4", autoPosted: 31, suggested: 15, overrides: 0 },
  { week: "Uke 5", autoPosted: 42, suggested: 9, overrides: 3 },
  { week: "Uke 6", autoPosted: 38, suggested: 11, overrides: 1 },
  { week: "Uke 7", autoPosted: 44, suggested: 7, overrides: 2 },
];

export const PHASE_FUNNEL = [
  { phase: "Transaksjoner", count: PIPELINE_STATS.totalTransactions },
  { phase: "Fase 1 bestått", count: PIPELINE_STATS.phase1Passed },
  { phase: "Fase 2 bestått", count: PIPELINE_STATS.phase2Passed },
  { phase: "Fase 3 godkjent", count: PIPELINE_STATS.phase3Approved },
];

// ── New Chart Data ────────────────────────────────────────

/** Confidence distribution — how many decisions land in each confidence bucket */
export const CONFIDENCE_DISTRIBUTION = [
  { range: "0–20%", count: 4, bucket: "Lav" },
  { range: "20–40%", count: 18, bucket: "Lav" },
  { range: "40–60%", count: 42, bucket: "Medium" },
  { range: "60–80%", count: 156, bucket: "Høy" },
  { range: "80–100%", count: 267, bucket: "Svært høy" },
];

/** Batch history — cost, approval rate, and volume per batch run */
export const BATCH_HISTORY = [
  { date: "27. jan", approved: 5, flagged: 1, cost: 0.058, approvalRate: 83, volume: 6 },
  { date: "31. jan", approved: 7, flagged: 0, cost: 0.065, approvalRate: 100, volume: 7 },
  { date: "3. feb", approved: 6, flagged: 0, cost: 0.071, approvalRate: 100, volume: 6 },
  { date: "7. feb", approved: 2, flagged: 2, cost: 0.055, approvalRate: 50, volume: 4 },
  { date: "10. feb", approved: 5, flagged: 0, cost: 0.048, approvalRate: 100, volume: 5 },
  { date: "14. feb", approved: 6, flagged: 1, cost: 0.062, approvalRate: 86, volume: 7 },
];

/** Account distribution — where money is being booked */
export const ACCOUNT_DISTRIBUTION = [
  { account: "6540 IT", amount: 48200 },
  { account: "6300 Husleie", amount: 90000 },
  { account: "7770 Bankgebyr", amount: 3580 },
  { account: "7500 Forsikring", amount: 19600 },
  { account: "7000 Reise", amount: 14200 },
  { account: "6800 Kontor", amount: 8900 },
  { account: "3000 Salg", amount: 624000 },
];

// ── Enhanced Analytics Data ─────────────────────────────

export interface CiriModelUsage {
  model: string;
  calls: number;
  avgDurationMs: number;
  totalCost: number;
  accuracy: number;
}

export interface AutomationTrend {
  week: string;
  autoRate: number;
  totalProcessed: number;
  autoPosted: number;
  suggested: number;
  flagged: number;
}

export interface CategoryAccuracy {
  account: string;
  label: string;
  total: number;
  correct: number;
  overridden: number;
  accuracy: number;
}

export interface ResponseTimeBucket {
  bucket: string;
  count: number;
  cumPct: number;
}

export interface DailyVolume {
  day: string;
  transactions: number;
  autoPosted: number;
}

export const CIRI_MODEL_USAGE: CiriModelUsage[] = [
  { model: "Haiku", calls: 512, avgDurationMs: 340, totalCost: 0.089, accuracy: 96.2 },
  { model: "Sonnet", calls: 248, avgDurationMs: 1200, totalCost: 0.42, accuracy: 94.8 },
  { model: "Opus", calls: 487, avgDurationMs: 2340, totalCost: 1.84, accuracy: 97.1 },
];

export const AUTOMATION_TREND: AutomationTrend[] = [
  { week: "Uke 1", autoRate: 28, totalProcessed: 142, autoPosted: 40, suggested: 82, flagged: 20 },
  { week: "Uke 2", autoRate: 32, totalProcessed: 156, autoPosted: 50, suggested: 88, flagged: 18 },
  { week: "Uke 3", autoRate: 35, totalProcessed: 178, autoPosted: 62, suggested: 96, flagged: 20 },
  { week: "Uke 4", autoRate: 37, totalProcessed: 192, autoPosted: 71, suggested: 98, flagged: 23 },
  { week: "Uke 5", autoRate: 36, totalProcessed: 201, autoPosted: 72, suggested: 108, flagged: 21 },
  { week: "Uke 6", autoRate: 39, totalProcessed: 188, autoPosted: 73, suggested: 94, flagged: 21 },
  { week: "Uke 7", autoRate: 42, totalProcessed: 190, autoPosted: 80, suggested: 89, flagged: 21 },
];

export const CATEGORY_ACCURACY: CategoryAccuracy[] = [
  { account: "6540", label: "IT-kostnader", total: 89, correct: 86, overridden: 3, accuracy: 96.6 },
  { account: "6300", label: "Husleie", total: 24, correct: 24, overridden: 0, accuracy: 100 },
  { account: "7770", label: "Bankgebyr", total: 18, correct: 17, overridden: 1, accuracy: 94.4 },
  { account: "7500", label: "Forsikring", total: 12, correct: 12, overridden: 0, accuracy: 100 },
  { account: "7000", label: "Reisekost.", total: 9, correct: 8, overridden: 1, accuracy: 88.9 },
  { account: "6800", label: "Kontorutstyr", total: 7, correct: 6, overridden: 1, accuracy: 85.7 },
  { account: "3000", label: "Salgsinntekt", total: 6, correct: 6, overridden: 0, accuracy: 100 },
  { account: "7100", label: "Bilkostnader", total: 4, correct: 3, overridden: 1, accuracy: 75.0 },
];

export const RESPONSE_TIME_DIST: ResponseTimeBucket[] = [
  { bucket: "<100ms", count: 156, cumPct: 12.5 },
  { bucket: "100–500ms", count: 489, cumPct: 51.7 },
  { bucket: "500ms–1s", count: 287, cumPct: 74.7 },
  { bucket: "1–2s", count: 198, cumPct: 90.6 },
  { bucket: "2–5s", count: 98, cumPct: 98.5 },
  { bucket: ">5s", count: 19, cumPct: 100 },
];

export const DAILY_VOLUME: DailyVolume[] = [
  { day: "Man", transactions: 48, autoPosted: 19 },
  { day: "Tir", transactions: 42, autoPosted: 17 },
  { day: "Ons", transactions: 38, autoPosted: 15 },
  { day: "Tor", transactions: 44, autoPosted: 18 },
  { day: "Fre", transactions: 52, autoPosted: 22 },
  { day: "Lør", transactions: 12, autoPosted: 4 },
  { day: "Søn", transactions: 8, autoPosted: 3 },
];

export const PIPELINE_HEALTH = {
  overallEfficiency: Math.round((PIPELINE_STATS.autoPosted / PIPELINE_STATS.totalTransactions) * 1000) / 10,
  avgConfidence: 87.2,
  avgResponseTime: 1240,
  costPerTransaction: 0.0019,
  overrideRate: Math.round((PIPELINE_STATS.userOverrides / PIPELINE_STATS.totalTransactions) * 1000) / 10,
  clusterCoverage: 78.4,
  ruleMatchRate: Math.round((PIPELINE_STATS.rulesApplied / PIPELINE_STATS.totalTransactions) * 1000) / 10,
  aiApprovalRate: Math.round((PIPELINE_STATS.phase3Approved / PIPELINE_STATS.phase3Queued) * 1000) / 10,
};
