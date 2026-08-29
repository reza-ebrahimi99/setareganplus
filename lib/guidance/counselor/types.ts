/**
 * Counselor Review Center — contracts.
 * No AI. Case review state is orthogonal to GuidancePlan.status.
 */

export const COUNSELOR_REVIEW_STATUSES = [
  "awaiting_review",
  "in_review",
  "needs_correction",
  "ready_for_session",
] as const;

export type CounselorReviewStatus =
  (typeof COUNSELOR_REVIEW_STATUSES)[number];

export type CounselorNote = {
  id: string;
  body: string;
  authorUserId: string;
  authorName: string;
  createdAtIso: string;
};

export type CounselorActivityItem = {
  id: string;
  kind:
    | "note_added"
    | "status_changed"
    | "transcript_verified"
    | "transcript_rejected"
    | "correction_requested"
    | "case_opened";
  summary: string;
  actorUserId: string;
  actorName: string;
  atIso: string;
};

export type CounselorCaseRecord = {
  planId: string;
  planPublicId: string;
  reviewStatus: CounselorReviewStatus;
  notes: readonly CounselorNote[];
  activity: readonly CounselorActivityItem[];
  assigneeUserId: string | null;
  assigneeName: string | null;
  updatedAtIso: string | null;
  mediaAssetId: string | null;
};

export type CounselorQueueFilter =
  | "all"
  | "awaiting_review"
  | "in_review"
  | "needs_correction"
  | "ready_for_session"
  | "pending_transcript";

export type CounselorQueueItem = {
  publicId: string;
  planId: string;
  studentName: string;
  gradeName: string | null;
  examGroup: string;
  planStatus: string;
  reviewStatus: CounselorReviewStatus;
  reviewStatusLabel: string;
  transcriptStatus: "none" | "pending" | "verified" | "rejected";
  transcriptStatusLabel: string;
  interestStatus: "not_started" | "in_progress" | "completed";
  profileStatus: "not_started" | "in_progress" | "completed";
  updatedAtIso: string;
  href: string;
};

export type CounselorCasePresentation = {
  publicId: string;
  studentName: string;
  gradeName: string | null;
  schoolYear: string | null;
  examGroup: string;
  examGroupLabel: string;
  planStatus: string;
  reviewStatus: CounselorReviewStatus;
  reviewStatusLabel: string;
  transcript: {
    documentId: string | null;
    filename: string | null;
    versionNumber: number | null;
    verificationStatus: string | null;
    verificationLabel: string;
    createdAtIso: string | null;
    downloadHref: string | null;
  };
  interest: {
    status: string;
    statusLabel: string;
    answeredCount: number;
    totalQuestions: number;
  };
  profile: {
    status: string;
    statusLabel: string;
    completionPercent: number;
    healthLabel: string;
  };
  analysis: {
    pipelineStatus: string;
    pipelineLabel: string;
    summary: string;
  };
  notes: readonly CounselorNote[];
  activity: readonly CounselorActivityItem[];
  timeline: readonly {
    id: string;
    label: string;
    state: string;
    atIso: string | null;
  }[];
  canReview: boolean;
};
