/**
 * Conversation memory — compact older turns when history grows.
 * Keeps full local history intact; only outbound API context is compacted.
 */

export const AI_MEMORY_MAX_MESSAGES = 8;
export const AI_MEMORY_SUMMARY_KEY = "staros-ai-memory-summary-v1" as const;

export type MemoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type PreparedMemory = {
  /** Messages to send to the model (summary + recent window). */
  messages: MemoryMessage[];
  summary: string | null;
  compacted: boolean;
};

function compactLine(role: string, content: string): string {
  const label = role === "user" ? "کاربر" : "ستاره";
  const text = content.replace(/\s+/g, " ").trim();
  const clipped = text.length > 140 ? `${text.slice(0, 140)}…` : text;
  return `- ${label}: ${clipped}`;
}

/**
 * Build a short Persian summary of older conversation turns.
 */
export function summarizeConversation(
  messages: readonly MemoryMessage[],
): string {
  const lines = messages
    .filter((item) => item.role === "user" || item.role === "assistant")
    .slice(-12)
    .map((item) => compactLine(item.role, item.content));

  if (lines.length === 0) return "";

  return [
    "خلاصه فشرده گفتگوی قبلی:",
    ...lines,
    "از این خلاصه فقط برای حفظ پیوستگی استفاده کن؛ جزئیات جدید را حدس نزن.",
  ].join("\n");
}

/**
 * Prepare outbound conversation memory.
 * If history exceeds max, older messages become one summary message.
 */
export function prepareConversationMemory(
  messages: readonly MemoryMessage[],
  maxMessages = AI_MEMORY_MAX_MESSAGES,
): PreparedMemory {
  const chat = messages.filter(
    (item) => item.role === "user" || item.role === "assistant",
  );

  if (chat.length <= maxMessages) {
    return {
      messages: chat.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      summary: null,
      compacted: false,
    };
  }

  const older = chat.slice(0, chat.length - maxMessages);
  const recent = chat.slice(chat.length - maxMessages);
  const summary = summarizeConversation(older);

  const outbound: MemoryMessage[] = [];
  if (summary) {
    outbound.push({
      role: "assistant",
      content: summary,
    });
  }
  outbound.push(
    ...recent.map((item) => ({
      role: item.role,
      content: item.content,
    })),
  );

  return {
    messages: outbound,
    summary,
    compacted: true,
  };
}

export function loadStoredSummary(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AI_MEMORY_SUMMARY_KEY);
  } catch {
    return null;
  }
}

export function persistSummary(summary: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!summary) {
      window.localStorage.removeItem(AI_MEMORY_SUMMARY_KEY);
      return;
    }
    window.localStorage.setItem(AI_MEMORY_SUMMARY_KEY, summary);
  } catch {
    // ignore
  }
}
