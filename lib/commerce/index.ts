/**
 * Commerce Foundation public exports.
 */

export * from "@/lib/commerce/types";
export * from "@/lib/commerce/permissions";
export * from "@/lib/commerce/booklet";
export * from "@/lib/commerce/pricing";
export {
  COMMERCE_OPS_STAGES,
  COMMERCE_OPS_STAGE_LABELS,
  COMMERCE_OPS_STAGE_HINTS,
  COMMERCE_OPS_NEXT_ACTION_LABELS,
  COMMERCE_OPS_ACTIVITY_TITLES,
  isCommerceOpsStage,
  nextCommerceOpsStage,
  previousCommerceOpsStage,
  commerceOpsNextActionLabel,
  commerceOpsStageIndex,
  canAdvanceCommerceOpsStage,
  canRollbackCommerceOpsStage,
  syncedLifecycleForOpsStage,
} from "@/lib/commerce/orders/ops-stage";
export type { CommerceOpsStageValue } from "@/lib/commerce/orders/ops-stage";
export {
  resolveBranchAccentColor,
  toCommerceBranchBadge,
} from "@/lib/commerce/branches";
export type { CommerceBranchBadge } from "@/lib/commerce/branches";
export { formatOrderOpsKpis, loadOrderOpsKpis } from "@/lib/commerce/orders/kpis";
export {
  assertUniqueCategorySlug,
  assertValidCategoryParent,
  planCategorySeedInserts,
  CommerceCategoryValidationError,
} from "@/lib/commerce/categories/validation";
export { seedCommerceCategoriesForOrganization } from "@/lib/commerce/categories/seed";
export {
  validateCreateCommerceItem,
  CommerceItemValidationError,
} from "@/lib/commerce/catalog/validation";
export {
  buildOrderLineSnapshot,
  calculateOrderTotals,
  buildCommerceOrderNumber,
  assertSameOrganization,
  CommerceOrderValidationError,
} from "@/lib/commerce/orders/totals";
