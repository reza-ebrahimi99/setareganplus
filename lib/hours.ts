/**
 * Real opening hours of both branches (confirmed by the owner, Aban 1405):
 * Saturday–Wednesday 12:00–20:30, Thursday 10:00–20:30, Friday closed.
 *
 * DEFAULT_HOURS is the default of Setting "contact".hours (admin-editable in «تنظیمات سایت»).
 * lib/seo.ts parsePersianHours() turns these lines into schema.org openingHoursSpecification.
 * No imports here: safe for client components, the seed and deploy scripts.
 */
export const DEFAULT_HOURS = ["شنبه تا چهارشنبه ۱۲ تا ۲۰:۳۰", "پنج‌شنبه ۱۰ تا ۲۰:۳۰", "جمعه تعطیل"];

/** Previous seeded default (wrong: «هر روز» read as every day). Replaced on deploy only if unchanged. */
export const LEGACY_DEFAULT_HOURS = ["هر روز: ۱۲:۰۰ تا ۲۰:۳۰", "پنج‌شنبه: ۱۰:۰۰ تا ۲۰:۳۰"];

/** Booklet pickup hours = opening hours. */
export const PICKUP_HOURS = DEFAULT_HOURS;
