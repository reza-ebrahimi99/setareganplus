import type {
  EducationActionId,
  EducationAnalysis,
  EducationBlockKind,
  EducationFormattedPlan,
  EducationResponseSection,
  TeachingStrategyId,
} from "@/lib/atrin/education/types";

const STRATEGY_META: Record<
  TeachingStrategyId,
  { title: string; accent: string; tip: string; block: EducationBlockKind }
> = {
  math_steps: {
    title: "مسیر حل ریاضی",
    accent: "#22d3ee",
    tip: "گام‌به‌گام، بدون عجله به جواب نهایی",
    block: "math",
  },
  chemistry_reaction: {
    title: "شیمی · واکنش و فرمول",
    accent: "#34d399",
    tip: "فرمول → واکنش → توضیح مفهومی",
    block: "chemistry",
  },
  physics_formula: {
    title: "فیزیک · داده و فرمول",
    accent: "#a78bfa",
    tip: "معلوم → مجهول → فرمول → واحد",
    block: "physics",
  },
  language_grammar: {
    title: "زبان · دستور و معنی",
    accent: "#f472b6",
    tip: "گرامر، معنی و مثال",
    block: "language",
  },
  writing_improve: {
    title: "نگارش · بهبود متن",
    accent: "#fb923c",
    tip: "اصلاح، توضیح و نسخه بهتر",
    block: "language",
  },
  biology_concept: {
    title: "زیست/علوم · مفهوم",
    accent: "#4ade80",
    tip: "مفهوم، تصویر ذهنی و مثال",
    block: "generic",
  },
  history_narrative: {
    title: "علوم انسانی",
    accent: "#fbbf24",
    tip: "روایت، علت و نتیجه",
    block: "history",
  },
  programming_debug: {
    title: "برنامه‌نویسی",
    accent: "#38bdf8",
    tip: "منطق، کد و اشکال‌زدایی",
    block: "programming",
  },
  homework_progressive: {
    title: "حالت تکلیف · یادگیری اول",
    accent: "#c4b5fd",
    tip: "اول راهنما، بعد گام‌ها، آخر جواب",
    block: "generic",
  },
  exam_tricks: {
    title: "حالت آزمون",
    accent: "#f87171",
    tip: "سطح، تله‌ها و میانبر حل",
    block: "generic",
  },
  generic_teach: {
    title: "آموزش ساختاریافته",
    accent: "#7c3aed",
    tip: "خلاصه → راهنما → گام‌ها → تمرین",
    block: "generic",
  },
};

function baseSections(strategy: TeachingStrategyId): EducationResponseSection[] {
  if (strategy === "homework_progressive") {
    return [
      "summary",
      "hint",
      "step",
      "final_answer",
      "common_mistakes",
      "similar",
      "practice",
    ];
  }
  if (strategy === "exam_tricks") {
    return ["summary", "exam_tips", "step", "final_answer", "common_mistakes"];
  }
  return [
    "summary",
    "hint",
    "step",
    "final_answer",
    "common_mistakes",
    "exam_tips",
    "similar",
    "practice",
  ];
}

function baseActions(analysis: EducationAnalysis): EducationActionId[] {
  const actions: EducationActionId[] = [
    "learn_topic",
    "more_exercises",
    "similar_question",
    "easier",
    "harder",
    "related_chapter",
    "explain_teacher",
  ];

  if (analysis.grade.value !== null && analysis.grade.value <= 6) {
    actions.push("explain_elementary");
  } else {
    actions.push("explain_highschool");
  }

  if (analysis.homeworkMode) {
    return ["hint_only", "show_steps", "show_answer", "another_exercise", ...actions];
  }

  return actions;
}

/**
 * Response formatter plan — presentation contract for UI (does not call AI).
 */
export function formatEducationPlan(
  analysis: EducationAnalysis,
): EducationFormattedPlan {
  const meta = STRATEGY_META[analysis.strategy];
  return {
    strategy: analysis.strategy,
    sections: baseSections(analysis.strategy),
    actions: baseActions(analysis),
    block: meta.block,
    labels: {
      title: meta.title,
      accent: meta.accent,
      tip: meta.tip,
    },
  };
}

export const EDUCATION_ACTION_LABELS: Record<EducationActionId, string> = {
  learn_topic: "📚 یادگیری این مبحث",
  more_exercises: "📝 تمرین بیشتر",
  similar_question: "🎯 سؤال مشابه",
  easier: "💡 توضیح ساده‌تر",
  harder: "🚀 چالش سخت‌تر",
  related_chapter: "📖 فصل مرتبط",
  explain_teacher: "👨‍🏫 توضیح مثل معلم",
  explain_elementary: "👦 توضیح برای ابتدایی",
  explain_highschool: "🎓 توضیح برای متوسطه",
  hint_only: "فقط راهنما",
  show_steps: "گام‌به‌گام",
  show_answer: "جواب نهایی",
  another_exercise: "یک تمرین مشابه",
};

export function promptForEducationAction(
  action: EducationActionId,
  topicHint?: string,
): string {
  const topic = topicHint ? ` درباره ${topicHint}` : "";
  switch (action) {
    case "learn_topic":
      return `این مبحث را درس بده${topic}`;
    case "more_exercises":
      return `چند تمرین بیشتر بده${topic}`;
    case "similar_question":
      return `یک سؤال مشابه بساز${topic}`;
    case "easier":
      return `ساده‌تر توضیح بده${topic}`;
    case "harder":
      return `یک چالش سخت‌تر بده${topic}`;
    case "related_chapter":
      return `فصل و پیش‌نیاز مرتبط را بگو${topic}`;
    case "explain_teacher":
      return `مثل معلم توضیح بده${topic}`;
    case "explain_elementary":
      return `برای دانش‌آموز ابتدایی توضیح بده${topic}`;
    case "explain_highschool":
      return `برای متوسطه توضیح بده${topic}`;
    case "hint_only":
      return `فقط یک راهنما بده، جواب را نگو${topic}`;
    case "show_steps":
      return `گام‌به‌گام حل کن${topic}`;
    case "show_answer":
      return `جواب نهایی را هم بگو${topic}`;
    case "another_exercise":
      return `یک تمرین مشابه دیگر بده${topic}`;
    default:
      return `ادامه بده${topic}`;
  }
}
