/**
 * Promotion rule payload stored in Promotion.metadata (no schema migration).
 */

export type PromotionRules = {
  /** Minimum payable base (before this promo) in Rials. */
  minAmountRials?: number | null;
  /** Extra allowed RegistrationFlow ids (in addition to registrationFlowId). */
  allowedFlowIds?: string[];
  /** Allowed catalog / flowKey strings (e.g. qalamchi-exam). Empty = all. */
  allowedCatalogKeys?: string[];
  /** National codes that cannot redeem this referral (self-use). */
  blockedNationalCodes?: string[];
};

const RULE_KEYS = [
  "minAmountRials",
  "allowedFlowIds",
  "allowedCatalogKeys",
  "blockedNationalCodes",
] as const;

export function parsePromotionRules(metadata: unknown): PromotionRules {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  const raw = metadata as Record<string, unknown>;
  const rules: PromotionRules = {};

  if (
    typeof raw.minAmountRials === "number" &&
    Number.isInteger(raw.minAmountRials) &&
    raw.minAmountRials >= 0
  ) {
    rules.minAmountRials = raw.minAmountRials;
  }

  if (Array.isArray(raw.allowedFlowIds)) {
    rules.allowedFlowIds = raw.allowedFlowIds
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim());
  }

  if (Array.isArray(raw.allowedCatalogKeys)) {
    rules.allowedCatalogKeys = raw.allowedCatalogKeys
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim());
  }

  if (Array.isArray(raw.blockedNationalCodes)) {
    rules.blockedNationalCodes = raw.blockedNationalCodes
      .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
      .map((k) => k.trim());
  }

  return rules;
}

/** Merge rules into existing metadata without dropping sync markers etc. */
export function mergePromotionMetadata(
  existing: unknown,
  rules: PromotionRules,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  for (const key of RULE_KEYS) {
    delete base[key];
  }

  if (rules.minAmountRials != null) {
    base.minAmountRials = rules.minAmountRials;
  }
  if (rules.allowedFlowIds && rules.allowedFlowIds.length > 0) {
    base.allowedFlowIds = rules.allowedFlowIds;
  }
  if (rules.allowedCatalogKeys && rules.allowedCatalogKeys.length > 0) {
    base.allowedCatalogKeys = rules.allowedCatalogKeys;
  }
  if (rules.blockedNationalCodes && rules.blockedNationalCodes.length > 0) {
    base.blockedNationalCodes = rules.blockedNationalCodes;
  }

  return base;
}
