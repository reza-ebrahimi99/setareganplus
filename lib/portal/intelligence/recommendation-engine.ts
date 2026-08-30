/**
 * StudentRecommendationEngine — rule-based (NOT AI).
 * Ranking may later be replaced by an AI provider without changing the contract.
 */

import type { GuidanceTimelineStep } from "@/lib/guidance/timeline";
import type {
  PortalRecommendation,
  PortalRecommendationBundle,
} from "@/lib/portal/intelligence/types";
import type { PortalStudentProfileDto } from "@/lib/portal/student/profile";
import type { AssessmentCenterInsights } from "@/lib/portal/student/assessment-insights";

function rankSort(items: PortalRecommendation[]): PortalRecommendation[] {
  return [...items].sort((a, b) => a.rank - b.rank);
}

export const StudentRecommendationEngine = {
  build(input: {
    guidanceEnabled: boolean;
    hasGuidancePlan: boolean;
    guidanceSteps: readonly GuidanceTimelineStep[] | null;
    profile: PortalStudentProfileDto | null;
    assessmentInsights: AssessmentCenterInsights | null;
    achievementCount: number;
    sxpEnabled: boolean;
  }): PortalRecommendationBundle {
    const pool: PortalRecommendation[] = [];

    if (input.guidanceEnabled && !input.hasGuidancePlan) {
      pool.push({
        id: "rec-guidance-start",
        kind: "guidance_start",
        title: "مسیر انتخاب رشته را شروع کن",
        description: "با پیش‌ثبت‌نام، نقشه راه شخصی‌ات فعال می‌شود.",
        action: {
          href: "/guidance/pre-register",
          label: "شروع پیش‌ثبت‌نام",
        },
        status: "needs_attention",
        rank: 10,
        source: "rules",
      });
    }

    const grades = input.guidanceSteps?.find((step) => step.key === "FINAL_GRADES");
    if (input.guidanceEnabled && grades?.state === "active") {
      pool.push({
        id: "rec-upload-grades",
        kind: "upload_grades",
        title: "کارنامه نهایی را بارگذاری کن",
        description: "یک قدم تا تحلیل اولیه باقی مانده است.",
        action: {
          href: grades.href ?? "/portal/student/services/guidance/grades",
          label: "بارگذاری کارنامه",
        },
        status: "needs_attention",
        rank: 20,
        source: "rules",
      });
    }

    if (input.guidanceEnabled && grades?.state === "pending_review") {
      pool.push({
        id: "rec-grades-waiting",
        kind: "guidance_continue",
        title: "کارنامه در انتظار بررسی است",
        description: "وضعیت مسیر را دنبال کن یا در صورت نیاز نسخه را جایگزین کن.",
        action: {
          href: grades.href ?? "/portal/student/services/guidance",
          label: "مشاهده وضعیت",
        },
        status: "waiting",
        rank: 25,
        source: "rules",
      });
    }

    if (
      input.guidanceEnabled &&
      input.hasGuidancePlan &&
      grades?.state !== "active" &&
      grades?.state !== "pending_review"
    ) {
      pool.push({
        id: "rec-guidance-continue",
        kind: "guidance_continue",
        title: "ادامه مسیر انتخاب رشته",
        description: "قدم فعلی و پیشرفت مسیر را در سفر هدایت ببین.",
        action: {
          href: "/portal/student/services/guidance",
          label: "ادامه مسیر",
        },
        status: "healthy",
        rank: 40,
        source: "rules",
      });
    }

    if (input.profile) {
      const missingPortrait = !input.profile.portraitUrl;
      const missingYear = !input.profile.schoolYear;
      if (missingPortrait || missingYear) {
        pool.push({
          id: "rec-complete-profile",
          kind: "complete_profile",
          title: "پروفایل تحصیلی‌ات را کامل‌تر کن",
          description: missingPortrait
            ? "افزودن تصویر، هویت پرتال را کامل‌تر می‌کند."
            : "سال تحصیلی به خلاصه هویت کمک می‌کند.",
          action: {
            href: "/portal/student/profile",
            label: "مشاهده پروفایل",
          },
          status: "needs_attention",
          rank: 50,
          source: "rules",
        });
      }
    }

    if (!input.assessmentInsights || input.assessmentInsights.count === 0) {
      pool.push({
        id: "rec-view-assessments",
        kind: "view_assessments",
        title: "منتظر نتایج آزمون باش",
        description: "به‌محض ثبت نتایج مدرسه، مرکز آزمون زنده می‌شود.",
        action: {
          href: "/portal/student/assessments",
          label: "مرکز آزمون",
        },
        status: "healthy",
        rank: 70,
        source: "rules",
      });
    } else {
      pool.push({
        id: "rec-review-assessments",
        kind: "view_assessments",
        title: "روند آزمون‌ها را مرور کن",
        description: "آخرین نمره و نقاط قوت/ضعف درسی آماده‌اند.",
        action: {
          href: "/portal/student/assessments",
          label: "مشاهده آزمون‌ها",
        },
        status: "healthy",
        rank: 60,
        source: "rules",
      });
    }

    if (input.achievementCount === 0) {
      pool.push({
        id: "rec-achievements-empty",
        kind: "view_achievements",
        title: "اتاق افتخارات منتظر مدال اول است",
        description: "وقتی مدرسه افتخاری منتشر کند، اینجا می‌درخشد.",
        action: {
          href: "/portal/student/achievements",
          label: "اتاق افتخارات",
        },
        status: "healthy",
        rank: 80,
        source: "rules",
      });
    }

    if (input.sxpEnabled) {
      pool.push({
        id: "rec-experience",
        kind: "experience_continue",
        title: "خانه تجربه را باز کن",
        description: "فعالیت‌ها و ویجت‌های تجربه در یک نگاه.",
        action: {
          href: "/portal/student/experience",
          label: "خانه تجربه",
        },
        status: "healthy",
        rank: 90,
        source: "rules",
      });
    }

    // Interest assessment — only when guidance step exists and is active/locked messaging.
    const interest = input.guidanceSteps?.find(
      (step) => step.key === "INTEREST_ASSESSMENT",
    );
    if (interest?.state === "active") {
      pool.push({
        id: "rec-interest",
        kind: "generic",
        title: "آزمون رغبت را انجام بده",
        description: "این قدم مسیر علایق تحصیلی‌ات را روشن‌تر می‌کند.",
        action: {
          href: "/portal/student/services/guidance?view=interest",
          label: "شروع آزمون رغبت",
        },
        status: "needs_attention",
        rank: 35,
        source: "rules",
      });
    }

    const sorted = rankSort(pool);
    return {
      primary: sorted[0] ?? null,
      secondary: sorted.slice(1, 4),
    };
  },
} as const;
