/**
 * Guidance Journey Engine Step 3 — guidance package catalog.
 * Static reference data (same convention as onboarding-options.ts) — no
 * commerce catalog coupling; these are consulting packages, not physical
 * goods, so CommerceItem is not a good fit here.
 */

export type GuidancePackageDefinition = {
  code: string;
  title: string;
  description: string;
  priceRials: number;
  features: readonly string[];
  highlighted?: boolean;
};

export const GUIDANCE_PACKAGES: readonly GuidancePackageDefinition[] = [
  {
    code: "ESSENTIAL",
    title: "بسته ضروری",
    description: "شروع مسیر هدایت تحصیلی با یک جلسه مشاوره تخصصی.",
    priceRials: 990_000,
    features: [
      "۱ جلسه مشاوره اختصاصی",
      "تحلیل نتیجه آزمون رغبت",
      "چیدمان هوشمند انتخاب رشته",
    ],
  },
  {
    code: "PREMIUM",
    title: "بسته حرفه‌ای",
    description: "همراهی کامل تا لحظه ثبت نهایی انتخاب رشته.",
    priceRials: 1_890_000,
    features: [
      "۲ جلسه مشاوره اختصاصی",
      "بازبینی کامل ۱۵۰ گزینه چیده‌شده",
      "پشتیبانی پیامکی مشاور تا روز ثبت‌نام",
      "تأیید نهایی و آرشیو مدارک",
    ],
    highlighted: true,
  },
];

export function getGuidancePackage(
  code: string,
): GuidancePackageDefinition | null {
  return GUIDANCE_PACKAGES.find((pkg) => pkg.code === code) ?? null;
}
