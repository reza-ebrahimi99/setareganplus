import { PUBLIC_SITE_ORIGIN } from "@/lib/forms/public-form-url";

function defaultAssistantOrigin(): string {
  try {
    const host = new URL(PUBLIC_SITE_ORIGIN).hostname;
    return `https://ai.${host}`;
  } catch {
    return "https://ai.setareganplus.ir";
  }
}

/**
 * Public StarOS AI Assistant base URL.
 * Prefer NEXT_PUBLIC_AI_STAROS_URL (no trailing slash).
 * Default: https://ai.setareganplus.ir
 */
export function getAiAssistantBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_AI_STAROS_URL?.trim();
  const base = (
    fromEnv && fromEnv.length > 0 ? fromEnv : defaultAssistantOrigin()
  ).replace(/\/$/, "");
  return base;
}

/** Chat path relative to base. Override with NEXT_PUBLIC_AI_STAROS_CHAT_PATH. */
export function getAiAssistantChatPath(): string {
  const fromEnv = process.env.NEXT_PUBLIC_AI_STAROS_CHAT_PATH?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
  }
  return "/api/chat";
}

export function getAiAssistantTimeoutMs(): number {
  const raw = Number(process.env.NEXT_PUBLIC_AI_STAROS_TIMEOUT_MS ?? 20000);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 60_000) : 20_000;
}

export const AI_ASSISTANT_STORAGE_KEY = "staros-ai-assistant-v2" as const;
export const AI_ASSISTANT_FAB_SEEN_KEY = "staros-ai-fab-seen-v2" as const;
