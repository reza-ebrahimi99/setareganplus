import type { ReasoningDecision } from "@/lib/atrin/pipeline/types";
import type { EducationAnalysis } from "@/lib/atrin/education/types";
import type { AiAction } from "@/types/ai-actions";

/**
 * Contextual follow-up chips — not random.
 */
export function buildAtrinFollowUps(input: {
  reasoning: ReasoningDecision;
  education: EducationAnalysis | null;
  query: string;
}): AiAction[] {
  const chips: AiAction[] = [];
  const push = (id: string, label: string, href = "") => {
    if (chips.length >= 4) return;
    if (chips.some((c) => c.label === label)) return;
    chips.push({
      id,
      type: href ? "page" : "link",
      label,
      href: href || "#",
    });
  };

  if (input.reasoning.shouldTeach || input.education?.isEducational) {
    push("fu-hint", "توضیح ساده‌تر");
    push("fu-example", "مثال بیشتر");
    push("fu-quiz", "یک آزمونک کوتاه");
    if (input.education?.homeworkMode) push("fu-steps", "حل گام‌به‌گام");
  }

  if (input.reasoning.shouldBuildStudyPlan) {
    push("fu-week", "برنامه هفتگی");
    push("fu-exam", "برنامه تا آزمون");
  }

  if (input.reasoning.shouldRecommendConsultation) {
    push("fu-consult", "رزرو مشاوره", "/consultation");
  }

  if (
    input.reasoning.responseShape === "school_guide" ||
    /ثبت\s*نام|پذیرش/.test(input.query)
  ) {
    push("fu-reg", "پیش‌ثبت‌نام", "/pre-registration");
    push("fu-ach", "مشاهده افتخارات", "/achievements");
  }

  if (input.reasoning.shouldAskClarifying) {
    for (const q of input.reasoning.clarifyingQuestions.slice(0, 2)) {
      push(`fu-ask-${chips.length}`, q);
    }
  }

  if (chips.length === 0) {
    push("fu-plan", "برنامه مطالعه");
    push("fu-school", "معرفی مؤسسه", "/about");
  }

  return chips;
}
