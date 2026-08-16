import { resolveAiActions, detectAiIntent } from "@/lib/ai/actions";
import { trackAiEvent } from "@/lib/ai/analytics";
import { buildCitations } from "@/lib/ai/citations";
import { isAiFeatureEnabled } from "@/lib/ai/config";
import { buildCrmInsight } from "@/lib/ai/crm";
import type { DeepPageContext } from "@/lib/ai/page-context";
import { buildRecommendations } from "@/lib/ai/recommendations";
import type { SiteSearchHit } from "@/lib/ai/site-search";
import { buildSmartSuggestions } from "@/lib/ai/smart-suggestions";
import { validateAtrinReply } from "@/lib/atrin/pipeline/validator";
import type { AtrinTurnContext } from "@/lib/atrin/pipeline/types";
import type { AiAction, AiRecommendation } from "@/types/ai-actions";
import type { AiCitation } from "@/types/ai-citations";
import type { AiCrmInsight } from "@/types/ai-crm";
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
  turn?: AtrinTurnContext | null;
};

export type EnrichedAiResponse = {
  content: string;
  actions: AiAction[];
  recommendations: AiRecommendation[];
  citations: AiCitation[];
  suggestions: AiAction[];
  intent: string;
  knowledgeIds: string[];
  /** Present only when AI_CRM_ENABLED is on — payload only, no writes. */
  crm?: AiCrmInsight;
};

/**
 * Response enrichment pipeline (additive layers).
 * Raw AI Reply → Validator → Knowledge → Actions → Recommendations → Citations → Suggestions → CRM
 */
export function enrichAiResponse(input: EnrichInput): EnrichedAiResponse {
  const validated = input.turn
    ? validateAtrinReply({
        rawReply: input.rawReply,
        shouldTeach: input.turn.reasoning.shouldTeach,
        shouldAskClarifying: input.turn.reasoning.shouldAskClarifying,
        clarifyingQuestions: input.turn.reasoning.clarifyingQuestions,
        hasCurriculum: input.turn.extraSections.some((s) =>
          s.includes("CURRICULUM CONTEXT"),
        ),
      })
    : { content: input.rawReply, patched: false, notes: [] as string[] };

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

  const baseSuggestions = isAiFeatureEnabled("smartSuggestions")
    ? buildSmartSuggestions({
        query: input.query,
        page: input.deepPage,
        recentUserTexts: input.recentUserTexts,
      })
    : [];

  const turnFollowUps = input.turn?.followUps ?? [];
  const suggestions = [...turnFollowUps, ...baseSuggestions]
    .filter(
      (item, index, arr) =>
        arr.findIndex((other) => other.label === item.label) === index,
    )
    .slice(0, 4);

  const crm = isAiFeatureEnabled("crm")
    ? buildCrmInsight({
        query: input.query,
        recentUserTexts: input.recentUserTexts,
      })
    : undefined;

  if (isAiFeatureEnabled("analytics")) {
    trackAiEvent("question_category", {
      pathname: input.pathname ?? undefined,
      page: input.page,
      category: crm?.intent ?? input.turn?.primaryIntent ?? intent,
      label: input.query.slice(0, 80),
      meta: {
        crmEnabled: Boolean(crm),
        crmScore: crm?.score ?? null,
        atrinShape: input.turn?.reasoning.responseShape ?? null,
        validatorNotes: validated.notes.join(",") || null,
        patched: validated.patched,
      },
    });
  }

  return {
    content: validated.content,
    actions,
    recommendations,
    citations,
    suggestions,
    intent: crm?.intent ?? input.turn?.primaryIntent ?? intent,
    knowledgeIds: input.knowledge.hits.map((hit) => hit.block.id),
    crm,
  };
}
