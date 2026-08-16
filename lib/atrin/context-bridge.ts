/**
 * Compatibility bridge — Atrin 3.0 turn pipeline.
 * Prefer `runAtrinTurn` for new call sites.
 */

import { detectWebsiteGuideIntent } from "@/lib/ai/actions/detect-intent";
import { runAtrinTurn } from "@/lib/atrin/pipeline/run-turn";
import type { AtrinTurnContext } from "@/lib/atrin/pipeline/types";
import type { AtrinMemoryFact } from "@/lib/atrin/memory";
import type { AtrinModeId } from "@/content/atrin";
import type { WebsiteGuideIntent } from "@/types/action-card";

export type AtrinResolvedContext = {
  modeId: AtrinModeId;
  guideIntentHint: WebsiteGuideIntent | null;
  memoryFacts: AtrinMemoryFact[];
  educationActive: boolean;
  extraSections: string[];
  turn: AtrinTurnContext;
};

/**
 * Resolve Atrin conversation intelligence for one outbound turn.
 */
export function resolveAtrinOutboundContext(input: {
  query: string;
  recentUserTexts: readonly string[];
  knowledgeConfidence?: number;
}): AtrinResolvedContext {
  const detected = detectWebsiteGuideIntent(input.query);
  const turn = runAtrinTurn({
    query: input.query,
    recentUserTexts: input.recentUserTexts,
    guideIntentDetected: detected,
    knowledgeConfidence: input.knowledgeConfidence,
  });

  return {
    modeId: turn.modeId,
    guideIntentHint: turn.guideIntent,
    memoryFacts: turn.rankedMemory,
    educationActive: turn.educationActive,
    extraSections: turn.extraSections,
    turn,
  };
}
