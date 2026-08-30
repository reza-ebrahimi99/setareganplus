/**
 * Professional Counselor Workspace — Phase 1 contracts.
 *
 * Read-only operational desk on top of the 12-step Journey Engine.
 * Does not replace Counselor Review Center types; those remain the
 * source of review-status / notes / transcript verification.
 */

import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";
import type { GuidanceJourneyStepStatus } from "@/lib/guidance/journey/types";
import type { CounselorReviewStatus } from "@/lib/guidance/counselor/types";

export const WORKSPACE_QUEUE_FILTERS = [
  "all",
  "in_progress",
  "awaiting_payment",
  "awaiting_choices",
  "journey_completed",
  "awaiting_review",
  "in_review",
  "needs_correction",
  "ready_for_session",
  "pending_transcript",
] as const;

export type WorkspaceQueueFilter = (typeof WORKSPACE_QUEUE_FILTERS)[number];

export type WorkspaceTranscriptStatus = "none" | "pending" | "verified" | "rejected";

export type WorkspaceFieldRow = {
  label: string;
  value: string;
};

export type WorkspaceDocumentItem = {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  filename: string;
  versionNumber: number;
  verificationStatus: string;
  verificationLabel: string;
  isLatest: boolean;
  createdAtIso: string;
  downloadHref: string;
};

export type WorkspaceStepReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_REVISION";

export type WorkspaceStepRailItem = {
  id: GuidanceJourneyStepId;
  title: string;
  shortTitle: string;
  description: string;
  status: GuidanceJourneyStepStatus;
  statusLabel: string;
  reviewStatus: WorkspaceStepReviewStatus;
  reviewStatusLabel: string;
  href: string;
};

export type WorkspaceQueueItem = {
  publicId: string;
  planId: string;
  studentName: string;
  gradeName: string | null;
  examGroupLabel: string;
  currentStep: GuidanceJourneyStepId;
  currentStepTitle: string;
  completionPercentage: number;
  planStatus: string;
  reviewStatus: CounselorReviewStatus;
  reviewStatusLabel: string;
  transcriptStatus: WorkspaceTranscriptStatus;
  transcriptStatusLabel: string;
  packageTitle: string | null;
  paid: boolean;
  choicesApproved: boolean;
  finalApproved: boolean;
  updatedAtIso: string;
  href: string;
};

export type WorkspaceAuditItem = {
  id: string;
  action: string;
  actionLabel: string;
  actorName: string;
  atIso: string;
  summary: string;
};

export type WorkspaceDossier = {
  publicId: string;
  planId: string;
  studentName: string;
  mobile: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  examGroup: string;
  examGroupLabel: string;
  quota: string | null;
  quotaLabel: string | null;
  highSchoolAverage: number | null;
  personalInfoConfirmedAtIso: string | null;
  currentStep: GuidanceJourneyStepId;
  currentStepTitle: string;
  completionPercentage: number;
  packageTitle: string | null;
  packageCode: string | null;
  paidAtIso: string | null;
  choicesApprovedAtIso: string | null;
  finalApprovedAtIso: string | null;
  reviewStatus: CounselorReviewStatus;
  reviewStatusLabel: string;
  steps: readonly WorkspaceStepRailItem[];
  documents: readonly WorkspaceDocumentItem[];
  audit: readonly WorkspaceAuditItem[];
  canReview: boolean;
};

export type WorkspaceStepReviewView = {
  status: WorkspaceStepReviewStatus;
  statusLabel: string;
  privateNote: string | null;
  studentMessage: string | null;
  rejectReason: string | null;
  approvedAtIso: string | null;
  approvedByName: string | null;
  rejectedAtIso: string | null;
  revisionRequestedAtIso: string | null;
};

export type WorkspaceStepHistoryItem = {
  id: string;
  summary: string;
  actorName: string;
  atIso: string;
  kind: string;
};

export type WorkspaceStepInspector = {
  dossier: WorkspaceDossier;
  stepId: GuidanceJourneyStepId;
  title: string;
  description: string;
  status: GuidanceJourneyStepStatus;
  statusLabel: string;
  fields: readonly WorkspaceFieldRow[];
  documents: readonly WorkspaceDocumentItem[];
  relatedHref: string | null;
  relatedLabel: string | null;
  emptyMessage: string | null;
  review: WorkspaceStepReviewView;
  history: readonly WorkspaceStepHistoryItem[];
  studentName: string;
  examGroup: string;
  canReview: boolean;
};
