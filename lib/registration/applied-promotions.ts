/**
 * Central parser for Registration.metadata.appliedPromotions (versioned).
 */

export const APPLIED_PROMOTIONS_SCHEMA_VERSION = 1 as const;

export type AppliedPromotionSnapshot = {
  promotionId: string;
  title: string;
  code: string | null;
  type: string;
  discountAmountRials: number;
  virtual?: boolean;
  ownerStaffId?: string | null;
};

export type AppliedPromotionsBag = {
  schemaVersion: typeof APPLIED_PROMOTIONS_SCHEMA_VERSION;
  items: AppliedPromotionSnapshot[];
  referralPromotionId: string | null;
  referralOwnerStaffId: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseItem(raw: unknown): AppliedPromotionSnapshot | null {
  const row = asRecord(raw);
  if (!row) return null;
  const promotionId =
    typeof row.promotionId === "string" ? row.promotionId : "";
  const title = typeof row.title === "string" ? row.title : "";
  const type = typeof row.type === "string" ? row.type : "";
  const discountAmountRials =
    typeof row.discountAmountRials === "number" &&
    Number.isFinite(row.discountAmountRials)
      ? Math.max(0, Math.trunc(row.discountAmountRials))
      : 0;
  if (!promotionId && !title && !type) return null;
  return {
    promotionId,
    title: title || "پروموشن",
    code: typeof row.code === "string" ? row.code : null,
    type: type || "UNKNOWN",
    discountAmountRials,
    virtual: Boolean(row.virtual),
    ownerStaffId:
      typeof row.ownerStaffId === "string" ? row.ownerStaffId : null,
  };
}

export function parseAppliedPromotionsFromMetadata(
  metadata: unknown,
): AppliedPromotionsBag {
  const root = asRecord(metadata);
  if (!root) {
    return {
      schemaVersion: APPLIED_PROMOTIONS_SCHEMA_VERSION,
      items: [],
      referralPromotionId: null,
      referralOwnerStaffId: null,
    };
  }

  const nested = asRecord(root.appliedPromotionsBag);
  const listSource = Array.isArray(nested?.items)
    ? nested!.items
    : Array.isArray(root.appliedPromotions)
      ? root.appliedPromotions
      : [];

  const items = listSource
    .map(parseItem)
    .filter((item): item is AppliedPromotionSnapshot => item != null);

  return {
    schemaVersion: APPLIED_PROMOTIONS_SCHEMA_VERSION,
    items,
    referralPromotionId:
      typeof root.referralPromotionId === "string"
        ? root.referralPromotionId
        : typeof nested?.referralPromotionId === "string"
          ? nested.referralPromotionId
          : null,
    referralOwnerStaffId:
      typeof root.referralOwnerStaffId === "string"
        ? root.referralOwnerStaffId
        : typeof nested?.referralOwnerStaffId === "string"
          ? nested.referralOwnerStaffId
          : null,
  };
}

export function sumDiscountByType(
  items: AppliedPromotionSnapshot[],
  type: string,
): number {
  return items
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + item.discountAmountRials, 0);
}
