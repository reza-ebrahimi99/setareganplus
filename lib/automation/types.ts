/**
 * Automation Engine — shared types (Sprint 5).
 */

export type AutomationEventEnvelope = {
  organizationId: string;
  branchId?: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  data: Record<string, unknown>;
};

export const DEFAULT_AUTOMATION_BATCH = 20;
export const MAX_AUTOMATION_BATCH = 50;
export const MAX_EVENT_ATTEMPTS = 5;
/** Stale PROCESSING lease — reclaim to PENDING after this. */
export const OUTBOX_PROCESSING_LEASE_MS = 5 * 60 * 1000;
/** Max LEAD_REASSIGNED hops for same lead in the rate window. */
export const AUTOMATION_REASSIGN_RATE_LIMIT = 3;
export const AUTOMATION_REASSIGN_RATE_WINDOW_MS = 10 * 60 * 1000;
/** Trip circuit when assign/reassign volume exceeds this in the circuit window. */
export const AUTOMATION_CIRCUIT_TRIP_LIMIT = 8;
export const AUTOMATION_CIRCUIT_WINDOW_MS = 30 * 60 * 1000;
