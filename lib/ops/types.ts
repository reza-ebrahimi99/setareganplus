/**
 * Operational Queue Engine — shared types (Sprint 4).
 */

export type OpsQueueId =
  | "ASSIGNMENT"
  | "FOLLOW_UP"
  | "CALL"
  | "SLA"
  | "ESCALATION";

export type OpsEntityType = "LEAD" | "CRM_TASK" | "REGISTRATION";

export type OpsSlaState = "OK" | "AT_RISK" | "BREACHED";

export type OpsPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type OpsDispatchStrategy =
  | "MANUAL"
  | "ROUND_ROBIN"
  | "LEAST_LOAD"
  | "WEIGHTED"
  | "SKILL_BASED"
  | "AI";

/** Shared queue item DTO — all queues return this shape. */
export type OperationalQueueItem = {
  queueId: OpsQueueId;
  entityType: OpsEntityType;
  entityId: string;
  organizationId: string;
  ownerUserId: string | null;
  priority: OpsPriority;
  dueAt: string | null;
  slaState: OpsSlaState;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type OpsQueueListQuery = {
  organizationId: string;
  queueId: OpsQueueId;
  branchIds?: readonly string[];
  ownerUserId?: string | null;
  limit?: number;
};

export type OpsSlaPolicyValues = {
  firstContactHours: number;
  followUpGraceHours: number;
  registrationNeedsCallHours: number;
};

export const DEFAULT_CLAIM_TTL_MS = 5 * 60 * 1000;
export const MIN_CLAIM_TTL_MS = 30 * 1000;
export const MAX_CLAIM_TTL_MS = 15 * 60 * 1000;
export const DEFAULT_QUEUE_LIMIT = 50;
export const MAX_QUEUE_LIMIT = 200;

export const PRIORITY_RANK: Record<OpsPriority, number> = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};
