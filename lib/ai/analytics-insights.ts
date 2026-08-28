import { getAiAnalyticsEvents } from "@/lib/ai/analytics";

export type AiAnalyticsInsights = {
  mostAskedQuestions: Array<{ label: string; count: number }>;
  mostVisitedPages: Array<{ label: string; count: number }>;
  popularTopics: Array<{ label: string; count: number }>;
  failedResponses: number;
  averageResponseTimeMs: number | null;
  averageConversationLength: number | null;
};

function topCounts(
  values: string[],
  limit = 5,
): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Local analytics insights provider (no database).
 */
export function getAiAnalyticsInsights(): AiAnalyticsInsights {
  const events = getAiAnalyticsEvents();
  const questions = events
    .filter((event) => event.type === "question_category")
    .map((event) => event.label || event.category || "")
    .filter(Boolean);
  const pages = events
    .filter((event) => event.type === "page_context")
    .map((event) => event.pathname || event.page || "")
    .filter(Boolean);
  const topics = events
    .filter((event) => event.type === "question_category")
    .map((event) => event.category || "")
    .filter(Boolean);

  const durations = events
    .filter((event) => event.type === "conversation_finished")
    .map((event) => {
      const value = event.meta?.durationMs;
      return typeof value === "number" ? value : null;
    })
    .filter((value): value is number => value != null);

  const lengths = events
    .filter((event) => event.type === "conversation_finished")
    .map((event) => {
      const value = event.meta?.messageCount;
      return typeof value === "number" ? value : null;
    })
    .filter((value): value is number => value != null);

  const avg = (nums: number[]) =>
    nums.length === 0
      ? null
      : Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);

  return {
    mostAskedQuestions: topCounts(questions),
    mostVisitedPages: topCounts(pages),
    popularTopics: topCounts(topics),
    failedResponses: events.filter((event) => event.type === "ai_error").length,
    averageResponseTimeMs: avg(durations),
    averageConversationLength: avg(lengths),
  };
}
