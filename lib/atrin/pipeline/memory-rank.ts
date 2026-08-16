import {
  extractMemoryFacts,
  loadMemoryOverrides,
  mergeMemoryFacts,
  type AtrinMemoryFact,
} from "@/lib/atrin/memory";
import { loadStudyProfile } from "@/lib/atrin/education/study-profile";
import { loadAtrinProfile } from "@/lib/atrin/profile";
import { loadStoredSummary } from "@/lib/ai/memory";
import type {
  AtrinEntityBag,
  AtrinPrimaryIntent,
  MemoryCategory,
  RankedMemoryFact,
} from "@/lib/atrin/pipeline/types";

function categorize(fact: AtrinMemoryFact): MemoryCategory {
  switch (fact.id) {
    case "name":
      return "identity";
    case "grade":
    case "major":
    case "math":
    case "qalamchi":
      return "education";
    case "plan":
    case "konkur":
    case "gifted":
      return "goals";
    case "style-simple":
    case "style-steps":
      return "preferences";
    case "weak-math":
    case "weak-physics":
      return "weaknesses";
    case "fav-math":
      return "strengths";
    case "parent":
      return "parent";
    default:
      return "recent";
  }
}

function relevanceForIntent(
  category: MemoryCategory,
  primary: AtrinPrimaryIntent,
): number {
  const table: Record<AtrinPrimaryIntent, MemoryCategory[]> = {
    admissions: ["identity", "education", "parent", "goals"],
    registration: ["identity", "education", "parent", "goals"],
    school_info: ["identity", "education", "parent"],
    events: ["identity", "recent"],
    news: ["recent"],
    homework: ["education", "weaknesses", "preferences", "recent"],
    teaching: ["education", "preferences", "weaknesses", "strengths"],
    exam: ["education", "goals", "weaknesses", "plans"],
    study_plan: ["goals", "education", "weaknesses", "preferences", "plans"],
    career: ["goals", "education", "identity"],
    parent: ["parent", "identity", "education", "goals"],
    teacher: ["education", "recent"],
    math: ["education", "weaknesses", "preferences"],
    physics: ["education", "weaknesses", "preferences"],
    chemistry: ["education", "weaknesses", "preferences"],
    biology: ["education", "weaknesses", "preferences"],
    persian: ["education", "preferences"],
    english: ["education", "preferences"],
    general_chat: ["identity"],
    unknown: ["identity", "education", "recent"],
  };
  const preferred = table[primary] ?? ["identity", "education"];
  const index = preferred.indexOf(category);
  if (index === -1) return 0.15;
  return 1 - index * 0.12;
}

/**
 * Rank and filter memory — inject only relevant facts.
 */
export function rankAtrinMemory(input: {
  texts: readonly string[];
  primaryIntent: AtrinPrimaryIntent;
  entities: AtrinEntityBag;
}): {
  ranked: RankedMemoryFact[];
  summary: string | null;
  promptSection: string;
} {
  const extracted = extractMemoryFacts(input.texts);
  const overrides =
    typeof window !== "undefined" ? loadMemoryOverrides() : [];
  const merged = mergeMemoryFacts(extracted, overrides);

  // Entity-derived facts fill gaps without duplication.
  const extras: AtrinMemoryFact[] = [];
  if (input.entities.name) {
    extras.push({ id: "name", label: "نام", value: input.entities.name });
  }
  if (input.entities.grade) {
    extras.push({ id: "grade", label: "پایه", value: input.entities.grade });
  }
  if (input.entities.major) {
    extras.push({ id: "major", label: "رشته", value: input.entities.major });
  }
  if (input.entities.goal) {
    extras.push({ id: "goal", label: "هدف", value: input.entities.goal });
  }

  const combined = mergeMemoryFacts(merged, extras);

  try {
    const profile = loadAtrinProfile();
    if (profile.name && !combined.some((f) => f.id === "name")) {
      combined.push({ id: "name", label: "نام", value: profile.name });
    }
    if (profile.grade && !combined.some((f) => f.id === "grade")) {
      combined.push({ id: "grade", label: "پایه", value: profile.grade });
    }
  } catch {
    // ignore
  }

  try {
    const study = loadStudyProfile();
    if (study.weakness) {
      combined.push({
        id: "study-weak",
        label: "ضعف مطالعاتی",
        value: study.weakness,
      });
    }
    if (study.preferredStyle) {
      combined.push({
        id: "study-style",
        label: "سبک یادگیری",
        value:
          study.preferredStyle === "hint_first"
            ? "ابتدا راهنما"
            : study.preferredStyle === "step_by_step"
              ? "گام‌به‌گام"
              : "حل کامل",
      });
    }
    if (study.weakTopics[0]) {
      combined.push({
        id: "weak-topic",
        label: "مبحث ضعیف",
        value: study.weakTopics[0],
      });
    }
  } catch {
    // ignore
  }

  const ranked = combined
    .map((fact) => {
      const category = categorize(fact);
      return {
        ...fact,
        category,
        relevance: relevanceForIntent(category, input.primaryIntent),
      };
    })
    .filter((fact) => fact.relevance >= 0.35)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 6);

  const summary = loadStoredSummary();

  const lines = ranked.map(
    (fact) =>
      `- [${fact.category}] ${fact.label}: ${fact.value} (relevance ${fact.relevance.toFixed(2)})`,
  );

  const promptSection =
    ranked.length === 0 && !summary
      ? ""
      : [
          "RELEVANT MEMORY (use naturally — never dump as a list, never re-ask)",
          ...lines,
          summary
            ? `CONVERSATION SUMMARY:\n${summary.slice(0, 500)}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

  return { ranked, summary, promptSection };
}
