/**
 * Guidance ERP — intake checklist architecture (Phase 0 prep).
 *
 * SEPARATION RULE:
 * - GuidancePlan.status = overall workflow SoR (canonical state machine).
 * - Intake checklist = orthogonal onboarding progress (what is still missing).
 *
 * Phase 0 derives checklist items from plan status + documents.
 * Future phases may persist checklist rows without changing workflow statuses.
 * Do not fold checklist completion into new workflow statuses prematurely.
 */

import type { GuidanceStatus } from "@/lib/guidance/types";

export const GUIDANCE_INTAKE_CHECKLIST_KEYS = [
  "PRE_REGISTRATION",
  "FINAL_GRADES",
  "INITIAL_ANALYSIS",
  "INTEREST_ASSESSMENT",
  "PROFILE_COMPLETION",
  "CONSULTATION_BOOKING",
] as const;

export type GuidanceIntakeChecklistKey =
  (typeof GUIDANCE_INTAKE_CHECKLIST_KEYS)[number];

export type GuidanceIntakeChecklistItemState =
  | "complete"
  | "active"
  | "pending_review"
  | "locked";

export type GuidanceIntakeChecklistItem = {
  key: GuidanceIntakeChecklistKey;
  state: GuidanceIntakeChecklistItemState;
};

export type GuidanceIntakeChecklistInput = {
  planStatus: GuidanceStatus;
  hasFinalGradesDocument: boolean;
  finalGradesVerificationPending: boolean;
  /**
   * Interest Discovery session (Phase 6) — orthogonal to GuidancePlan.status.
   * Omit / null = not started.
   */
  interestAssessmentStatus?: "not_started" | "in_progress" | "completed" | null;
  /**
   * Student 360° Profile (Phase 7) — orthogonal to GuidancePlan.status.
   */
  profileCompletionStatus?: "not_started" | "in_progress" | "completed" | null;
};

/**
 * Lightweight derived checklist for portal timeline.
 * Not a second workflow engine — status remains on GuidancePlan.
 */
export function deriveGuidanceIntakeChecklist(
  input: GuidanceIntakeChecklistInput,
): GuidanceIntakeChecklistItem[] {
  const preRegComplete =
    input.planStatus === "PRE_REGISTERED" ||
    input.planStatus === "INTAKE_INCOMPLETE" ||
    input.planStatus === "FINAL_GRADES_UPLOADED";

  const gradesComplete =
    input.hasFinalGradesDocument &&
    input.planStatus === "FINAL_GRADES_UPLOADED";

  const gradesPendingReview =
    gradesComplete && input.finalGradesVerificationPending;

  let gradesState: GuidanceIntakeChecklistItemState = "locked";
  if (!preRegComplete) {
    gradesState = "locked";
  } else if (gradesPendingReview) {
    gradesState = "pending_review";
  } else if (gradesComplete) {
    gradesState = "complete";
  } else {
    gradesState = "active";
  }

  /** After grades land, Initial Analysis Center is available (Phase 5). */
  const analysisState: GuidanceIntakeChecklistItemState = gradesComplete
    ? "complete"
    : "locked";

  const interestRaw = input.interestAssessmentStatus ?? "not_started";
  let interestState: GuidanceIntakeChecklistItemState = "locked";
  if (gradesComplete) {
    if (interestRaw === "completed") {
      interestState = "complete";
    } else {
      interestState = "active";
    }
  }

  const profileRaw = input.profileCompletionStatus ?? "not_started";
  let profileState: GuidanceIntakeChecklistItemState = "locked";
  if (interestState === "complete") {
    if (profileRaw === "completed") {
      profileState = "complete";
    } else {
      profileState = "active";
    }
  }

  return [
    {
      key: "PRE_REGISTRATION",
      state: preRegComplete ? "complete" : "active",
    },
    {
      key: "FINAL_GRADES",
      state: gradesState,
    },
    { key: "INITIAL_ANALYSIS", state: analysisState },
    { key: "INTEREST_ASSESSMENT", state: interestState },
    { key: "PROFILE_COMPLETION", state: profileState },
    { key: "CONSULTATION_BOOKING", state: "locked" },
  ];
}
