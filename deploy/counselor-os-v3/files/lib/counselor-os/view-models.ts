/**
 * Client-safe Counselor OS view models.
 * Serializable props only — no Prisma, auth, or I/O.
 */

import type { CounselorV2StepId } from "@/lib/counselor-os/v2-catalog";

export type CounselorFinanceItem = {
  kind: "holland" | "package";
  title: string;
  amountLabel: string;
  statusLabel: string;
  activationLabel: string;
  paidAtLabel: string | null;
  receipt: string | null;
  tracking: string | null;
  discountLabel: string | null;
  packageCode: string | null;
};

export type CounselorFinanceSummary = {
  items: CounselorFinanceItem[];
  hollandPaid: boolean;
  packagePaid: boolean;
  packageCode: string | null;
  packageTitle: string;
  packageStateLabel: string;
};

export type CounselorHollandScoreRow = {
  type: string;
  typeLabel: string;
  raw: number;
  normalized: number;
  rank: number;
  intensity: string;
};

export type CounselorHollandProfileView = {
  type: string;
  typeLabel: string;
  title: string;
  shortTitle: string;
  summary: string;
  environment: string;
  fields: string[];
  strengths: string[];
  watchouts: string[];
  studyStyle: string;
  workStyle: string;
  raw: number;
  normalized: number;
  rank: number;
  intensity: string;
};

export type CounselorHollandAnswerRow = {
  number: number;
  text: string;
  typeCode: string | null;
  typeLabel: string | null;
  answer: number | null;
  answerLabel: string;
};

export type CounselorHollandView = {
  completed: boolean;
  hasAnswers: boolean;
  completedAtIso: string | null;
  completedAtLabel: string | null;
  code: string;
  codeLetters: Array<{ type: string; label: string }>;
  scores: CounselorHollandScoreRow[];
  topThree: CounselorHollandProfileView[];
  combinedInterpretation: string | null;
  answers: CounselorHollandAnswerRow[];
};

export type CounselorJourneyStepView = {
  id: CounselorV2StepId;
  title: string;
  status: "completed" | "current" | "untouched";
  completedAtLabel: string | null;
  fields: Array<{ label: string; value: string }>;
};

export type CounselorDocumentView = {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  uploadedLabel: string;
  verification: string;
};

export type CounselorV2Dossier = {
  planId: string | null;
  planPublicId: string | null;
  journeyVersionHint: "v2" | "v1-compatible" | "none";
  currentStep: number | null;
  currentStepTitle: string | null;
  completionPercentage: number;
  completedStepIds: number[];
  examGroupLabel: string | null;
  personal: Record<string, string>;
  examGroups: { primary: string; secondary: string[] } | null;
  grades: Array<{ label: string; value: string }>;
  holland: CounselorHollandView & {
    codes: string[];
    summary: string | null;
  };
  educationTypes: string[];
  provinces: string[];
  majors: string[];
  priorities: string[];
  steps: CounselorJourneyStepView[];
  documents: CounselorDocumentView[];
  finance: CounselorFinanceSummary;
};

export type CounselorStudentCase = {
  studentId: string;
  studentName: string;
  mobile: string | null;
  gradeName: string | null;
  schoolName: string | null;
  examGroup: string | null;
  examGroupLabel: string | null;
  province: string | null;
  registeredLabel: string;
  firstLoginLabel: string | null;
  lastActivityLabel: string | null;
  planPublicId: string | null;
  currentStep: number | null;
  currentStepTitle: string | null;
  lastCompletedStepTitle: string | null;
  completionPercentage: number;
  studentStatusLabel: string;
  packageLabel: string | null;
  packagePaid: boolean;
  journeySteps: Array<{
    id: number;
    title: string;
    status: "completed" | "current" | "untouched";
    completedAtLabel: string | null;
    fields: Array<{ label: string; value: string }>;
  }>;
  preferencesSummary: {
    majors: string[];
    cities: string[];
    educationTypes: string[];
    priorityFactors: string | null;
  };
  nextAppointment: {
    id: string;
    label: string;
    status: string;
  } | null;
  lastSessionSummary: string | null;
  pendingFollowUps: number;
  alerts: string[];
  assignedCounselor: {
    userId: string;
    name: string;
    assignedAtLabel: string;
    statusLabel: string;
    previousCounselorName: string | null;
  } | null;
};

export type SessionRecordView = {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  sessionType: string;
  subject: string | null;
  summary: string | null;
  scheduledLabel: string | null;
  isDraft: boolean;
  counselorName: string;
};

export type SessionWorkspaceModel = {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  sessionType: string;
  subject: string;
  body: string;
  keyPoints: string;
  decisions: string;
  studentActionItems: string;
  counselorActionItems: string;
  summary: string;
  nextFollowUpAt: string | null;
  isDraft: boolean;
};

export type CounselorCorrectionView = {
  id: string;
  section: string;
  fieldLabel: string;
  previousValue: string;
  newValue: string;
  reason: string | null;
  actorName: string;
  createdLabel: string;
};
