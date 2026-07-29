/**
 * Extension points (Phase 1 — documented, not implemented).
 *
 * Variants: later add CommerceVariant { itemId, sku, title, price overrides, validated attributes }
 * then optional CommerceOrderItem.variantId. Do not bury variants in unvalidated CommerceItem JSON.
 *
 * Gallery: later add CommerceItemMedia join; keep primaryImageAssetId.
 *
 * Customer: historical orders keep buyer snapshots; future Customer links via nullable customerId.
 */

export const COMMERCE_EXTENSION_NOTES = {
  variants: "deferred",
  gallery: "deferred",
  customerModel: "deferred",
} as const;
