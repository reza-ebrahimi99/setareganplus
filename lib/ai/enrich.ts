import { resolveAiActions, detectAiIntent } from "@/lib/ai/actions";
import { trackAiEvent } from "@/lib/ai/analytics";
import { buildCitations } from "@/lib/ai/citations";
import { isAiFeatureEnabled } from "@/lib/ai/config";
import type { DeepPageContext } from "@/lib/ai/page-context";
import { buildRecommendations } from "@/lib/ai/recommendations";
import type { SiteSearchHit } from "@/lib/ai/site-search";
import { buildSmartSuggestions } from "@/lib/ai/smart-suggestions";
import type { AiAction, AiRecommendation } from "@/types/ai-actions";
import type { AiCitation } from "@/types/ai-citations";
import type { KnowledgeRetrievalResult } from "@/types/knowledge";

export type EnrichInput = {
  rawReply: string;
  query: string;
  pathname?: string | null;
  page?: string;
  deepPage: DeepPageContext;
  knowledge: KnowledgeRetrievalResult;
  siteHits?: readonly SiteSearchHit[];
  recentUserTexts?: readonly string[];
};

export type EnrichedAiResponse = {
  content: string;
  actions: AiAction[];
  recommendations: AiRecommendation[];
  citations: AiCitation[];
  suggestions: AiAction[];
  intent: string;
  knowledgeIds: string[];
};

/**
 * Response enrichment pipeline (additive layers).
 * Raw AI Reply → Knowledge → Actions → Recommendations → Citations → Suggestions
 */
export function enrichAiResponse(input: EnrichInput): EnrichedAiResponse {
  const intent = detectAiIntent(input.query);
  const actions = resolveAiActions({
    query: input.query,
    knowledgeHits: input.knowledge.hits,
  });
  const recommendations = buildRecommendations({
    query: input.query,
    pathname: input.pathname,
    page: input.page,
    knowledgeHits: input.knowledge.hits,
    recentUserTexts: input.recentUserTexts,
  });

  const citations = isAiFeatureEnabled("citations")
    ? buildCitations({
        knowledgeHits: input.knowledge.hits,
        siteHits: input.siteHits,
      })
    : [];

  const suggestions = isAiFeatureEnabled("smartSuggestions")
    ? buildSmartSuggestions({
        query: input.query,
        page: input.deepPage,
        recentUserTexts: input.recentUserTexts,
      })
    : [];

  if (isAiFeatureEnabled("analytics")) {
    trackAiEvent("question_category", {
      pathname: input.pathname ?? undefined,
      page: input.page,
      category: intent,
      label: input.query.slice(0, 80),
    });
  }

  return {
    content: input.rawReply,
    actions,
    recommendations,
    citations,
    suggestions,
    intent,
    knowledgeIds: input.knowledge.hits.map((hit) => hit.block.id),
  };
}
