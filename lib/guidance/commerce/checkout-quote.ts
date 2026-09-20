import {
  GUIDANCE_COMMERCE_CODES,
  GUIDANCE_PRICE_RIALS,
  isGuidanceSellableBaseCode,
  type GuidanceSellableBaseCode,
} from "@/lib/guidance/commerce/catalog";

export type GuidanceCheckoutLineItem = {
  code: string;
  title: string;
  amountRials: number;
};

export type GuidanceCheckoutQuote = {
  basePackageCode: GuidanceSellableBaseCode;
  addonCodes: readonly string[];
  lineItems: GuidanceCheckoutLineItem[];
  originalAmountRials: number;
  /** Primary code stored on GuidancePlan.guidancePackageCode */
  planPackageCode: GuidanceSellableBaseCode;
  /** Discount scope / billing identity */
  discountPackageCode: GuidanceSellableBaseCode;
};

export function quoteGuidanceCheckoutSelection(params: {
  basePackageCode: string;
  farhangianAddon: boolean;
}):
  | { ok: true; quote: GuidanceCheckoutQuote }
  | { ok: false; error: string } {
  const base = params.basePackageCode.trim().toUpperCase();
  if (!isGuidanceSellableBaseCode(base)) {
    return { ok: false, error: "بسته انتخاب‌شده معتبر نیست." };
  }
  if (base === GUIDANCE_COMMERCE_CODES.FARHANGIAN && params.farhangianAddon) {
    return {
      ok: false,
      error: "افزونه فرهنگیان فقط همراه بسته ممتاز قابل انتخاب است.",
    };
  }

  const lineItems: GuidanceCheckoutLineItem[] = [];
  if (base === GUIDANCE_COMMERCE_CODES.PREMIUM) {
    lineItems.push({
      code: GUIDANCE_COMMERCE_CODES.PREMIUM,
      title: "انتخاب رشته ممتاز",
      amountRials: GUIDANCE_PRICE_RIALS.PREMIUM,
    });
    if (params.farhangianAddon) {
      lineItems.push({
        code: GUIDANCE_COMMERCE_CODES.FARHANGIAN_ADDON,
        title: "افزونه انتخاب رشته فرهنگیان",
        amountRials: GUIDANCE_PRICE_RIALS.FARHANGIAN_ADDON,
      });
    }
  } else {
    lineItems.push({
      code: GUIDANCE_COMMERCE_CODES.FARHANGIAN,
      title: "انتخاب رشته فرهنگیان",
      amountRials: GUIDANCE_PRICE_RIALS.FARHANGIAN,
    });
  }

  const originalAmountRials = lineItems.reduce((sum, row) => sum + row.amountRials, 0);
  const addonCodes =
    base === GUIDANCE_COMMERCE_CODES.PREMIUM && params.farhangianAddon
      ? [GUIDANCE_COMMERCE_CODES.FARHANGIAN_ADDON]
      : [];

  return {
    ok: true,
    quote: {
      basePackageCode: base,
      addonCodes,
      lineItems,
      originalAmountRials,
      planPackageCode: base,
      discountPackageCode: base,
    },
  };
}
