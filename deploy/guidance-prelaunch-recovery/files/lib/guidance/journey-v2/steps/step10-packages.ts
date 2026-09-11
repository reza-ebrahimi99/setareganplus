/**
 * Guidance Journey V2 Step 10 package catalog.
 * Canonical payable prices are integer RIALS.
 *
 * PREMIUM list price is the confirmed production amount:
 * 7,900,000 تومان = 79,000,000 ریال.
 *
 * SMART was last observed on a live charge at 43,000,000 ریال.
 * SPECIALIZED approved commercial price:
 * 5,700,000 تومان = 57,000,000 ریال.
 * If production already has this file, do not overwrite it from the
 * discount-engine deploy bundle.
 */

export const GUIDANCE_V2_PACKAGES = [
  {
    code: "START" as const,
    title: "شروع",
    subtitle: "مسیر رایگان انتخاب رشته",
    priceRials: 0,
    requiresPayment: false,
    highlighted: false,
    features: [
      "تشکیل پرونده و ورود اطلاعات",
      "ورود نمرات نهایی و کارنامه",
      "آزمون رغبت‌سنجی",
      "تحلیل علایق و پیشنهاد رشته‌ها",
      "بررسی دانشگاه‌ها و دوره‌های تحصیلی",
      "بررسی شهرهای موردنظر",
      "ثبت اولویت رشته، شهر و دوره",
    ],
  },
  {
    code: "SMART" as const,
    title: "هوشمند",
    subtitle: "همراهی هوشمند",
    priceRials: 43_000_000,
    requiresPayment: true,
    highlighted: false,
    features: ["مشاوره و چیدمان هوشمند"],
  },
  {
    code: "SPECIALIZED" as const,
    title: "تخصصی",
    subtitle: "همراهی تخصصی",
    priceRials: 57_000_000,
    requiresPayment: true,
    highlighted: false,
    features: ["بازبینی تخصصی انتخاب‌ها"],
  },
  {
    code: "PREMIUM" as const,
    title: "ممتاز",
    subtitle: "همراهی کامل تا ثبت سنجش",
    priceRials: 79_000_000,
    requiresPayment: true,
    highlighted: true,
    features: ["۲ جلسه مشاوره", "بازبینی کامل", "همراهی تا ثبت نهایی"],
  },
] as const;

export type GuidanceV2PackageCode = (typeof GUIDANCE_V2_PACKAGES)[number]["code"];

export type GuidanceV2PackageDefinition = (typeof GUIDANCE_V2_PACKAGES)[number];

export function isGuidanceV2PackageCode(value: string): value is GuidanceV2PackageCode {
  return GUIDANCE_V2_PACKAGES.some((item) => item.code === value);
}

export function getGuidanceV2Package(
  code: string,
): GuidanceV2PackageDefinition | null {
  return GUIDANCE_V2_PACKAGES.find((item) => item.code === code) ?? null;
}

/**
 * Production Step 10 / dashboard plans payment still import this constant.
 * It is not a package list price. List prices stay in GUIDANCE_V2_PACKAGES.
 * The recovery applier overwrites this assignment from the pre-deploy backup
 * when that backup is present, so the live alumni amount is not invented here.
 */
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

function wantsAlumniDiscount(
  flag?: boolean | { alumni?: boolean; applyAlumniDiscount?: boolean; isAlumni?: boolean },
): boolean {
  if (flag === true) return true;
  if (!flag || typeof flag !== "object") return false;
  return Boolean(flag.alumni || flag.applyAlumniDiscount || flag.isAlumni);
}

/**
 * Backward-compatible price helper for production plans-payment / step10-payment.
 * Reads list prices only from GUIDANCE_V2_PACKAGES. Does not create a second catalog.
 */
export function calculateGuidanceV2PackagePrice(
  packageCode: string,
  applyAlumniDiscount?: boolean | { alumni?: boolean; applyAlumniDiscount?: boolean; isAlumni?: boolean },
): GuidanceV2CalculatedPackagePrice | null {
  const pkg = getGuidanceV2Package(packageCode);
  if (!pkg) return null;
  const alumniDiscountRials =
    wantsAlumniDiscount(applyAlumniDiscount) && pkg.requiresPayment
      ? Math.min(Math.max(0, Math.floor(GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS)), pkg.priceRials)
      : 0;
  const payableRials = pkg.priceRials - alumniDiscountRials;
  return {
    code: pkg.code,
    title: pkg.title,
    listPriceRials: pkg.priceRials,
    priceRials: payableRials,
    originalAmountRials: pkg.priceRials,
    alumniDiscountRials,
    discountRials: alumniDiscountRials,
    finalAmountRials: payableRials,
    payableRials,
    requiresPayment: pkg.requiresPayment && payableRials > 0,
  };
}
