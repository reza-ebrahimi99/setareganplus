/**
 * StarOS «ستاره» — System Prompt Layer (modular, token-efficient).
 */

import {
  assemblePromptModules,
  estimatePromptTokens,
  isLightweightIntent,
  modulesForIntent,
  PROMPT_MODULE_VERSION,
} from "@/lib/ai/prompt-modules";
import type { WebsiteGuideIntent } from "@/types/action-card";

export const PROMPT_VERSION = PROMPT_MODULE_VERSION;

export type AiPageContext =
  | "home"
  | "about"
  | "achievements"
  | "pre-registration"
  | "gallery"
  | "general";

export type SystemPromptContext = {
  pathname?: string | null;
  page?: AiPageContext;
  locale?: "fa";
  /** Detected guide / CRM intent — selects prompt modules. */
  intent?: WebsiteGuideIntent | string | null;
  /** Pre-formatted retrieved knowledge (may be empty). */
  relevantKnowledge?: string;
  /** Additive layered sections (deep context, site search, plans). */
  extraSections?: readonly string[];
  /** Force lightweight greeting mode. */
  lightweight?: boolean;
};

function resolvePageContext(context: SystemPromptContext): AiPageContext {
  if (context.page) return context.page;

  const pathname = context.pathname?.trim() || "/";

  if (pathname === "/" || pathname === "") return "home";
  if (pathname === "/about" || pathname.startsWith("/about/")) return "about";
  if (pathname === "/achievements" || pathname.startsWith("/achievements/")) {
    return "achievements";
  }
  if (
    pathname === "/pre-registration" ||
    pathname.startsWith("/pre-registration/")
  ) {
    return "pre-registration";
  }
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
    return "gallery";
  }

  return "general";
}

/**
 * Assemble the production system prompt.
 * Loads only intent-matched modules — never the full institutional blob.
 */
export function buildSystemPrompt(
  context: SystemPromptContext = {},
): string {
  const pathname = context.pathname?.trim() || "/";
  const intent = context.intent ?? "general";
  const lightweight =
    context.lightweight ?? isLightweightIntent(intent);

  return assemblePromptModules({
    intent,
    pathname,
    relevantKnowledge: context.relevantKnowledge,
    extraSections: context.extraSections,
    lightweight,
  });
}

export function resolveAiPageContext(
  pathname?: string | null,
): AiPageContext {
  return resolvePageContext({ pathname });
}

export {
  estimatePromptTokens,
  isLightweightIntent,
  modulesForIntent,
};
