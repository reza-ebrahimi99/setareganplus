import { GuidanceStepReviewStatus } from "@/generated/prisma/enums";

export type V2ReviewStatus =
  | "UNREVIEWED"
  | "REVIEWED"
  | "REVISION_REQUESTED"
  | "RESUBMITTED"
  | "COUNSELOR_EDITED";

const LEGACY_TO_V2: Record<string, V2ReviewStatus> = {
  PENDING: "UNREVIEWED",
  APPROVED: "REVIEWED",
  REJECTED: "REVISION_REQUESTED",
  NEEDS_REVISION: "REVISION_REQUESTED",
  UNREVIEWED: "UNREVIEWED",
  REVIEWED: "REVIEWED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  RESUBMITTED: "RESUBMITTED",
  COUNSELOR_EDITED: "COUNSELOR_EDITED",
};

export function normalizeV2ReviewStatus(raw: string): V2ReviewStatus {
  return LEGACY_TO_V2[raw] ?? "UNREVIEWED";
}

export function toPrismaReviewStatus(status: V2ReviewStatus): GuidanceStepReviewStatus {
  return GuidanceStepReviewStatus[status];
}

export const V2_REVIEW_STATUS_LABELS: Record<V2ReviewStatus, string> = {
  UNREVIEWED: "بررسی‌نشده",
  REVIEWED: "بررسی شده",
  REVISION_REQUESTED: "نیازمند اصلاح",
  RESUBMITTED: "ارسال مجدد برای بررسی",
  COUNSELOR_EDITED: "ویرایش توسط مشاور",
};

/** Student progression is never blocked by review status alone. */
export function reviewStatusBlocksStudentProgress(_status: V2ReviewStatus): boolean {
  return false;
}

export function canTransitionReview(
  from: V2ReviewStatus,
  to: V2ReviewStatus,
  actor: "counselor" | "student" | "system",
): boolean {
  if (from === to) return true;
  if (actor === "counselor") {
    if (to === "REVIEWED" || to === "REVISION_REQUESTED" || to === "COUNSELOR_EDITED") return true;
    if (to === "UNREVIEWED" && from === "REVIEWED") return true;
    if (to === "UNREVIEWED" && from === "REVISION_REQUESTED") return true;
  }
  if (actor === "student" && to === "RESUBMITTED" && from === "REVISION_REQUESTED") return true;
  if (actor === "system" && to === "UNREVIEWED") return true;
  return false;
}
