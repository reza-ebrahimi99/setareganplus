import type {
  EducationAnalysis,
  TeachingStrategyId,
} from "@/lib/atrin/education/types";

export function chooseTeachingStrategy(
  analysis: Pick<
    EducationAnalysis,
    "subject" | "intent" | "homeworkMode" | "examMode"
  >,
): TeachingStrategyId {
  if (analysis.homeworkMode) return "homework_progressive";
  if (analysis.examMode) return "exam_tricks";

  switch (analysis.subject.value) {
    case "math":
    case "geometry":
    case "calculus":
    case "statistics":
    case "discrete_math":
      return "math_steps";
    case "chemistry":
      return "chemistry_reaction";
    case "physics":
      return "physics_formula";
    case "biology":
    case "science":
      return "biology_concept";
    case "persian":
    case "arabic":
    case "english":
    case "dictation":
      return analysis.intent.value === "improve_writing"
        ? "writing_improve"
        : "language_grammar";
    case "writing":
      return "writing_improve";
    case "history":
    case "geography":
    case "social_studies":
    case "religion":
      return "history_narrative";
    case "programming":
      return "programming_debug";
    case "gifted":
    case "konkur":
      return "exam_tricks";
    default:
      return "generic_teach";
  }
}
