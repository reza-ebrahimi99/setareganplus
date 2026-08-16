import type {
  AtrinEntityBag,
  AtrinPrimaryIntent,
  ReasoningDecision,
} from "@/lib/atrin/pipeline/types";
import type { EducationAnalysis } from "@/lib/atrin/education/types";

/**
 * Pre-LLM reasoning — decide teach / clarify / search / plan before prompt assembly.
 */
export function reasonAboutTurn(input: {
  query: string;
  primaryIntent: AtrinPrimaryIntent;
  entities: AtrinEntityBag;
  education: EducationAnalysis | null;
  knowledgeConfidence: number;
}): ReasoningDecision {
  const missingInfo: string[] = [];
  const clarifyingQuestions: string[] = [];

  const educational =
    Boolean(input.education?.isEducational) ||
    ["homework", "teaching", "exam", "study_plan", "math", "physics", "chemistry", "biology", "persian", "english"].includes(
      input.primaryIntent,
    );

  if (educational && !input.entities.grade) {
    missingInfo.push("grade");
    clarifyingQuestions.push("پایه‌ات چندم است؟");
  }
  if (
    (input.primaryIntent === "study_plan" || input.primaryIntent === "exam") &&
    !input.entities.hoursPerDay
  ) {
    missingInfo.push("study_hours");
    clarifyingQuestions.push("روزانه چند ساعت می‌توانی مطالعه کنی؟");
  }
  if (
    educational &&
    !input.entities.topic &&
    !input.entities.lesson &&
    input.primaryIntent !== "study_plan"
  ) {
    missingInfo.push("topic");
    clarifyingQuestions.push("کدام مبحث یا درس؟");
  }
  if (input.primaryIntent === "exam" && !input.entities.exam) {
    missingInfo.push("exam");
    clarifyingQuestions.push("آزمون بعدی‌ات چه زمانی و چه آزمونی است؟");
  }
  if (input.primaryIntent === "parent" && !input.entities.grade) {
    missingInfo.push("child_grade");
    clarifyingQuestions.push("فرزندتان در چه پایه‌ای هستند؟");
  }

  const shouldAskClarifying =
    clarifyingQuestions.length > 0 &&
    (input.primaryIntent === "study_plan" ||
      (educational && !input.entities.grade && input.query.length < 40));

  const shouldTeach =
    educational &&
    ["homework", "teaching", "math", "physics", "chemistry", "biology", "persian", "english", "exam"].includes(
      input.primaryIntent,
    );

  const shouldBuildStudyPlan =
    input.primaryIntent === "study_plan" ||
    /برنامه|روزانه|هفتگی/.test(input.query);

  const shouldSearchCms =
    ["admissions", "registration", "school_info", "events", "news", "parent"].includes(
      input.primaryIntent,
    ) || input.knowledgeConfidence < 3;

  const shouldSearchCurriculum = shouldTeach || educational;

  const shouldRecommendConsultation =
    input.primaryIntent === "career" ||
    input.primaryIntent === "parent" ||
    /مشاوره|مشاور/.test(input.query);

  let responseShape: ReasoningDecision["responseShape"] = "advise";
  if (shouldAskClarifying) responseShape = "clarify";
  else if (shouldBuildStudyPlan) responseShape = "plan";
  else if (shouldTeach) responseShape = "teach";
  else if (
    ["school_info", "admissions", "registration", "events", "news"].includes(
      input.primaryIntent,
    )
  ) {
    responseShape = "school_guide";
  } else if (input.primaryIntent === "general_chat") {
    responseShape = "chat";
  }

  const userGoal =
    input.entities.goal ??
    (shouldTeach
      ? "یادگیری و حل مسئله"
      : shouldBuildStudyPlan
        ? "ساخت برنامه مطالعه"
        : shouldRecommendConsultation
          ? "راهنمایی مشاوره‌ای"
          : "پاسخ به پرسش کاربر");

  return {
    userGoal,
    missingInfo,
    shouldAskClarifying,
    clarifyingQuestions: clarifyingQuestions.slice(0, 3),
    shouldSearchCms,
    shouldSearchCurriculum,
    shouldTeach,
    shouldBuildStudyPlan,
    shouldRecommendConsultation,
    responseShape,
    notes: [
      `shape=${responseShape}`,
      `primary=${input.primaryIntent}`,
      missingInfo.length ? `missing=${missingInfo.join(",")}` : "missing=none",
    ],
  };
}
