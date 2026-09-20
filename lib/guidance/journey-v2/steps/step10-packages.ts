/**
 * Guidance Journey V2 Step 10 package catalog.
 * Canonical payable prices are integer RIALS (10 rials = 1 toman in UI).
 */

import {
  GUIDANCE_COMMERCE_CODES,
  GUIDANCE_PRICE_RIALS,
  legacyPackagePriceRials,
} from "@/lib/guidance/commerce/catalog";

export const GUIDANCE_V2_PACKAGES = [
  {
    code: "START" as const,
    title: "شروع",
    subtitle: "مسیر رایگان انتخاب رشته",
    priceRials: 0,
    requiresPayment: false,
    highlighted: false,
    sellable: false,
    features: ["تشکیل پرونده و ورود اطلاعات"],
  },
  {
    code: "SMART" as const,
    title: "هوشمند",
    subtitle: "همراهی هوشمند",
    priceRials: 43_000_000,
    requiresPayment: true,
    highlighted: false,
    sellable: false,
    features: ["مشاوره و چیدمان هوشمند"],
  },
  {
    code: "SPECIALIZED" as const,
    title: "تخصصی",
    subtitle: "همراهی تخصصی",
    priceRials: 57_000_000,
    requiresPayment: true,
    highlighted: false,
    sellable: false,
    features: ["بازبینی تخصصی انتخاب‌ها"],
  },
  {
    code: GUIDANCE_COMMERCE_CODES.PREMIUM,
    title: "انتخاب رشته ممتاز",
    subtitle: "همراهی کامل مسیر اصلی تا ثبت سنجش",
    priceRials: GUIDANCE_PRICE_RIALS.PREMIUM,
    requiresPayment: true,
    highlighted: true,
    sellable: true,
    features: [
      "۲ جلسه مشاوره انتخاب رشته",
      "بازبینی و چیدمان ۱۵۰ انتخاب",
      "همراهی تا ثبت نهایی",
    ],
  },
  {
    code: GUIDANCE_COMMERCE_CODES.FARHANGIAN,
    title: "انتخاب رشته فرهنگیان",
    subtitle: "خدمات و جلسات ویژه فرهنگیان",
    priceRials: GUIDANCE_PRICE_RIALS.FARHANGIAN,
    requiresPayment: true,
    highlighted: false,
    sellable: true,
    features: [
      "جلسات مشاوره مرتبط با فرهنگیان",
      "راهنمایی انتخاب رشته فرهنگیان",
    ],
  },
] as const;

export type GuidanceV2PackageCode = (typeof GUIDANCE_V2_PACKAGES)[number]["code"];

export type GuidanceV2PackageDefinition = (typeof GUIDANCE_V2_PACKAGES)[number];

export function listGuidanceV2PackagesForNewSale(): GuidanceV2PackageDefinition[] {
  return GUIDANCE_V2_PACKAGES.filter((item) => item.sellable);
}

export function isGuidanceV2PackageCode(value: string): value is GuidanceV2PackageCode {
  return GUIDANCE_V2_PACKAGES.some((item) => item.code === value);
}

export function getGuidanceV2Package(
  code: string,
): GuidanceV2PackageDefinition | null {
  const normalized = code.trim().toUpperCase();
  const found = GUIDANCE_V2_PACKAGES.find((item) => item.code === normalized);
  if (found) return found;
  return null;
}

export const GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS = 0;

export type GuidanceV2CalculatedPackagePrice = {
  code: GuidanceV2PackageCode;
  title: string;
  listPriceRials: number;
  priceRials: number;
  originalAmountRials: number;
  alumniDiscountRials: number;
  discountRials: number;
  finalAmountRials: number;
  payableRials: number;
  requiresPayment: boolean;
};

export function calculateGuidanceV2PackagePrice(
  packageCode: string,
): GuidanceV2CalculatedPackagePrice | null {
  const pkg = getGuidanceV2Package(packageCode);
  if (!pkg) {
    const legacy = legacyPackagePriceRials(packageCode);
    if (legacy == null) return null;
    return {
      code: packageCode as GuidanceV2PackageCode,
      title: packageCode,
      listPriceRials: legacy,
      priceRials: legacy,
      originalAmountRials: legacy,
      alumniDiscountRials: 0,
      discountRials: 0,
      finalAmountRials: legacy,
      payableRials: legacy,
      requiresPayment: legacy > 0,
    };
  }
  return {
    code: pkg.code,
    title: pkg.title,
    listPriceRials: pkg.priceRials,
    priceRials: pkg.priceRials,
    originalAmountRials: pkg.priceRials,
    alumniDiscountRials: 0,
    discountRials: 0,
    finalAmountRials: pkg.priceRials,
    payableRials: pkg.priceRials,
    requiresPayment: pkg.requiresPayment && pkg.priceRials > 0,
  };
}
