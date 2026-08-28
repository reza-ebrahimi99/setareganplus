/**
 * Commerce pricing helpers — effective sale price within optional windows.
 */

export type CommercePriceInput = {
  basePriceRials: number;
  salePriceRials?: number | null;
  priceStartsAt?: Date | null;
  priceEndsAt?: Date | null;
};

export type ResolvedCommercePrice = {
  basePriceRials: number;
  finalPriceRials: number;
  discountRials: number;
  discountPercent: number | null;
  isOnSale: boolean;
  saleEndsAt: Date | null;
};

export function isCommerceSaleActive(
  input: Pick<CommercePriceInput, "salePriceRials" | "priceStartsAt" | "priceEndsAt">,
  now: Date = new Date(),
): boolean {
  if (
    input.salePriceRials == null ||
    !Number.isInteger(input.salePriceRials) ||
    input.salePriceRials < 0
  ) {
    return false;
  }
  if (input.priceStartsAt && now < input.priceStartsAt) return false;
  if (input.priceEndsAt && now > input.priceEndsAt) return false;
  return true;
}

export function resolveCommercePrice(
  input: CommercePriceInput,
  now: Date = new Date(),
): ResolvedCommercePrice {
  const basePriceRials = Math.max(0, Math.trunc(input.basePriceRials));
  const onSale =
    isCommerceSaleActive(input, now) &&
    input.salePriceRials != null &&
    input.salePriceRials < basePriceRials;

  const finalPriceRials = onSale
    ? Math.max(0, Math.trunc(input.salePriceRials!))
    : basePriceRials;
  const discountRials = Math.max(0, basePriceRials - finalPriceRials);
  const discountPercent =
    onSale && basePriceRials > 0
      ? Math.round((discountRials / basePriceRials) * 100)
      : null;

  return {
    basePriceRials,
    finalPriceRials,
    discountRials,
    discountPercent,
    isOnSale: onSale,
    saleEndsAt: onSale ? (input.priceEndsAt ?? null) : null,
  };
}
