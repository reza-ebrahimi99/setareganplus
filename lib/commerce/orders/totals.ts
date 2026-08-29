/**
 * Commerce order totals + line snapshot helpers (pure).
 */

import type { CommerceSystemKindValue } from "@/lib/commerce/types";

export class CommerceOrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceOrderValidationError";
  }
}

export type OrderLineInput = {
  itemId?: string | null;
  titleSnapshot: string;
  skuSnapshot?: string | null;
  systemKindSnapshot: CommerceSystemKindValue;
  unitPriceRials: number;
  quantity: number;
  discountRials?: number;
};

export type OrderLineSnapshot = {
  itemId: string | null;
  titleSnapshot: string;
  skuSnapshot: string | null;
  systemKindSnapshot: CommerceSystemKindValue;
  unitPriceRials: number;
  quantity: number;
  discountRials: number;
  totalRials: number;
};

export type OrderTotals = {
  subtotalRials: number;
  discountRials: number;
  taxRials: number;
  shippingRials: number;
  grandTotalRials: number;
  lines: OrderLineSnapshot[];
};

function assertNonNegativeInt(label: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CommerceOrderValidationError(`${label} must be a non-negative integer.`);
  }
}

export function buildOrderLineSnapshot(input: OrderLineInput): OrderLineSnapshot {
  const titleSnapshot = input.titleSnapshot.trim();
  if (!titleSnapshot) {
    throw new CommerceOrderValidationError("titleSnapshot is required.");
  }
  assertNonNegativeInt("unitPriceRials", input.unitPriceRials);
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new CommerceOrderValidationError("quantity must be an integer >= 1.");
  }
  const discountRials = input.discountRials ?? 0;
  assertNonNegativeInt("discountRials", discountRials);

  const gross = input.unitPriceRials * input.quantity;
  if (discountRials > gross) {
    throw new CommerceOrderValidationError(
      "Line discount cannot exceed line gross amount.",
    );
  }

  return {
    itemId: input.itemId?.trim() || null,
    titleSnapshot,
    skuSnapshot: input.skuSnapshot?.trim() || null,
    systemKindSnapshot: input.systemKindSnapshot,
    unitPriceRials: input.unitPriceRials,
    quantity: input.quantity,
    discountRials,
    totalRials: gross - discountRials,
  };
}

export function calculateOrderTotals(params: {
  lines: readonly OrderLineInput[];
  orderDiscountRials?: number;
  taxRials?: number;
  shippingRials?: number;
}): OrderTotals {
  if (params.lines.length === 0) {
    throw new CommerceOrderValidationError("Order must contain at least one line.");
  }

  const lines = params.lines.map(buildOrderLineSnapshot);
  const subtotalRials = lines.reduce((sum, line) => sum + line.totalRials, 0);
  const lineDiscountRials = lines.reduce((sum, line) => sum + line.discountRials, 0);
  const orderDiscountRials = params.orderDiscountRials ?? 0;
  assertNonNegativeInt("orderDiscountRials", orderDiscountRials);
  if (orderDiscountRials > subtotalRials) {
    throw new CommerceOrderValidationError(
      "Order discount cannot exceed subtotal.",
    );
  }
  const taxRials = params.taxRials ?? 0;
  const shippingRials = params.shippingRials ?? 0;
  assertNonNegativeInt("taxRials", taxRials);
  assertNonNegativeInt("shippingRials", shippingRials);

  const discountRials = lineDiscountRials + orderDiscountRials;
  const grandTotalRials = subtotalRials - orderDiscountRials + taxRials + shippingRials;

  return {
    subtotalRials,
    discountRials,
    taxRials,
    shippingRials,
    grandTotalRials,
    lines,
  };
}

/** Human-readable order number helper (org-scoped uniqueness enforced in DB). */
export function buildCommerceOrderNumber(params: {
  now?: Date;
  sequence: number;
}): string {
  const now = params.now ?? new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const seq = String(params.sequence).padStart(5, "0");
  return `ORD-${y}${m}${d}-${seq}`;
}

/**
 * Tenant isolation guard for in-memory / service-layer checks.
 */
export function assertSameOrganization(
  expectedOrganizationId: string,
  actualOrganizationId: string,
  entityLabel = "entity",
): void {
  if (expectedOrganizationId !== actualOrganizationId) {
    throw new CommerceOrderValidationError(
      `Tenant mismatch for ${entityLabel}.`,
    );
  }
}
