/**
 * Guidance ERP — portal workflow timeline view-model (Phase 0).
 * Driven by intake checklist derivation; workflow SoR remains GuidancePlan.status.
 */

import {
  deriveGuidanceIntakeChecklist,
  type GuidanceIntakeChecklistItem,
  type GuidanceIntakeChecklistKey,
} from "@/lib/guidance/checklist";
import type { GuidancePortalPlanSummary } from "@/lib/guidance/portal";

const TIMELINE_LABELS: Record<GuidanceIntakeChecklistKey, string> = {
  PRE_REGISTRATION: "پیش‌ثبت‌نام",
  FINAL_GRADES: "بارگذاری کارنامه",
  INITIAL_ANALYSIS: "تحلیل اولیه",
  INTEREST_ASSESSMENT: "آزمون رغبت",
  PROFILE_COMPLETION: "تکمیل اطلاعات",
  CONSULTATION_BOOKING: "رزرو جلسه",
};

export type GuidanceTimelineStep = GuidanceIntakeChecklistItem & {
  label: string;
  href: string | null;
};

export function buildGuidancePortalTimeline(
  plan: GuidancePortalPlanSummary,
): GuidanceTimelineStep[] {
  const checklist = deriveGuidanceIntakeChecklist({
    planStatus: plan.status,
    hasFinalGradesDocument: Boolean(plan.latestFinalGrades),
    finalGradesVerificationPending:
      plan.latestFinalGrades?.verificationStatus === "PENDING",
  });

  return checklist.map((item) => ({
    ...item,
    label: TIMELINE_LABELS[item.key],
    href:
      item.key === "FINAL_GRADES" &&
      (item.state === "active" || item.state === "pending_review")
        ? "/portal/student/services/guidance/grades"
        : null,
  }));
}
