/**
 * Guidance ERP — Phase 0 shared types.
 * Keep aligned with the frozen Phase 0 domain (plan status + exam group).
 * Do not expand into preferences, rank, packages, or AI types here.
 */

/**
 * Canonical plan statuses used in Phase 0.
 * Later workflow statuses are reserved and must not be mixed into P0 loaders yet.
 */
export const GUIDANCE_STATUSES = [
  "PRE_REGISTERED",
  "INTAKE_INCOMPLETE",
  "FINAL_GRADES_UPLOADED",
] as const;

export type GuidanceStatus = (typeof GUIDANCE_STATUSES)[number];

/**
 * Mandatory exam group collected at pre-registration (Phase 0).
 * Stable English codes; Persian labels belong in content/UI layers.
 */
export const GUIDANCE_EXAM_GROUPS = [
  "MATHEMATICS",
  "EXPERIMENTAL_SCIENCES",
  "HUMANITIES",
  "ARTS",
  "LANGUAGES",
] as const;

export type GuidanceExamGroup = (typeof GUIDANCE_EXAM_GROUPS)[number];

/**
 * Reserved for later phases (documentation only — not used in Phase 0).
 * Examples: WAITING_FOR_KONKUR, ASSESSMENTS_COMPLETED, PAYMENT_COMPLETED,
 * COUNSELOR_ASSIGNED, FIRST_DRAFT_READY, SANJESH_SUBMITTED, FINISHED, …
 */

/**
 * Document verification lifecycle for final-grades uploads (Phase 0 uses PENDING).
 */
export const GUIDANCE_DOCUMENT_VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

export type GuidanceDocumentVerificationStatus =
  (typeof GUIDANCE_DOCUMENT_VERIFICATION_STATUSES)[number];

/** Phase 0 document type for final school grades / transcript. */
export const GUIDANCE_DOCUMENT_TYPE_FINAL_GRADES = "FINAL_GRADES" as const;

export type GuidanceDocumentType = typeof GUIDANCE_DOCUMENT_TYPE_FINAL_GRADES;
