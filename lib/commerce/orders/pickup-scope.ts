/**
 * Pickup desk branch-scope helper — pure, reused by scan resolution.
 */

export function isCommercePickupBranchAllowed(params: {
  pickupBranchId: string | null;
  catalogBranchId: string | null;
  allowedBranchIds?: readonly string[] | null;
}): boolean {
  if (params.allowedBranchIds == null) return true;
  const allowed = params.allowedBranchIds;
  if (params.pickupBranchId && allowed.includes(params.pickupBranchId)) return true;
  if (params.catalogBranchId && allowed.includes(params.catalogBranchId)) return true;
  return false;
}
