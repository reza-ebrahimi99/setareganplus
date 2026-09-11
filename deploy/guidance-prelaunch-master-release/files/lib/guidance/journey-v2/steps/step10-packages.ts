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
