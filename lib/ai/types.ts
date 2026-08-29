/**
 * AI assistance foundation types (advisory only).
 * Booking/validation/capacity never depend on AI availability.
 */

export type AiFeatureFlag =
  | "booking_recommendations"
  | "booking_anomaly_hints"
  | "admin_daily_summary"
  | "schedule_nl_helper"
  | "parent_booking_assistant";

export type AiProviderRequest = {
  feature: AiFeatureFlag;
  /** Non-sensitive structured context only */
  context: Record<string, unknown>;
  locale: "fa";
  timeoutMs?: number;
};

export type AiProviderResponse = {
  ok: true;
  text: string;
  structured?: Record<string, unknown>;
} | {
  ok: false;
  reason: "disabled" | "timeout" | "unavailable" | "invalid";
};

export type AiProvider = {
  readonly name: string;
  isEnabled(): boolean;
  complete(request: AiProviderRequest): Promise<AiProviderResponse>;
};

export type ProposedScheduleBlock = {
  weekdays: number[]; // 0=Sat … 6=Fri
  startLocalTime: string;
  endLocalTime: string;
  durationMinutes: number;
  slotCapacity: number;
};

export type ProposedScheduleDraft = {
  blocks: ProposedScheduleBlock[];
  closedWeekdays: number[];
  notes: string[];
};
