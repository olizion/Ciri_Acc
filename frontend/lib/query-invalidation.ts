/**
 * Cross-page query invalidation.
 *
 * When a write event occurs (e.g. bilag posted), this maps it to all the
 * React Query cache entries that should be refetched. This is the frontend
 * counterpart to backend/config/cache.py WRITE_INVALIDATION_MAP.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

type InvalidationEvent =
  | "bilag:posted"
  | "bilag:approved"
  | "bilag:rejected"
  | "bilag:paid"
  | "bilag:manualPosted"
  | "bilag:deleted"
  | "reconciliation:confirmed"
  | "reconciliation:rejected"
  | "rules:changed";

/**
 * Invalidate all query caches affected by a given write event.
 *
 * Uses prefix matching — e.g. invalidating `["bilag"]` clears both
 * `["bilag","list",…]` and `["bilag","detail",…]`.
 */
export function invalidateOnEvent(
  queryClient: QueryClient,
  event: InvalidationEvent,
): void {
  const keys = EVENT_INVALIDATION_MAP[event];
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

const EVENT_INVALIDATION_MAP: Record<InvalidationEvent, readonly (readonly unknown[])[]> = {
  "bilag:posted": [
    queryKeys.bilag.all,
    queryKeys.reports.all,
  ],
  "bilag:approved": [
    queryKeys.bilag.all,
    queryKeys.reports.all,
  ],
  "bilag:rejected": [
    queryKeys.bilag.all,
  ],
  "bilag:paid": [
    queryKeys.bilag.all,
    queryKeys.reports.all,
  ],
  "bilag:manualPosted": [
    queryKeys.bilag.all,
    queryKeys.reports.all,
    queryKeys.reconciliation.all,
    queryKeys.bank.transactions,
  ],
  "bilag:deleted": [
    queryKeys.bilag.all,
    queryKeys.reports.all,
  ],
  "reconciliation:confirmed": [
    queryKeys.reconciliation.all,
    queryKeys.bank.transactions,
    queryKeys.bilag.all,
    queryKeys.reports.all,
  ],
  "reconciliation:rejected": [
    queryKeys.reconciliation.all,
  ],
  "rules:changed": [
    queryKeys.rules.all,
    queryKeys.bank.transactions,
  ],
};
