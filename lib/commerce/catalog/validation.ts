/**
 * CommerceItem (catalog) validation — pure helpers.
 */

import {
  COMMERCE_ITEM_STATUSES,
  COMMERCE_SYSTEM_KINDS,
  defaultFulfillmentHints,
  type CommerceItemStatusValue,
  type CommerceSystemKindValue,
} from "@/lib/commerce/types";

export class CommerceItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceItemValidationError";
  }
}

export type CreateCommerceItemInput = {
  organizationId: string;
  branchId?: string | null;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  status?: CommerceItemStatusValue;
  systemKind: CommerceSystemKindValue;
  businessTypeId?: string | null;
  basePriceRials: number;
  salePriceRials?: number | null;
  currency?: string;
  priceStartsAt?: Date | null;
  priceEndsAt?: Date | null;
  sku?: string | null;
  barcode?: string | null;
  trackInventory?: boolean;
  stockQuantity?: number | null;
  unlimitedStock?: boolean;
  requiresShipping?: boolean;
  grantsDigitalAccess?: boolean;
  requiresScheduling?: boolean;
  requiresEnrollment?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  categoryIds?: readonly string[];
};

export type ValidatedCommerceItemCreate = {
  organizationId: string;
  branchId: string | null;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  status: CommerceItemStatusValue;
  systemKind: CommerceSystemKindValue;
  businessTypeId: string | null;
  basePriceRials: number;
  salePriceRials: number | null;
  currency: string;
  priceStartsAt: Date | null;
  priceEndsAt: Date | null;
  sku: string | null;
  barcode: string | null;
  trackInventory: boolean;
  stockQuantity: number | null;
  unlimitedStock: boolean;
  requiresShipping: boolean;
  grantsDigitalAccess: boolean;
  requiresScheduling: boolean;
  requiresEnrollment: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  isFeatured: boolean;
  sortOrder: number;
  categoryIds: string[];
};

function assertNonNegativeInt(label: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CommerceItemValidationError(`${label} must be a non-negative integer.`);
  }
}

export function validateCreateCommerceItem(
  input: CreateCommerceItemInput,
  options?: { existingSlugs?: ReadonlySet<string> },
): ValidatedCommerceItemCreate {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    throw new CommerceItemValidationError("organizationId is required.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new CommerceItemValidationError("عنوان محصول الزامی است.");
  }

  const slug = input.slug.trim();
  if (!slug) {
    throw new CommerceItemValidationError("اسلاگ محصول الزامی است.");
  }
  if (options?.existingSlugs?.has(slug)) {
    throw new CommerceItemValidationError("اسلاگ محصول در این سازمان تکراری است.");
  }

  if (!(COMMERCE_SYSTEM_KINDS as readonly string[]).includes(input.systemKind)) {
    throw new CommerceItemValidationError("systemKind نامعتبر است.");
  }

  const status = input.status ?? "DRAFT";
  if (!(COMMERCE_ITEM_STATUSES as readonly string[]).includes(status)) {
    throw new CommerceItemValidationError("وضعیت محصول نامعتبر است.");
  }

  assertNonNegativeInt("basePriceRials", input.basePriceRials);
  if (input.salePriceRials != null) {
    assertNonNegativeInt("salePriceRials", input.salePriceRials);
    if (input.salePriceRials > input.basePriceRials) {
      throw new CommerceItemValidationError(
        "قیمت فروش نمی‌تواند از قیمت پایه بیشتر باشد.",
      );
    }
  }

  if (
    input.priceStartsAt &&
    input.priceEndsAt &&
    input.priceEndsAt.getTime() < input.priceStartsAt.getTime()
  ) {
    throw new CommerceItemValidationError(
      "بازه زمان‌بندی قیمت نامعتبر است.",
    );
  }

  const trackInventory = input.trackInventory ?? false;
  const unlimitedStock = input.unlimitedStock ?? !trackInventory;
  if (trackInventory && !unlimitedStock) {
    if (input.stockQuantity == null) {
      throw new CommerceItemValidationError(
        "برای موجودی محدود، stockQuantity الزامی است.",
      );
    }
    assertNonNegativeInt("stockQuantity", input.stockQuantity);
  }

  const hints = defaultFulfillmentHints(input.systemKind);
  const categoryIds = [...new Set((input.categoryIds ?? []).map((id) => id.trim()).filter(Boolean))];

  return {
    organizationId,
    branchId: input.branchId?.trim() || null,
    title,
    slug,
    shortDescription: (input.shortDescription ?? "").trim(),
    description: (input.description ?? "").trim(),
    status,
    systemKind: input.systemKind,
    businessTypeId: input.businessTypeId?.trim() || null,
    basePriceRials: input.basePriceRials,
    salePriceRials: input.salePriceRials ?? null,
    currency: (input.currency ?? "IRR").trim() || "IRR",
    priceStartsAt: input.priceStartsAt ?? null,
    priceEndsAt: input.priceEndsAt ?? null,
    sku: input.sku?.trim() || null,
    barcode: input.barcode?.trim() || null,
    trackInventory,
    stockQuantity: trackInventory && !unlimitedStock ? (input.stockQuantity ?? null) : null,
    unlimitedStock,
    requiresShipping: input.requiresShipping ?? hints.requiresShipping,
    grantsDigitalAccess: input.grantsDigitalAccess ?? hints.grantsDigitalAccess,
    requiresScheduling: input.requiresScheduling ?? hints.requiresScheduling,
    requiresEnrollment: input.requiresEnrollment ?? hints.requiresEnrollment,
    metaTitle: input.metaTitle?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
    isFeatured: input.isFeatured ?? false,
    sortOrder: input.sortOrder ?? 0,
    categoryIds,
  };
}
