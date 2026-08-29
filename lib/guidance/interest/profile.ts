/**
 * InterestProfile — architecture only. No AI scoring in Phase 6.
 */

import type {
  InterestProfileModel,
  InterestSessionStatus,
} from "@/lib/guidance/interest/types";

export function buildInterestProfileArchitecture(
  status: InterestSessionStatus,
): InterestProfileModel {
  const empty =
    status === "completed"
      ? "پروفایل رغبت ثبت شد — امتیازدهی هوشمند به‌زودی بدون بازطراحی صفحه."
      : "پس از تکمیل آزمون، این بخش با داده‌های واقعی پر می‌شود.";

  return {
    status,
    strongInterests: {
      id: "strong",
      title: "علایق قوی",
      description: "حوزه‌هایی که بیشترین انرژی را می‌گیرند.",
      items: [],
      emptyTitle: "هنوز امتیازدهی نشده",
      emptyDescription: empty,
    },
    moderateInterests: {
      id: "moderate",
      title: "علایق متوسط",
      description: "حوزه‌های مکمل و قابل رشد.",
      items: [],
      emptyTitle: "آماده برای داده",
      emptyDescription: empty,
    },
    weakInterests: {
      id: "weak",
      title: "علایق ضعیف‌تر",
      description: "حوزه‌هایی با اولویت پایین‌تر برای تو.",
      items: [],
      emptyTitle: "آماده برای داده",
      emptyDescription: empty,
    },
    learningStyle: {
      id: "learning",
      title: "سبک یادگیری",
      description: "ترجیح دیداری، شنیداری، خواندن یا عملی.",
      items: [],
      emptyTitle: "سبک یادگیری به‌زودی",
      emptyDescription: empty,
    },
    workEnvironment: {
      id: "work",
      title: "محیط کار",
      description: "فضا و ریتم کاری ایده‌آل.",
      items: [],
      emptyTitle: "محیط کار به‌زودی",
      emptyDescription: empty,
    },
    communicationStyle: {
      id: "communication",
      title: "سبک ارتباط",
      description: "نحوه تعامل و تصمیم‌گیری.",
      items: [],
      emptyTitle: "سبک ارتباط به‌زودی",
      emptyDescription: empty,
    },
    futureAiPlaceholder: {
      id: "future-ai",
      title: "مشاور هوشمند آینده",
      description:
        "جایگاه RIASEC، Holland، Big Five و تطبیق دانشگاه — بدون بازطراحی.",
      items: [],
      emptyTitle: "بدون هوش مصنوعی جعلی",
      emptyDescription:
        "این کارت عمداً خالی است تا داده واقعی جایگزین شود؛ نه متن ساختگی.",
    },
  };
}
