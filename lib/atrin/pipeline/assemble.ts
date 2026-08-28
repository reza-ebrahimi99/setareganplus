import type {
  AtrinEntityBag,
  AtrinTurnContext,
  ReasoningDecision,
  ScoredIntent,
} from "@/lib/atrin/pipeline/types";
import type { EducationAnalysis, EducationFormattedPlan } from "@/lib/atrin/education/types";
import type { StudyPlanDraft } from "@/lib/atrin/pipeline/types";

function formatEntities(entities: AtrinEntityBag): string {
  const lines = Object.entries(entities)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `- ${key}: ${value}`);
  if (lines.length === 0) return "";
  return ["EXTRACTED ENTITIES (do not re-ask if present)", ...lines].join("\n");
}

function formatIntents(intents: readonly ScoredIntent[]): string {
  return [
    "DETECTED INTENTS",
    ...intents.map(
      (item) =>
        `- ${item.intent} (${item.confidence.toFixed(2)}) [${item.signals.join(", ")}]`,
    ),
  ].join("\n");
}

function formatReasoning(reasoning: ReasoningDecision): string {
  return [
    "REASONING DIRECTIVE (follow this — LLM is executor, not planner)",
    `- User goal: ${reasoning.userGoal}`,
    `- Response shape: ${reasoning.responseShape}`,
    `- Ask clarifying: ${reasoning.shouldAskClarifying ? "yes" : "no"}`,
    reasoning.clarifyingQuestions.length
      ? `- Clarifying questions: ${reasoning.clarifyingQuestions.join(" | ")}`
      : null,
    `- Teach: ${reasoning.shouldTeach ? "yes" : "no"}`,
    `- Study plan: ${reasoning.shouldBuildStudyPlan ? "yes" : "no"}`,
    `- Recommend consultation: ${reasoning.shouldRecommendConsultation ? "yes" : "no"}`,
    `- Search CMS: ${reasoning.shouldSearchCms ? "yes" : "no"}`,
    `- Search curriculum: ${reasoning.shouldSearchCurriculum ? "yes" : "no"}`,
    "If shape=clarify: ask 1–3 short questions first, then give a light starter tip.",
    "If shape=teach: Understand → simple explanation → intuition → example → steps → mistakes → mini-check → next tip.",
    "If shape=plan: present a clear schedule with time blocks and balance.",
    "If shape=school_guide: use retrieved knowledge only; never invent fees/capacity.",
    "Parent tone when parent intent: calm, practical, no student slang.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEducation(
  analysis: EducationAnalysis,
  plan: EducationFormattedPlan,
): string {
  const topics = [
    ...analysis.mathTopics,
    ...analysis.chemistryTopics,
    ...analysis.physicsTopics,
    ...analysis.languageTopics,
  ]
    .slice(0, 4)
    .join("، ");

  return [
    "TEACHING ENGINE PLAN",
    `- Mode: ${analysis.homeworkMode ? "homework (hints before final answer)" : analysis.examMode ? "exam coach" : "teach"}`,
    `- Subject: ${analysis.subject.value}`,
    `- Grade: ${analysis.grade.value ?? "unknown"}`,
    `- Difficulty: ${analysis.difficulty.value}`,
    `- Strategy: ${plan.strategy} — ${plan.labels.title}`,
    `- Tip: ${plan.labels.tip}`,
    `- Sections: ${plan.sections.join(" → ")}`,
    topics ? `- Topics: ${topics}` : null,
    "Never jump to the final answer first. Use Persian markdown headings, bullets, numbered steps.",
    "For math: method → steps → check → common mistakes → alternative method when useful.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatRenderingContract(): string {
  return [
    "RENDERING CONTRACT",
    "- Prefer short headings, bullets, numbered steps, tips, warnings.",
    "- End with: خلاصه کوتاه + اقدام بعدی + ۲–۳ پیشنهاد سؤال بعدی.",
    "- Avoid walls of text. Prefer scannable structure.",
    "- Never invent institutional numbers. If unknown, say so and offer /contact or /pre-registration.",
  ].join("\n");
}

/**
 * Assemble dynamic prompt modules for one reasoned turn.
 */
export function assembleAtrinPromptSections(input: {
  intents: readonly ScoredIntent[];
  entities: AtrinEntityBag;
  memorySection: string;
  education: EducationAnalysis | null;
  educationPlan: EducationFormattedPlan | null;
  reasoning: ReasoningDecision;
  studyPlan: StudyPlanDraft | null;
  studyPlanSection: string;
  curriculumSection: string;
}): string[] {
  const sections: string[] = [
    formatIntents(input.intents),
    formatEntities(input.entities),
    input.memorySection,
    formatReasoning(input.reasoning),
    formatRenderingContract(),
  ];

  if (input.education && input.educationPlan) {
    sections.push(formatEducation(input.education, input.educationPlan));
  }
  if (input.studyPlanSection) sections.push(input.studyPlanSection);
  if (input.curriculumSection) sections.push(input.curriculumSection);

  return sections.filter((section) => section.trim().length > 0);
}

export function summarizeTurnForDebug(turn: AtrinTurnContext): string {
  return `intent=${turn.primaryIntent} shape=${turn.reasoning.responseShape} edu=${turn.educationActive}`;
}
