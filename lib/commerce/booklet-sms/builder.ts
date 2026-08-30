/**
 * Pure booklet SMS builders. No I/O.
 */

import { maskMobileForDisplay, truncateSmsParam } from "@/lib/communication/sms-params";
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

/**
 * Purchase confirmation SMS. Compact (no blank lines), Persian RTL,
 * emoji-formatted. Deliberately excludes "سپاس از اعتماد شما" and
 * "ستارگان پلاس" per the redesigned copy.
 */
export function buildBookletPaidSmsBody(ctx: BookletSmsContext): string {
  return compactSmsLines([
    "🛒 سفارش شما ثبت شد.",
    `👤 ${ctx.fullName}`,
    `📚 ${ctx.booklet}`,
    `💳 مبلغ: ${ctx.amount}`,
    `🧾 سفارش: ${ctx.orderNumber}`,
    "🔗 پیگیری سفارش:",
    ctx.bookletUrl,
  ]);
}

/** Ready-for-pickup SMS. Fires once when opsStage moves to READY_FOR_PICKUP. */
export function buildBookletReadySmsBody(ctx: BookletSmsContext): string {
  return compactSmsLines([
    "📦 سفارش شما آماده تحویل است.",
    `🧾 سفارش: ${ctx.orderNumber}`,
    `📚 ${ctx.booklet}`,
    "🕘 لطفاً در ساعات کاری برای دریافت مراجعه کنید.",
    "🔗 پیگیری سفارش:",
    ctx.bookletUrl,
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

// ─── SMS.ir Verify template parameters (POST /v1/send/verify) ──────────────
//
// These build the exact `parameters` map for sendPatternTemplate(). SMS.ir
// caps every Verify parameter at 25 characters — truncateSmsParam mirrors
// the same limit already used by booking/form templates (no new constant).

/** Purchase confirmation template — FULLNAME, TITLE, PRICE, ORDER_NUMBER. */
export function buildBookletPurchaseVerifyParameters(
  ctx: BookletSmsContext,
): Record<string, string> {
  return {
    FULLNAME: truncateSmsParam(ctx.fullName),
    TITLE: truncateSmsParam(ctx.booklet),
    PRICE: truncateSmsParam(ctx.amount),
    ORDER_NUMBER: truncateSmsParam(ctx.orderNumber),
  };
}

/**
 * Ready-for-pickup template — FULLNAME, TITLE, ORDER_NUMBER, LINK.
 * LINK is the bare short code only (e.g. "AB12CD"), never the full URL —
 * the approved template text already contains the domain/path.
 */
export function buildBookletReadyVerifyParameters(
  ctx: BookletSmsContext,
): Record<string, string> {
  return {
    FULLNAME: truncateSmsParam(ctx.fullName),
    TITLE: truncateSmsParam(ctx.booklet),
    ORDER_NUMBER: truncateSmsParam(ctx.orderNumber),
    LINK: truncateSmsParam(ctx.shortCode),
  };
}

/** Admin new-order notification template — FULLNAME, TITLE, PRICE, ORDER_NUMBER. */
export function buildBookletAdminVerifyParameters(
  ctx: BookletSmsContext,
): Record<string, string> {
  return {
    FULLNAME: truncateSmsParam(ctx.fullName),
    TITLE: truncateSmsParam(ctx.booklet),
    PRICE: truncateSmsParam(ctx.amount),
    ORDER_NUMBER: truncateSmsParam(ctx.orderNumber),
  };
}
