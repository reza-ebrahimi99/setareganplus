export type EngineSourceKind = "outbox" | "sms";

/**
 * Normalized envelope for Experience Engine handlers.
 * Payloads must stay non-sensitive (no SMS body, no mobile, no national id).
 */
export type EngineSourceEvent = {
  organizationId: string;
  outboxEventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  sourceKind: EngineSourceKind;
};

export type HandlerOutcome =
  | { status: "processed"; userId?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };
