import type { AiCrmEntities, AiCrmIntent, AiCrmRecommendation } from "@/types/ai-crm";

function gradeRank(grade: string | null): number | null {
  if (!grade) return null;
  const map: Record<string, number> = {
    اول: 1,
    دوم: 2,
    سوم: 3,
    چهارم: 4,
    پنجم: 5,
    ششم: 6,
    هفتم: 7,
    هشتم: 8,
    نهم: 9,
    دهم: 10,
    یازدهم: 11,
    دوازدهم: 12,
  };
  return map[grade] ?? null;
}

/**
 * Intent + grade aware CRM recommendations (payload-ready, no DB).
 */
export function buildCrmRecommendations(input: {
  intent: AiCrmIntent;
  entities: AiCrmEntities;
}): AiCrmRecommendation[] {
  const items: AiCrmRecommendation[] = [];
  const rank = gradeRank(input.entities.grade);

  const push = (item: AiCrmRecommendation) => {
    if (items.some((existing) => existing.href === item.href)) return;
    items.push(item);
  };

  if (rank !== null && rank <= 6) {
    push({
      id: "crm-rec-school",
      label: "دبستان ستارگان آینده",
      href: "/about",
      reason: "پایه ابتدایی تشخیص داده شد",
    });
    push({
      id: "crm-rec-summer",
      label: "باشگاه تابستانی",
      href: "/pre-registration",
      reason: "پیشنهاد غنی‌سازی برای مقطع ابتدایی",
    });
  }

  if (rank !== null && rank >= 6 && rank <= 9) {
    push({
      id: "crm-rec-gifted",
      label: "آمادگی تیزهوشان",
      href: "/courses",
      reason: "پایه متوسطه اول / تیزهوشان",
    });
    push({
      id: "crm-rec-ghalamchi",
      label: "قلم‌چی نسیم‌شهر",
      href: "/ghalamchi/register",
      reason: "برنامه آزمون استاندارد",
    });
  }

  if (rank !== null && rank >= 10) {
    push({
      id: "crm-rec-tutoring",
      label: "آموزشگاه تقویتی",
      href: "/courses",
      reason: "پایه متوسطه دوم / کنکور",
    });
    push({
      id: "crm-rec-consult",
      label: "مشاوره تحصیلی",
      href: "/consultation",
      reason: "راهنمایی انتخاب مسیر",
    });
  }

  switch (input.intent) {
    case "ask_registration":
      push({
        id: "crm-rec-reg",
        label: "پیش‌ثبت‌نام",
        href: "/pre-registration",
        reason: "قصد ثبت‌نام",
      });
      break;
    case "ask_consultation":
      push({
        id: "crm-rec-consultation",
        label: "رزرو مشاوره",
        href: "/consultation",
        reason: "قصد مشاوره",
      });
      break;
    case "ask_qalamchi":
      push({
        id: "crm-rec-qalamchi",
        label: "ثبت‌نام قلم‌چی",
        href: "/ghalamchi/register",
        reason: "قصد قلم‌چی",
      });
      break;
    case "ask_summer":
      push({
        id: "crm-rec-summer-intent",
        label: "باشگاه تابستانی",
        href: "/pre-registration",
        reason: "قصد باشگاه تابستانی",
      });
      break;
    case "ask_school":
      push({
        id: "crm-rec-school-intent",
        label: "دبستان",
        href: "/about",
        reason: "سؤال درباره دبستان",
      });
      break;
    default:
      break;
  }

  if (items.length === 0) {
    push({
      id: "crm-rec-default-contact",
      label: "تماس با مشاور",
      href: "/contact",
      reason: "مسیر پیش‌فرض پذیرش",
    });
  }

  return items.slice(0, 4);
}
