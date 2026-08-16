import type {
  AtrinEntityBag,
  StudyPlanDraft,
} from "@/lib/atrin/pipeline/types";
import type { EducationAnalysis } from "@/lib/atrin/education/types";

/**
 * Lightweight study planner — produces a structured plan for the prompt (not UI).
 */
export function buildStudyPlanDraft(input: {
  entities: AtrinEntityBag;
  education: EducationAnalysis | null;
  query: string;
}): StudyPlanDraft | null {
  const wantsPlan =
    /برنامه|روزانه|هفتگی|پومودورو|مرور|countdown|شمارش معکوس/.test(
      input.query,
    ) || Boolean(input.entities.hoursPerDay);

  if (!wantsPlan) {
    return null;
  }

  const hours = Number(input.entities.hoursPerDay?.match(/\d+/)?.[0] ?? 2);
  const weak =
    input.entities.topic ??
    input.education?.mathTopics[0] ??
    input.education?.subject.value ??
    "مبحث ضعیف";
  const grade = input.entities.grade ?? "پایه فعلی";
  const exam = input.entities.exam ?? "آزمون پیش‌رو";

  const horizon: StudyPlanDraft["horizon"] = /هفتگی/.test(input.query)
    ? "weekly"
    : /آزمون|کنکور|قلم/.test(input.query)
      ? "exam"
      : "daily";

  if (horizon === "daily") {
    return {
      title: `برنامه روزانه ${grade}`,
      horizon,
      blocks: [
        {
          label: "بلوک ۱ · تمرکز روی ضعف",
          detail: `${Math.max(1, Math.round(hours * 0.45))} ساعت — ${weak}`,
        },
        {
          label: "بلوک ۲ · تثبیت",
          detail: `${Math.max(1, Math.round(hours * 0.3))} ساعت — تمرین مشابه + اشتباهات رایج`,
        },
        {
          label: "بلوک ۳ · مرور سریع",
          detail: `${Math.max(0.5, Math.round(hours * 0.25 * 10) / 10)} ساعت — خلاصه + ۲ سؤال کوتاه`,
        },
        {
          label: "استراحت",
          detail: "هر ۲۵–۳۰ دقیقه، ۵ دقیقه استراحت (پومودورو)",
        },
      ],
    };
  }

  if (horizon === "exam") {
    return {
      title: `برنامه آمادگی ${exam}`,
      horizon,
      blocks: [
        {
          label: "اولویت ۱",
          detail: `ضعف اصلی: ${weak} — روزانه حداقل یک جلسه هدفمند`,
        },
        {
          label: "اولویت ۲",
          detail: "آزمونک کوتاه + تحلیل اشتباهات",
        },
        {
          label: "اولویت ۳",
          detail: "مرور فرمول/مفهوم‌ها شب قبل از آزمون",
        },
        {
          label: "تعادل",
          detail: "خواب کافی و یک فعالیت سبک برای کاهش استرس",
        },
      ],
    };
  }

  return {
    title: `برنامه هفتگی ${grade}`,
    horizon: "weekly",
    blocks: [
      { label: "شنبه–دوشنبه", detail: `تمرکز روی ${weak}` },
      { label: "سه‌شنبه–چهارشنبه", detail: "تمرین ترکیبی + آزمونک" },
      { label: "پنج‌شنبه", detail: "مرور اشتباهات هفته" },
      { label: "جمعه", detail: "بازیابی سبک + برنامه‌ریزی هفته بعد" },
    ],
  };
}

export function formatStudyPlanForPrompt(plan: StudyPlanDraft): string {
  return [
    "STUDY PLAN DRAFT (present clearly in Persian; adjust to user constraints)",
    `Title: ${plan.title}`,
    `Horizon: ${plan.horizon}`,
    ...plan.blocks.map((block, i) => `${i + 1}. ${block.label}: ${block.detail}`),
    "Include time estimates, breaks, and one next checkpoint question.",
  ].join("\n");
}
