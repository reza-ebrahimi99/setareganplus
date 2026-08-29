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
  GUIDANCE_DOCUMENT_TYPE_FINAL_GRADES,
  GUIDANCE_DOCUMENT_VERIFICATION_STATUSES,
  GUIDANCE_EXAM_GROUPS,
  GUIDANCE_STATUSES,
  type GuidanceDocumentType,
  type GuidanceDocumentVerificationStatus,
  type GuidanceExamGroup,
  type GuidanceStatus,
} from "@/lib/guidance/types";
