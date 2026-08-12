/**
 * Central StarOS AI feature flags & tunables.
 * Prefer env overrides; never hardcode URLs/prompts in UI.
 */

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

function readNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const AI_FEATURE_FLAGS = {
  memory: readBool("NEXT_PUBLIC_AI_MEMORY_ENABLED", true),
  deepPageContext: readBool("NEXT_PUBLIC_AI_DEEP_CONTEXT_ENABLED", true),
  smartSuggestions: readBool("NEXT_PUBLIC_AI_SMART_SUGGESTIONS_ENABLED", true),
  siteSearch: readBool("NEXT_PUBLIC_AI_SITE_SEARCH_ENABLED", true),
  citations: readBool("NEXT_PUBLIC_AI_CITATIONS_ENABLED", true),
  analytics: readBool("NEXT_PUBLIC_AI_ANALYTICS_ENABLED", true),
  streaming: readBool("NEXT_PUBLIC_AI_STREAMING_ENABLED", false),
  voiceInput: readBool("NEXT_PUBLIC_AI_VOICE_INPUT_ENABLED", false),
  voiceOutput: readBool("NEXT_PUBLIC_AI_VOICE_OUTPUT_ENABLED", false),
  plugins: readBool("NEXT_PUBLIC_AI_PLUGINS_ENABLED", false),
  actionPlanning: readBool("NEXT_PUBLIC_AI_PLANNING_ENABLED", true),
  /** AI CRM admissions layer — payload only, disabled by default. */
  crm: readBool("AI_CRM_ENABLED", false) || readBool("NEXT_PUBLIC_AI_CRM_ENABLED", false),
} as const;

export const AI_TUNABLES = {
  /** Keep only recent turns; older ones compact into a short summary. */
  maxHistoryMessages: readNumber("NEXT_PUBLIC_AI_MAX_HISTORY", 8),
  siteSearchConfidenceThreshold: readNumber(
    "NEXT_PUBLIC_AI_SITE_SEARCH_THRESHOLD",
    4,
  ),
  analyticsMaxEvents: readNumber("NEXT_PUBLIC_AI_ANALYTICS_MAX_EVENTS", 200),
  /** Soft caps for knowledge injection (chars ≈ tokens*4). */
  knowledgeMaxBlocks: readNumber("NEXT_PUBLIC_AI_KNOWLEDGE_MAX_BLOCKS", 3),
  knowledgeMaxCharacters: readNumber(
    "NEXT_PUBLIC_AI_KNOWLEDGE_MAX_CHARS",
    900,
  ),
} as const;

export type AiFeatureFlagKey = keyof typeof AI_FEATURE_FLAGS;

export function isAiFeatureEnabled(flag: AiFeatureFlagKey): boolean {
  return AI_FEATURE_FLAGS[flag];
}
