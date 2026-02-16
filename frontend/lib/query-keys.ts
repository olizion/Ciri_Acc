/**
 * Centralized query key factory for TanStack React Query.
 *
 * Hierarchical keys enable prefix-based invalidation:
 *   invalidateQueries({ queryKey: ["bilag"] })  → all bilag queries
 *   invalidateQueries({ queryKey: ["reports"] }) → all report queries
 */

export const queryKeys = {
  // ── Bilag (Documents) ───────────────────────────────────
  bilag: {
    all: ["bilag"] as const,
    list: (params?: Record<string, unknown>) =>
      ["bilag", "list", params] as const,
    detail: (id: string) => ["bilag", "detail", id] as const,
  },

  // ── Financial Reports ───────────────────────────────────
  reports: {
    all: ["reports"] as const,
    hovedbok: (params: { periodStart: string; periodEnd: string; companyId: string }) =>
      ["reports", "hovedbok", params] as const,
    balanse: (params: { asOfDate: string; companyId: string }) =>
      ["reports", "balanse", params] as const,
    resultat: (params: { year: string; companyId: string }) =>
      ["reports", "resultat", params] as const,
    accountBilags: (params: { accountCode: string; year: string; companyId: string }) =>
      ["reports", "accountBilags", params] as const,
    summary: (companyId: string) =>
      ["reports", "summary", companyId] as const,
  },

  // ── Bank ────────────────────────────────────────────────
  bank: {
    all: ["bank"] as const,
    accounts: ["bank", "accounts"] as const,
    transactions: ["bank", "transactions"] as const,
    kontoer: ["bank", "kontoer"] as const,
  },

  // ── Reconciliation ─────────────────────────────────────
  reconciliation: {
    all: ["reconciliation"] as const,
    status: (period: string) =>
      ["reconciliation", "status", period] as const,
    suggestions: ["reconciliation", "suggestions"] as const,
  },

  // ── Bank Rules ──────────────────────────────────────────
  rules: {
    all: ["bank", "rules"] as const,
    list: ["bank", "rules"] as const,
    stats: ["bank", "rules", "stats"] as const,
    clusters: ["bank", "clusters", "stats"] as const,
  },

  // ── Invoices ───────────────────────────────────────────
  invoices: {
    all: ["invoices"] as const,
    list: (params?: { status?: string }) =>
      ["invoices", "list", params] as const,
    detail: (id: string) => ["invoices", "detail", id] as const,
  },

  // ── Email ───────────────────────────────────────────────
  email: {
    all: ["email"] as const,
    connections: ["email", "connections"] as const,
    oauthStatus: ["email", "oauthStatus"] as const,
    notificationSettings: ["email", "notificationSettings"] as const,
  },
} as const;
