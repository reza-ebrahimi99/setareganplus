/**
 * Student Home — presentation-only hero / progress derivation.
 * Maps existing dashboard + guidance timeline data → UI copy.
 * Does not change workflow, flags, or persistence.
 */

import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

export type PortalHomeHeroModel = {
  greeting: string;
  headline: string;
  support: string;
  cta: { href: string; label: string } | null;
  accent: PortalAccentId;
  icon: PortalIconName;
  tone: "start" | "action" | "waiting" | "progress" | "celebrate" | "welcome";
};

export type PortalHomeProgressModel = {
  completedSteps: number;
  totalSteps: number;
  percent: number;
  phaseLabel: string;
  remainingSteps: number;
};

export type PortalQuickAction = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: PortalIconName;
  accent: PortalAccentId;
};

export type PortalHomeModuleCard = {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: PortalIconName;
  accent: PortalAccentId;
  status: string;
  ctaLabel: string;
};

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

export function buildPortalHomeProgress(
  steps: readonly GuidanceTimelineStep[] | null,
): PortalHomeProgressModel | null {
  if (!steps || steps.length === 0) return null;
  const completedSteps = steps.filter((step) => step.state === "complete").length;
  const totalSteps = steps.length;
  const percent = Math.round((completedSteps / totalSteps) * 100);
  const active =
    steps.find((step) => step.state === "active" || step.state === "pending_review") ??
    null;
  const remainingSteps = steps.filter(
    (step) => step.state !== "complete",
  ).length;

  return {
    completedSteps,
    totalSteps,
    percent,
    phaseLabel: active?.label ?? "مسیر در حال تکمیل",
    remainingSteps,
  };
}

/**
 * Single primary CTA hero — workflow-aware when Guidance data exists.
 */
export function buildPortalHomeHero(input: {
  studentName: string;
  guidanceEnabled: boolean;
  hasPlan: boolean;
  steps: readonly GuidanceTimelineStep[] | null;
  assessmentCount: number;
  achievementCount: number;
}): PortalHomeHeroModel {
  const name = firstName(input.studentName);
  const greeting = `سلام ${name}`;

  if (input.guidanceEnabled && !input.hasPlan) {
    return {
      greeting,
      headline: "آماده‌ای مسیر انتخاب رشته را شروع کنیم؟",
      support: "اولین قدم پیش‌ثبت‌نام است — چند دقیقه وقت می‌برد.",
      cta: { href: "/guidance/pre-register", label: "شروع پیش‌ثبت‌نام" },
      accent: "gold",
      icon: "route",
      tone: "start",
    };
  }

  if (input.guidanceEnabled && input.steps) {
    const pending = input.steps.find((step) => step.state === "pending_review");
    if (pending) {
      return {
        greeting,
        headline: "کارنامه شما دریافت شد.",
        support: "در انتظار بررسی مشاور هستیم. می‌توانید وضعیت را در مسیر انتخاب رشته ببینید.",
        cta: {
          href: pending.href ?? "/portal/student/services/guidance",
          label: "در انتظار بررسی",
        },
        accent: "orange",
        icon: "clipboard",
        tone: "waiting",
      };
    }

    const active = input.steps.find((step) => step.state === "active");
    if (active?.key === "FINAL_GRADES") {
      return {
        greeting,
        headline: "وقت بارگذاری کارنامه نهایی است.",
        support: "با ارسال کارنامه، مسیر انتخاب رشته ادامه پیدا می‌کند.",
        cta: {
          href: active.href ?? "/portal/student/services/guidance/grades",
          label: "بارگذاری کارنامه",
        },
        accent: "teal",
        icon: "clipboard",
        tone: "action",
      };
    }

    if (active) {
      return {
        greeting,
        headline: `قدم بعدی: ${active.label}`,
        support: "امروز یک قدم دیگر به دانشگاه رؤیایی‌ات نزدیک‌تر شو.",
        cta: {
          href: active.href ?? "/portal/student/services/guidance",
          label: "ادامه مسیر",
        },
        accent: "gold",
        icon: "route",
        tone: "progress",
      };
    }

    const allComplete = input.steps.every((step) => step.state === "complete");
    if (allComplete) {
      return {
        greeting,
        headline: "آفرین — این بخش از مسیر را کامل کردی.",
        support: "جزئیات مسیر و قدم‌های بعدی را در انتخاب رشته ببین.",
        cta: {
          href: "/portal/student/services/guidance",
          label: "مشاهده مسیر",
        },
        accent: "emerald",
        icon: "trophy",
        tone: "celebrate",
      };
    }

    return {
      greeting,
      headline: "مسیر انتخاب رشته ادامه دارد.",
      support: "وضعیت فعلی و قدم بعدی را از ویجت مسیر دنبال کن.",
      cta: {
        href: "/portal/student/services/guidance",
        label: "ادامه مسیر",
      },
      accent: "gold",
      icon: "route",
      tone: "progress",
    };
  }

  if (input.assessmentCount === 0) {
    return {
      greeting,
      headline: "به خانه ستارگان پلاس خوش آمدی.",
      support: "به‌محض ثبت نتایج آزمون در مدرسه، پیشرفت تحصیلی‌ات اینجا زنده می‌شود.",
      cta: { href: "/portal/student/profile", label: "مشاهده پروفایل" },
      accent: "blue",
      icon: "home",
      tone: "welcome",
    };
  }

  return {
    greeting,
    headline: "امروز یک نگاه به پیشرفت خودت بینداز.",
    support:
      input.achievementCount > 0
        ? "آزمون‌ها و افتخاراتت آماده‌اند — از همین‌جا ادامه بده."
        : "آخرین نتایج آزمون را ببین و مسیر یادگیری‌ات را دنبال کن.",
    cta: { href: "/portal/student/assessments", label: "مشاهده آزمون‌ها" },
    accent: "blue",
    icon: "chart",
    tone: "welcome",
  };
}

export function buildPortalQuickActions(input: {
  guidanceEnabled: boolean;
  hasPlan: boolean;
  steps: readonly GuidanceTimelineStep[] | null;
}): PortalQuickAction[] {
  const actions: PortalQuickAction[] = [];

  if (input.guidanceEnabled && !input.hasPlan) {
    actions.push({
      id: "start-guidance",
      href: "/guidance/pre-register",
      label: "شروع انتخاب رشته",
      description: "پیش‌ثبت‌نام مسیر",
      icon: "route",
      accent: "gold",
    });
  }

  const grades = input.steps?.find((step) => step.key === "FINAL_GRADES");
  if (
    input.guidanceEnabled &&
    grades &&
    (grades.state === "active" || grades.state === "pending_review")
  ) {
    actions.push({
      id: "upload-grades",
      href: grades.href ?? "/portal/student/services/guidance/grades",
      label:
        grades.state === "pending_review"
          ? "مدیریت کارنامه"
          : "بارگذاری کارنامه",
      description: "ارسال نسخه نهایی",
      icon: "clipboard",
      accent: "teal",
    });
  }

  if (input.guidanceEnabled && input.hasPlan) {
    actions.push({
      id: "continue-guidance",
      href: "/portal/student/services/guidance",
      label: "ادامه مسیر",
      description: "خلاصه انتخاب رشته",
      icon: "route",
      accent: "gold",
    });
  }

  actions.push(
    {
      id: "assessments",
      href: "/portal/student/assessments",
      label: "مشاهده آزمون‌ها",
      description: "نتایج و روند",
      icon: "chart",
      accent: "blue",
    },
    {
      id: "profile",
      href: "/portal/student/profile",
      label: "ویرایش پروفایل",
      description: "اطلاعات من",
      icon: "user",
      accent: "purple",
    },
  );

  // Keep the strip focused — operations, not a full app drawer.
  return actions.slice(0, 4);
}

export function buildPortalHomeModules(input: {
  guidanceEnabled: boolean;
  sxpEnabled: boolean;
  hasPlan: boolean;
  progress: PortalHomeProgressModel | null;
  assessmentCount: number;
  achievementCount: number;
}): PortalHomeModuleCard[] {
  const modules: PortalHomeModuleCard[] = [
    {
      id: "assessments",
      href: "/portal/student/assessments",
      title: "آزمون‌ها",
      description: "نتایج، تراز و روند تحصیلی",
      icon: "chart",
      accent: "blue",
      status:
        input.assessmentCount > 0
          ? `${input.assessmentCount} نتیجه`
          : "هنوز نتیجه‌ای نیست",
      ctaLabel: "باز کردن",
    },
    {
      id: "achievements",
      href: "/portal/student/achievements",
      title: "افتخارات",
      description: "مدال‌ها و دستاوردهای ثبت‌شده",
      icon: "trophy",
      accent: "orange",
      status:
        input.achievementCount > 0
          ? `${input.achievementCount} افتخار`
          : "به‌زودی پر می‌شود",
      ctaLabel: "باز کردن",
    },
    {
      id: "profile",
      href: "/portal/student/profile",
      title: "پروفایل",
      description: "هویت تحصیلی و اطلاعات پایه",
      icon: "user",
      accent: "teal",
      status: "آماده",
      ctaLabel: "باز کردن",
    },
  ];

  if (input.guidanceEnabled) {
    modules.unshift({
      id: "guidance",
      href: input.hasPlan
        ? "/portal/student/services/guidance"
        : "/guidance/pre-register",
      title: "انتخاب رشته",
      description: "مسیر هدایت تحصیلی تا جلسه مشاوره",
      icon: "route",
      accent: "gold",
      status: !input.hasPlan
        ? "شروع نشده"
        : input.progress
          ? `${input.progress.percent}٪ · ${input.progress.phaseLabel}`
          : "فعال",
      ctaLabel: input.hasPlan ? "ادامه" : "شروع",
    });
  }

  if (input.sxpEnabled) {
    modules.push({
      id: "experience",
      href: "/portal/student/experience",
      title: "تجربه",
      description: "خانه تجربه و فعالیت‌های SXP",
      icon: "spark",
      accent: "purple",
      status: "فعال",
      ctaLabel: "باز کردن",
    });
  }

  return modules;
}
