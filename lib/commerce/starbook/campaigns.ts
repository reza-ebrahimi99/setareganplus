/**
 * StarBook campaign copy — merchandising only.
 * Products still come from BookSku; this file never invents a second catalog.
 */

export type StarBookCampaign = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  tone: "flash" | "exam" | "bundle" | "new";
  href: string;
};

export const STARBOOK_CAMPAIGNS: readonly StarBookCampaign[] = [
  {
    slug: "flash-konkur",
    eyebrow: "فقط این هفته",
    title: "حراج شب کنکور",
    subtitle: "جزوه‌های پرتقاضا با تخفیف زنده — تا موجودی شعبه.",
    tone: "flash",
    href: "/shop/campaigns/flash-konkur",
  },
  {
    slug: "exam-lab",
    eyebrow: "آزمایشگاه آزمون",
    title: "بسته آزمون‌های جمع‌بندی",
    subtitle: "برای پایه دهم تا دوازدهم؛ مناسب شب امتحان و قلم‌چی.",
    tone: "exam",
    href: "/shop/campaigns/exam-lab",
  },
  {
    slug: "new-wave",
    eyebrow: "موج تازه",
    title: "تازه‌رسیده‌های این ماه",
    subtitle: "جلدهای جدید همان لحظه که منتشر می‌شوند روی استاربوک می‌آیند.",
    tone: "new",
    href: "/shop/campaigns/new-wave",
  },
  {
    slug: "night-pack",
    eyebrow: "بسته شب امتحان",
    title: "کالکشن + آزمون، با هم",
    subtitle: "قفسه‌های انتخاب‌شده را مثل پلی‌لیست بردار؛ پرداخت هر کتاب جداست.",
    tone: "bundle",
    href: "/shop/bundles",
  },
];

export function getStarBookCampaign(slug: string): StarBookCampaign | null {
  return STARBOOK_CAMPAIGNS.find((campaign) => campaign.slug === slug) ?? null;
}
