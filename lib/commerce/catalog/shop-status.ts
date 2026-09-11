/**
 * Shop-facing listing status derived from canonical BookSkuStatus + inventory.
 * Prisma no longer has CommerceItemStatus; this mapping keeps admin/shop forms stable.
 */

import { BookSkuStatus } from "@/generated/prisma/enums";
import type { CommerceItemStatusValue } from "@/lib/commerce/types";

export function shopStatusFromBookSku(input: {
  status: BookSkuStatus;
  trackInventory: boolean;
  unlimitedStock: boolean;
  stockQuantity: number | null;
}): CommerceItemStatusValue {
  if (input.status === BookSkuStatus.DISCONTINUED) return "ARCHIVED";
  if (input.status === BookSkuStatus.INACTIVE) return "DRAFT";
  if (
    input.trackInventory &&
    !input.unlimitedStock &&
    (input.stockQuantity ?? 0) <= 0
  ) {
    return "OUT_OF_STOCK";
  }
  return "ACTIVE";
}

export function bookSkuStatusFromShopStatus(
  status: CommerceItemStatusValue,
): BookSkuStatus {
  if (status === "ARCHIVED") return BookSkuStatus.DISCONTINUED;
  if (status === "DRAFT") return BookSkuStatus.INACTIVE;
  return BookSkuStatus.ACTIVE;
}
