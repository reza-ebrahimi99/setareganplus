/**
 * Atrin 3.0 turn runner — Conversation Analyzer → … → Prompt sections.
 * LLM remains one component; this builds the reasoned request.
 */

import { detectAtrinMode } from "@/lib/atrin/detect-mode";
import {
  analyzeEducationInput,
  formatEducationPlan,
} from "@/lib/atrin/education";
import { searchCurriculum } from "@/lib/atrin/curriculum/search";
import { assembleAtrinPromptSections } from "@/lib/atrin/pipeline/assemble";
import { extractAtrinEntities } from "@/lib/atrin/pipeline/entities";
import { buildAtrinFollowUps } from "@/lib/atrin/pipeline/followups";
import {
  detectAtrinIntents,
  mapPrimaryToGuideIntent,
  primaryIntentOf,
} from "@/lib/atrin/pipeline/intent";
import { rankAtrinMemory } from "@/lib/atrin/pipeline/memory-rank";
import { reasonAboutTurn } from "@/lib/atrin/pipeline/reasoning";
import {
  buildStudyPlanDraft,
  formatStudyPlanForPrompt,
} from "@/lib/atrin/pipeline/study-plan";
import type { AtrinTurnContext } from "@/lib/atrin/pipeline/types";
import type { WebsiteGuideIntent } from "@/types/action-card";

function formatCurriculumForPrompt(query: string): {
  section: string;
  hasHits: boolean;
} {
  const result = searchCurriculum(query);
  if (!result.hits.length || result.confidence < 0.35) {
    return { section: "", hasHits: false };
  }

  const lines = result.hits.slice(0, 3).map((hit, index) => {
    const item = hit.item;
    return `${index + 1}. ${item.book} · ${item.chapter} · ${item.lesson} (صفحه ${item.pageStart ?? "—"}–${item.pageEnd ?? "—"}) — ${item.keywords.slice(0, 4).join("، ")}`;
  });

  return {
    hasHits: true,
    section: [
      "CURRICULUM CONTEXT (ground study answers here — never invent catalog rows)",
      ...lines,
      result.clarificationPrompt
        ? `Clarification: ${result.clarificationPrompt}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function runAtrinTurn(input: {
  query: string;
  recentUserTexts: readonly string[];
  guideIntentDetected: WebsiteGuideIntent;
  knowledgeConfidence?: number;
}): AtrinTurnContext {
  const texts = [...input.recentUserTexts, input.query].filter(Boolean);
  const modeId = detectAtrinMode(texts);

  // Analyzer
  const educationRaw = analyzeEducationInput(input.query);
  const education = educationRaw.isEducational ? educationRaw : null;
  const educationPlan = education ? formatEducationPlan(education) : null;

  // Intent
  const intents = detectAtrinIntents(input.query, education, modeId);
  const primaryIntent = primaryIntentOf(intents);

  // Entities
  const entities = extractAtrinEntities(texts, education);

  // Memory (ranked)
  const memory = rankAtrinMemory({
    texts,
    primaryIntent,
    entities,
  });

  // Reasoning (before search/plan decisions finalized)
  const reasoning = reasonAboutTurn({
    query: input.query,
    primaryIntent,
    entities,
    education,
    knowledgeConfidence: input.knowledgeConfidence ?? 0,
  });

  // Curriculum (only when reasoned)
  const curriculum =
    reasoning.shouldSearchCurriculum || education
      ? formatCurriculumForPrompt(input.query)
      : { section: "", hasHits: false };

  // Study planner
  const studyPlan =
    reasoning.shouldBuildStudyPlan || primaryIntent === "study_plan"
      ? buildStudyPlanDraft({
          entities,
          education,
          query: input.query,
        })
      : null;
  const studyPlanSection = studyPlan
    ? formatStudyPlanForPrompt(studyPlan)
    : "";

  const guideIntent = mapPrimaryToGuideIntent(
    primaryIntent,
    input.guideIntentDetected === "general" ? null : input.guideIntentDetected,
  );

  const extraSections = assembleAtrinPromptSections({
    intents,
    entities,
    memorySection: memory.promptSection,
    education,
    educationPlan,
    reasoning,
    studyPlan,
    studyPlanSection,
    curriculumSection: curriculum.section,
  });

  const followUps = buildAtrinFollowUps({
    reasoning,
    education,
    query: input.query,
  });

  return {
    query: input.query,
    modeId,
    intents,
    primaryIntent,
    guideIntent:
      input.guideIntentDetected !== "general" &&
      input.guideIntentDetected !== "greeting"
        ? input.guideIntentDetected
        : guideIntent,
    entities,
    rankedMemory: memory.ranked,
    education,
    educationPlan,
    educationActive: Boolean(education),
    reasoning,
    studyPlan,
    followUps,
    extraSections,
    conversationSummary: memory.summary,
  };
}
