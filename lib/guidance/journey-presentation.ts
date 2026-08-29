/**
 * Guidance → Portal Journey presentation mapping.
 * Static copy + existing timeline states only. No invented metrics.
 */

import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";
import {
  buildJourneyProgress,
  type PortalJourneyHero,
  type PortalJourneyModel,
  type PortalJourneyState,
  type PortalJourneyStep,
} from "@/components/portal/journey/types";
import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type { GuidanceIntakeChecklistKey } from "@/lib/guidance/checklist";

const STEP_COPY: Record<
  GuidanceIntakeChecklistKey,
  {
    description: string;
    outcome: string;
    helpText?: string;
    icon: PortalIconName;
    accent: PortalAccentId;
  }
> = {
  PRE_REGISTRATION: {
    description: "هویت و گروه آزمایشی‌ات ثبت شد تا مسیر شخصی‌سازی شود.",
    outcome: "پرونده انتخاب رشته فعال می‌شود",
    icon: "user",
    accent: "teal",
  },
  FINAL_GRADES: {
    description: "کارنامه نهایی را خصوصی بارگذاری کن تا بررسی آغاز شود.",
    outcome: "ورود به مرحله تحلیل",
    helpText: "PDF یا تصویر تا ۵ مگابایت",
    icon: "clipboard",
    accent: "teal",
  },
  INITIAL_ANALYSIS: {
    description: "پس از تأیید کارنامه، تصویر اولیه از مسیر تحصیلی‌ات شکل می‌گیرد.",
    outcome: "پایه تحلیل آماده می‌شود",
    icon: "chart",
    accent: "blue",
  },
  INTEREST_ASSESSMENT: {
    description: "آزمون رغبت کمک می‌کند علایق و مسیرهای مناسب‌تر روشن شوند.",
    outcome: "نقشه رغبت شخصی",
    icon: "spark",
    accent: "purple",
  },
  PROFILE_COMPLETION: {
    description: "اطلاعات تکمیلی پرونده را برای جلسه مشاوره کامل کن.",
    outcome: "پرونده آماده مشاوره",
    icon: "book",
    accent: "blue",
  },
  CONSULTATION_BOOKING: {
    description: "زمان جلسه با مشاور را رزرو کن و مسیر را جمع‌بندی کن.",
    outcome: "جلسه هدایت تحصیلی",
    icon: "calendar",
    accent: "orange",
  },
};

function mapState(
  state: GuidanceTimelineStep["state"],
): PortalJourneyState {
  switch (state) {
    case "complete":
      return "completed";
    case "pending_review":
      return "waiting";
    case "active":
      return "active";
    case "locked":
    default:
      return "locked";
  }
}

function actionForStep(
  step: GuidanceTimelineStep,
): PortalJourneyStep["action"] | undefined {
  if (!step.href) return undefined;
  if (step.state === "active") {
    return {
      href: step.href,
      label:
        step.key === "FINAL_GRADES" ? "بارگذاری کارنامه" : "ادامه این قدم",
    };
  }
  if (step.state === "pending_review") {
    return {
      href: step.href,
      label: "مشاهده / جایگزینی کارنامه",
    };
  }
  return undefined;
}

export function mapGuidanceStepsToJourney(
  steps: readonly GuidanceTimelineStep[],
): PortalJourneyStep[] {
  return steps.map((step) => {
    const copy = STEP_COPY[step.key];
    const state = mapState(step.state);
    return {
      id: step.key,
      title: step.label,
      description: copy.description,
      outcome: copy.outcome,
      helpText: state === "active" || state === "waiting" ? copy.helpText : undefined,
      state,
      icon: copy.icon,
      accent: copy.accent,
      action: actionForStep(step),
    };
  });
}

export function buildGuidanceJourneyHero(
  steps: readonly PortalJourneyStep[],
): PortalJourneyHero {
  const waiting = steps.find((step) => step.state === "waiting");
  if (waiting) {
    return {
      eyebrow: "مسیر انتخاب رشته",
      headline: "کارنامه شما دریافت شد",
      support: "در انتظار بررسی مشاور هستیم. می‌توانید وضعیت یا نسخه کارنامه را مدیریت کنید.",
      accent: "orange",
      icon: "bell",
      cta: waiting.action,
    };
  }

  const active = steps.find((step) => step.state === "active");
  if (active?.id === "FINAL_GRADES") {
    return {
      eyebrow: "مسیر انتخاب رشته",
      headline: "یک قدم تا تحلیل اولیه باقی مانده",
      support: "با بارگذاری کارنامه نهایی، مسیر به مرحله تحلیل نزدیک می‌شود.",
      accent: "teal",
      icon: "clipboard",
      cta: active.action,
    };
  }

  if (active) {
    return {
      eyebrow: "مسیر انتخاب رشته",
      headline: `قدم فعلی: ${active.title}`,
      support: active.description,
      accent: active.accent,
      icon: active.icon,
      cta: active.action ?? {
        href: "/portal/student/services/guidance",
        label: "ادامه مسیر",
      },
    };
  }

  const allDone = steps.length > 0 && steps.every((s) => s.state === "completed");
  if (allDone) {
    return {
      eyebrow: "مسیر انتخاب رشته",
      headline: "این بخش از مسیر کامل شد",
      support: "می‌توانی خلاصه قدم‌ها را مرور کنی و منتظر مراحل بعدی بمانی.",
      accent: "emerald",
      icon: "trophy",
    };
  }

  return {
    eyebrow: "مسیر انتخاب رشته",
    headline: "سفر هدایت تحصیلی تو اینجاست",
    support: "هر قدم یک نقطه عطف است — از وضعیت فعلی شروع کن.",
    accent: "gold",
    icon: "route",
  };
}

export function buildGuidanceJourneyModel(input: {
  steps: readonly GuidanceTimelineStep[];
  publicId: string;
}): PortalJourneyModel {
  const journeySteps = mapGuidanceStepsToJourney(input.steps);
  const progress = buildJourneyProgress(journeySteps);
  return {
    journeyId: "guidance",
    title: "مسیر انتخاب رشته",
    subtitle: "یک تجربه هدایت‌شده تا جلسه مشاوره — نه یک چک‌لیست اداری.",
    hero: buildGuidanceJourneyHero(journeySteps),
    progress,
    steps: journeySteps,
    metaLine: `شناسه پرونده: ${input.publicId}`,
  };
}

export function buildGuidanceEmptyJourneyHero(): PortalJourneyHero {
  return {
    eyebrow: "سامانه جامع انتخاب رشته",
    headline: "آماده‌ای مسیر را شروع کنی؟",
    support:
      "هنوز پرونده‌ای تشکیل نشده. با پیش‌ثبت‌نام، نقشه راه شخصی‌ات فعال می‌شود.",
    accent: "gold",
    icon: "route",
    cta: {
      href: "/guidance/pre-register",
      label: "شروع پیش‌ثبت‌نام",
    },
  };
}
