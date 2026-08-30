/**
 * Guidance ERP — public entrypoint for Phase 0 foundation.
 * Import from `@/lib/guidance` only; avoid deep imports of internals.
 */

export {
  GUIDANCE_CHILD_FEATURE_FLAG_KEYS,
  GUIDANCE_FEATURE_FLAG_KEY,
  GUIDANCE_HARD_OFF_ENV,
  type GuidanceChildFeatureFlagKey,
} from "@/lib/guidance/constants";

export {
  isGuidanceEnabled,
  isGuidanceHardOff,
  resolveGuidanceFlag,
} from "@/lib/guidance/feature-flags";

export { assertGuidancePublicEnabledOrNotFound } from "@/lib/guidance/require-public";

export {
  GUIDANCE_PRE_REG_CONSENT_TEXT,
  GUIDANCE_PRE_REG_CONSENT_VERSION,
} from "@/lib/guidance/consent";

export {
  filterPublicNavForGuidance,
  getDefaultPublicNavItems,
} from "@/lib/guidance/nav";

export {
  parseGuidanceExamGroup,
  provisionGuidancePreRegistration,
} from "@/lib/guidance/pre-register";

export {
  GUIDANCE_ONBOARDING_PATH,
  candidateNeedsGuidanceOnboarding,
  provisionExternalGuidanceCandidate,
} from "@/lib/guidance/external-candidate";

export {
  HIGH_SCHOOL_MAJOR_OPTIONS,
  listHighSchoolMajorOptionsForForm,
  type HighSchoolMajorId,
} from "@/lib/guidance/onboarding-options";

export {
  completeGuidanceCandidateOnboarding,
  validateGuidanceOnboardingInput,
} from "@/lib/guidance/onboarding";

export {
  deriveGuidanceIntakeChecklist,
  GUIDANCE_INTAKE_CHECKLIST_KEYS,
  type GuidanceIntakeChecklistItem,
  type GuidanceIntakeChecklistKey,
  type GuidanceIntakeChecklistItemState,
} from "@/lib/guidance/checklist";

export { uploadGuidanceFinalGrades } from "@/lib/guidance/documents";

export { loadGuidancePlanForPortalUser } from "@/lib/guidance/portal";

export { buildGuidancePortalTimeline } from "@/lib/guidance/timeline";

export {
  buildAnalysisPresentationModel,
  ANALYSIS_PIPELINE_STATUSES,
  type AnalysisPresentationModel,
  type AnalysisCardModel,
  type AnalysisPipelineStatus,
} from "@/lib/guidance/analysis";

export {
  buildInterestAssessmentPresentationModel,
  buildInterestDashboardWidget,
  loadGuidanceInterestSession,
  type InterestAssessmentPresentationModel,
  type InterestProfileModel,
} from "@/lib/guidance/interest";

export {
  buildStudentProfilePresentationModel,
  buildStudentProfileDashboardWidget,
  loadGuidanceProfile360Session,
  type StudentProfilePresentationModel,
} from "@/lib/guidance/profile360";

export {
  listCounselorQueue,
  loadCounselorCasePresentation,
  type CounselorCasePresentation,
  type CounselorQueueItem,
} from "@/lib/guidance/counselor";

export { GUIDANCE_STUDENT_PORTAL_NAV } from "@/lib/guidance/portal-nav";

export {
  GUIDANCE_DOCUMENT_TYPE_FINAL_GRADES,
  GUIDANCE_DOCUMENT_VERIFICATION_STATUSES,
  GUIDANCE_EXAM_GROUPS,
  GUIDANCE_STATUSES,
  type GuidanceDocumentType,
  type GuidanceDocumentVerificationStatus,
  type GuidanceExamGroup,
  type GuidanceStatus,
} from "@/lib/guidance/types";
