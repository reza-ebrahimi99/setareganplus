/**
 * Session / conversation identity for local memory (no database).
 */

import { persistSummary } from "@/lib/ai/memory";
import { AI_ASSISTANT_STORAGE_KEY } from "@/lib/ai/assistant-config";

export const AI_SESSION_KEY = "staros-ai-session-id-v1" as const;
export const AI_CONVERSATION_KEY = "staros-ai-conversation-id-v1" as const;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getOrCreateSessionId(): string {
  const existing = readKey(AI_SESSION_KEY);
  if (existing) return existing;
  const id = createId("sess");
  writeKey(AI_SESSION_KEY, id);
  return id;
}

export function getOrCreateConversationId(): string {
  const existing = readKey(AI_CONVERSATION_KEY);
  if (existing) return existing;
  const id = createId("conv");
  writeKey(AI_CONVERSATION_KEY, id);
  return id;
}

export function rotateConversationId(): string {
  const id = createId("conv");
  writeKey(AI_CONVERSATION_KEY, id);
  return id;
}

/** Clear chat persistence + summary; keep session id, rotate conversation id. */
export function clearLocalConversation(): string {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(AI_ASSISTANT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  persistSummary(null);
  return rotateConversationId();
}

export function getSessionMeta(): {
  sessionId: string;
  conversationId: string;
} {
  return {
    sessionId: getOrCreateSessionId(),
    conversationId: getOrCreateConversationId(),
  };
}
