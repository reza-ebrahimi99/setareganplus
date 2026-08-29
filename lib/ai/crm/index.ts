import { buildCrmActions } from "@/lib/ai/crm/actions";
import { extractCrmEntities } from "@/lib/ai/crm/entities";
import { detectCrmIntent } from "@/lib/ai/crm/intent";
import { scoreCrmLead } from "@/lib/ai/crm/lead-score";
import { buildLeadPayload } from "@/lib/ai/crm/payload";
import { buildCrmRecommendations } from "@/lib/ai/crm/recommendations";
import { buildCrmConversationSummary } from "@/lib/ai/crm/summary";
import type { AiCrmEntities, AiCrmInsight } from "@/types/ai-crm";

export type BuildCrmInsightInput = {
  query: string;
  recentUserTexts?: readonly string[];
  previousEntities?: Partial<AiCrmEntities>;
};

/**
 * Full CRM insight builder. Payload-only — no Prisma / API writes.
 */
export function buildCrmInsight(input: BuildCrmInsightInput): AiCrmInsight {
  const corpus = [input.query, ...(input.recentUserTexts ?? [])].join("\n");
  const intent = detectCrmIntent(corpus);
  const entities = extractCrmEntities(corpus, input.previousEntities);
  const score = scoreCrmLead(intent);
  const conversationSummary = buildCrmConversationSummary({
    intent,
    grade: entities.grade,
    service: entities.service,
    recentUserTexts: input.recentUserTexts ?? [input.query],
  });
  const payload = buildLeadPayload({
    entities,
    intent,
    score,
    conversationSummary,
  });

  return {
    intent,
    entities,
    score,
    payload,
    actions: buildCrmActions(intent),
    recommendations: buildCrmRecommendations({ intent, entities }),
    conversationSummary,
  };
}

export { detectCrmIntent } from "@/lib/ai/crm/intent";
export { extractCrmEntities } from "@/lib/ai/crm/entities";
export { scoreCrmLead } from "@/lib/ai/crm/lead-score";
export { buildLeadPayload } from "@/lib/ai/crm/payload";
export { buildCrmRecommendations } from "@/lib/ai/crm/recommendations";
export { buildCrmConversationSummary } from "@/lib/ai/crm/summary";
export { buildCrmActions } from "@/lib/ai/crm/actions";
