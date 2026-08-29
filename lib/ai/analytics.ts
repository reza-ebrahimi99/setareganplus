/**
 * Lightweight AI analytics foundation (local, fire-and-forget).
 * Swap sink later for CRM / server ingest without changing callers.
 */

export type AiAnalyticsEventType =
  | "conversation_started"
  | "conversation_finished"
  | "ai_error"
  | "clicked_action"
  | "clicked_recommendation"
  | "question_category"
  | "page_context";

export type AiAnalyticsEvent = {
  id: string;
  type: AiAnalyticsEventType;
  timestamp: number;
  page?: string;
  pathname?: string;
  category?: string;
  label?: string;
  href?: string;
  meta?: Record<string, string | number | boolean | null>;
};

export const AI_ANALYTICS_STORAGE_KEY = "staros-ai-analytics-v1" as const;
const MAX_EVENTS = 200;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readEvents(): AiAnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AI_ANALYTICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AiAnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AiAnalyticsEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      AI_ANALYTICS_STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS)),
    );
  } catch {
    // ignore quota
  }
}

/**
 * Fire-and-forget local analytics. Never throws to callers.
 * Future CRM: replace body with beacon/fetch to ingest endpoint.
 */
export function trackAiEvent(
  type: AiAnalyticsEventType,
  payload: Omit<AiAnalyticsEvent, "id" | "type" | "timestamp"> = {},
): void {
  try {
    const event: AiAnalyticsEvent = {
      id: createId(),
      type,
      timestamp: Date.now(),
      ...payload,
    };

    const events = readEvents();
    events.push(event);
    writeEvents(events);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("staros:ai-analytics", { detail: event }),
      );
    }
  } catch {
    // never break chat UX
  }
}

export function getAiAnalyticsEvents(): AiAnalyticsEvent[] {
  return readEvents();
}

/** Future CRM integration hook — no-op placeholder. */
export async function flushAiAnalyticsToCrm(): Promise<{ sent: number }> {
  // Replace with CRM / admissions ingest when ready.
  return { sent: 0 };
}
