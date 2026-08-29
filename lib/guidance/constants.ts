/**
 * Guidance ERP — Phase 0 foundation constants.
 * Feature flag keys and hard-off env only. Do not add domain/runtime config here
 * until the owning Phase 0 step is approved.
 */

/** Root OrganizationFeatureFlag key. No row / enabled=false = OFF. */
export const GUIDANCE_FEATURE_FLAG_KEY = "guidance" as const;

/**
 * Reserved child flag keys. Stored as constants for future phases.
 * Phase 0 must not evaluate these against OrganizationFeatureFlag.
 */
export const GUIDANCE_CHILD_FEATURE_FLAG_KEYS = {
  portal: "guidance.portal",
  rank: "guidance.rank",
  ai: "guidance.ai",
  booking: "guidance.booking",
  copilot: "guidance.copilot",
} as const;

export type GuidanceChildFeatureFlagKey =
  (typeof GUIDANCE_CHILD_FEATURE_FLAG_KEYS)[keyof typeof GUIDANCE_CHILD_FEATURE_FLAG_KEYS];

/** Emergency kill switch. Wins over an enabled per-org root flag. */
export const GUIDANCE_HARD_OFF_ENV = "STAROS_GUIDANCE_HARD_OFF" as const;
