/**
 * Shared pickup-desk hours for receipts, QR page, and SMS.
 * Source of truth matches the public contact hours on the homepage.
 */

export const BOOKLET_PICKUP_HOURS_DAILY = "هر روز ۱۲:۰۰ تا ۲۰:۳۰";
export const BOOKLET_PICKUP_HOURS_THURSDAY = "پنج‌شنبه ۱۰:۰۰ تا ۲۰:۳۰";

export const BOOKLET_PICKUP_HOURS = `${BOOKLET_PICKUP_HOURS_DAILY} · ${BOOKLET_PICKUP_HOURS_THURSDAY}`;

export const BOOKLET_PICKUP_INSTRUCTIONS =
  "هنگام مراجعه فقط QR را به مسئول تحویل نشان دهید.";

export const BOOKLET_READY_NOTICE_LINES = [
  "پس از آماده شدن جزوه،",
  "پیامک اطلاع‌رسانی برای شما ارسال خواهد شد.",
] as const;

export const BOOKLET_READY_NOTICE = BOOKLET_READY_NOTICE_LINES.join(" ");
