/**
 * Guidance Journey Engine — shared presentation/state contracts (Phase 1).
 */

import type { GuidanceExamGroup } from "@/lib/guidance/types";
import type { GuidanceJourneyStepId } from "@/lib/guidance/journey/steps";

export type GuidanceJourneyStepStatus = "locked" | "active" | "completed";

/** Server-authoritative snapshot of a GuidancePlan's journey fields. */
export type GuidanceJourneyPlanSnapshot = {
  id: string;
  publicId: string;
  organizationId: string;
  userId: string;
  studentId: string;
  examGroup: GuidanceExamGroup;
  status: string;
  currentStep: GuidanceJourneyStepId;
  completedSteps: readonly GuidanceJourneyStepId[];
  completionPercentage: number;
  quota: string | null;
  highSchoolAverage: number | null;
  personalInfoConfirmedAtIso: string | null;
  guidancePackageCode: string | null;
  packagePaidAtIso: string | null;
  choicesApprovedAtIso: string | null;
  finalApprovedAtIso: string | null;
};

export type GuidanceJourneySidebarStep = {
  id: GuidanceJourneyStepId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  status: GuidanceJourneyStepStatus;
  href: string | null;
};

export type GuidanceStepFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
