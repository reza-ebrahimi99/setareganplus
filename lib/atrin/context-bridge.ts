/**
 * Atrin context bridge — wires education, memory, curriculum, and UX mode
 * into the outbound prompt without a second network call.
 * Client-side only; never invents institutional facts.
 */

import { detectAtrinMode } from "@/lib/atrin/detect-mode";
import {
  analyzeEducationInput,
  formatEducationPlan,
} from "@/lib/atrin/education";
import {
  extractMemoryFacts,
  loadMemoryOverrides,
  mergeMemoryFacts,
  type AtrinMemoryFact,
} from "@/lib/atrin/memory";
import { searchCurriculum } from "@/lib/atrin/curriculum/search";
import { loadAtrinProfile } from "@/lib/atrin/profile";
import type { AtrinModeId } from "@/content/atrin";
import type { WebsiteGuideIntent } from "@/types/action-card";

export type AtrinResolvedContext = {
  modeId: AtrinModeId;
  guideIntentHint: WebsiteGuideIntent | null;
  memoryFacts: AtrinMemoryFact[];
  educationActive: boolean;
  extraSections: string[];
};

function mapModeToGuideIntent(modeId: AtrinModeId): WebsiteGuideIntent | null {
  switch (modeId) {
    case "admissions":
      return "admissions";
    case "school":
      return "school";
    case "study":
    case "counselor":
    case "gifted":
    case "career":
      return "study";
    case "qalamchi":
      return "ghalamchi";
    case "parent":
      return "consultation";
    case "summer":
      return "pre_registration";
    default:
      return null;
  }
}

function formatMemoryForPrompt(facts: readonly AtrinMemoryFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts.map((fact) => `- ${fact.label}: ${fact.value}`);
  return [
    "USER MEMORY (remember naturally — never ask again for these facts)",
    ...lines,
    "Use these only when relevant. Do not dump them back as a list.",
  ].join("\n");
}

function formatEducationForPrompt(
  query: string,
): { section: string; active: boolean } {
  const analysis = analyzeEducationInput(query);
  if (!analysis.isEducational) {
    return { section: "", active: false };
  }

  const plan = formatEducationPlan(analysis);
  const topics = [
    ...analysis.mathTopics,
    ...analysis.chemistryTopics,
    ...analysis.physicsTopics,
    ...analysis.languageTopics,
  ]
    .slice(0, 4)
    .join("، ");

  const lines = [
    "EDUCATION ENGINE PLAN (follow this teaching structure)",
    `- Mode: ${analysis.homeworkMode ? "homework (hints before answer)" : analysis.examMode ? "exam coach" : "teach"}`,
    `- Subject: ${analysis.subject.value}`,
    `- Grade: ${analysis.grade.value ?? "unknown"}`,
    `- Difficulty: ${analysis.difficulty.value}`,
    `- Intent: ${analysis.intent.value}`,
    `- Question type: ${analysis.questionType.value}`,
    `- Strategy: ${plan.strategy} — ${plan.labels.title}`,
    `- Tip: ${plan.labels.tip}`,
    `- Required sections (in order): ${plan.sections.join(" → ")}`,
    topics ? `- Topics: ${topics}` : null,
    "RESPONSE RULES",
    "- Teach; do not jump to the final answer first.",
    "- Use short Persian headings, bullets, and numbered steps.",
    "- End with 2–3 suggested next questions as quick chips in prose.",
    "- For math: show method, then steps, then check; mention common mistakes.",
  ].filter(Boolean);

  return { section: lines.join("\n"), active: true };
}

function formatCurriculumForPrompt(query: string): string {
  const result = searchCurriculum(query);
  if (!result.hits.length || result.confidence < 0.35) return "";

  const lines = result.hits.slice(0, 3).map((hit, index) => {
    const item = hit.item;
    return `${index + 1}. ${item.book} · ${item.chapter} · ${item.lesson} (صفحه ${item.pageStart ?? "—"}–${item.pageEnd ?? "—"}) — ${item.keywords.slice(0, 4).join("، ")}`;
  });

  return [
    "CURRICULUM CONTEXT (ground study answers here — do not invent catalog rows)",
    ...lines,
    result.clarificationPrompt ? `Clarification: ${result.clarificationPrompt}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatProfileForPrompt(): string {
  if (typeof window === "undefined") return "";
  try {
    const profile = loadAtrinProfile();
    const bits: string[] = [];
    if (profile.name) bits.push(`- Name: ${profile.name}`);
    if (profile.grade) bits.push(`- Grade: ${profile.grade}`);
    if (profile.favoriteMode) bits.push(`- Preferred mode: ${profile.favoriteMode}`);
    if (bits.length === 0) return "";
    return ["ATRIN PROFILE", ...bits].join("\n");
  } catch {
    return "";
  }
}

/**
 * Resolve Atrin conversation intelligence for one outbound turn.
 */
export function resolveAtrinOutboundContext(input: {
  query: string;
  recentUserTexts: readonly string[];
}): AtrinResolvedContext {
  const texts = [...input.recentUserTexts, input.query].filter(Boolean);
  const modeId = detectAtrinMode(texts);
  const extracted = extractMemoryFacts(texts);
  const overrides =
    typeof window !== "undefined" ? loadMemoryOverrides() : [];
  const memoryFacts = mergeMemoryFacts(extracted, overrides);

  const education = formatEducationForPrompt(input.query);
  const curriculum = education.active
    ? formatCurriculumForPrompt(input.query)
    : "";
  const memory = formatMemoryForPrompt(memoryFacts);
  const profile = formatProfileForPrompt();

  const extraSections = [profile, memory, education.section, curriculum].filter(
    (section) => section.trim().length > 0,
  );

  return {
    modeId,
    guideIntentHint: mapModeToGuideIntent(modeId),
    memoryFacts,
    educationActive: education.active,
    extraSections,
  };
}
