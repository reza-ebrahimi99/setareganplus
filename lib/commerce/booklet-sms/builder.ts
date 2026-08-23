/**
 * Pure booklet SMS builders. No I/O.
 */

import { maskMobileForDisplay } from "@/lib/communication/sms-params";
import type { BookletSmsContext, BookletSmsEvent } from "@/lib/commerce/booklet-sms/types";

export function compactSmsLines(lines: readonly string[]): string {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

export function joinProductTitles(
  items: ReadonlyArray<{ titleSnapshot: string }>,
): string {
  if (items.length === 0) return "—";
  return (
    items
      .map((item) => item.titleSnapshot.trim())
      .filter(Boolean)
      .join("، ") || "—"
  );
}

export function buildBookletPaidSmsBody(ctx: BookletSmsContext): string {
  return compactSmsLines([
    `سلام ${ctx.fullName} عزیز 🌹`,
    "✅ خرید شما با موفقیت ثبت شد.",
    `📚 ${ctx.booklet}`,
    `💰 ${ctx.amount}`,
    "🏢 محل دریافت:",
    ctx.pickupBranch,
    `🧾 ${ctx.orderNumber}`,
    "🔗 رسید و QR:",
    ctx.bookletUrl,
    "پس از آماده شدن جزوه، پیامک اطلاع‌رسانی برای شما ارسال خواهد شد.",
    "ستارگان پلاس",
  ]);
}

export function buildBookletReadySmsBody(ctx: BookletSmsContext): string {
  return compactSmsLines([
    `سلام ${ctx.fullName} عزیز 🌹`,
    "✅ جزوه شما آماده تحویل است.",
    `📚 ${ctx.booklet}`,
    "🏢 محل دریافت:",
    ctx.pickupBranch,
    `📍 ${ctx.pickupBranchAddress}`,
    `🧾 ${ctx.orderNumber}`,
    "🔗 رسید و QR:",
    ctx.bookletUrl,
    "ساعات تحویل:",
    "شنبه تا پنجشنبه",
    "۸:۰۰ تا ۲۰:۰۰",
    "ستارگان پلاس",
  ]);
}

export function buildBookletDeliveredSmsBody(ctx: BookletSmsContext): string {
  return compactSmsLines([
    `سلام ${ctx.fullName} عزیز 🌹`,
    "جزوه",
    ctx.booklet,
    "با موفقیت تحویل شد.",
    "از اعتماد شما سپاسگزاریم.",
    "🌐",
    "https://setareganplus.ir",
  ]);
}

export function buildBookletStageSmsBody(
  stage: BookletSmsEvent | string,
  ctx: BookletSmsContext,
): string {
  if (stage === "PAID") return buildBookletPaidSmsBody(ctx);
  if (stage === "READY_FOR_PICKUP") return buildBookletReadySmsBody(ctx);
  if (stage === "DELIVERED_TO_STUDENT") return buildBookletDeliveredSmsBody(ctx);
  return compactSmsLines([
    `سلام ${ctx.fullName} عزیز 🌹`,
    `📚 ${ctx.booklet}`,
    `🧾 ${ctx.orderNumber}`,
    ctx.bookletUrl,
    "ستارگان پلاس",
  ]);
}

export function buildBookletAdminSmsBody(
  ctx: BookletSmsContext,
  buyerMobile: string | null,
): string {
  const mobile =
    buyerMobile && buyerMobile.length >= 6
      ? maskMobileForDisplay(buyerMobile)
      : "—";
  return compactSmsLines([
    "🛒 سفارش جدید فروشگاه",
    `نام: ${ctx.fullName}`,
    `موبایل: ${mobile}`,
    `محصول: ${ctx.booklet}`,
    `مبلغ: ${ctx.amount}`,
    `شماره سفارش: ${ctx.orderNumber}`,
  ]);
}

export function buildBuyerMessage(
  event: BookletSmsEvent,
  ctx: BookletSmsContext,
): string {
  return buildBookletStageSmsBody(event, ctx);
}
