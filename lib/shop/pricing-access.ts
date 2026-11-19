/** Owner account is the env admin (ADMIN_USERNAME), not a permission that can be granted to staff. */

export function canSeeBookletRates(user: { owner: boolean } | null | undefined): boolean {
  return user?.owner === true;
}

/** 403 for everyone except the owner. The pricing page and its save action both use this. */
export function pricingStatus(user: { owner: boolean } | null | undefined): 200 | 403 {
  return canSeeBookletRates(user) ? 200 : 403;
}
