/**
 * Booklet SMS domain types. Public callers use Result objects only.
 */

import { randomUUID } from "node:crypto";

export const BOOKLET_SMS_EVENTS = [
  "PAID",
  "READY_FOR_PICKUP",
  "DELIVERED_TO_STUDENT",
] as const;

export type BookletSmsEvent = (typeof BOOKLET_SMS_EVENTS)[number];

export const BOOKLET_SMS_STEPS = [
  "START",
  "LOAD_ORDER",
  "VALIDATE",
  "BUILD_BUYER",
  "BUILD_ADMIN",
  "SAVE_SMS",
  "SEND",
  "PROVIDER_RESPONSE",
  "UPDATE_SMS",
  "SUCCESS",
  "FAILED",
] as const;

export type BookletSmsStep = (typeof BOOKLET_SMS_STEPS)[number];

export type BookletSmsStepPhase = "start" | "success" | "failed" | "skipped";

export type BookletSmsRecipientRole = "buyer" | "admin";

export type BookletSmsBuilderName =
  | "paid_buyer"
  | "ready_buyer"
  | "delivered_buyer"
  | "paid_admin";

export type BookletSmsErrorCode =
  | "ORDER_NOT_FOUND"
  | "ORG_MISMATCH"
  | "INVALID_STAGE"
  | "NOT_PAID"
  | "NO_BUYER_MOBILE"
  | "INVALID_MOBILE"
  | "ADMIN_DISABLED"
  | "SAVE_FAILED"
  | "SEND_FAILED"
  | "PROVIDER_FAILED"
  | "UPDATE_FAILED"
  | "MESSAGE_NOT_FOUND"
  | "RETRY_NOT_ELIGIBLE"
  | "VERIFY_NOT_CONFIGURED"
  | "UNEXPECTED";

export type BookletSmsSkipReason =
  | "duplicate_idempotency"
  | "no_mobile"
  | "invalid_mobile"
  | "admin_disabled"
  | "same_as_buyer"
  | "stage_has_no_admin_sms"
  | "stage_has_no_student_sms"
  | "no_recipients";

export type BookletSmsError = {
  code: BookletSmsErrorCode;
  message: string;
};

export type BookletSmsMessageOutcome = {
  role: BookletSmsRecipientRole;
  status: "sent" | "skipped" | "failed";
  messageId: string | null;
  skipReason?: BookletSmsSkipReason;
  error?: BookletSmsError;
};

export type BookletSmsSuccess = {
  ok: true;
  status: "success" | "partial" | "skipped";
  event: BookletSmsEvent | "UNKNOWN";
  correlationId: string;
  organizationId: string;
  orderId: string | null;
  messages: BookletSmsMessageOutcome[];
};

export type BookletSmsFailure = {
  ok: false;
  status: "failed";
  event: BookletSmsEvent | "UNKNOWN";
  correlationId: string;
  organizationId: string;
  orderId: string | null;
  messages: BookletSmsMessageOutcome[];
  error: BookletSmsError;
};

export type BookletSmsResult = BookletSmsSuccess | BookletSmsFailure;

export type BookletSmsHistoryItem = {
  id: string;
  templateLabel: string;
  stageLabel: string;
  sentAtLabel: string;
  status: string;
  statusLabel: string;
  providerResponse: string;
  canRetry: boolean;
};

/** @deprecated Use BookletSmsHistoryItem. Kept so order-detail types stay stable. */
export type CommerceOrderSmsHistoryItem = BookletSmsHistoryItem;

export type BookletSmsHistorySuccess = {
  ok: true;
  correlationId: string;
  organizationId: string;
  orderId: string;
  items: BookletSmsHistoryItem[];
};

export type BookletSmsHistoryFailure = {
  ok: false;
  correlationId: string;
  organizationId: string;
  orderId: string;
  items: BookletSmsHistoryItem[];
  error: BookletSmsError;
};

export type BookletSmsHistoryResult =
  | BookletSmsHistorySuccess
  | BookletSmsHistoryFailure;

export type BookletSmsContext = {
  fullName: string;
  booklet: string;
  amount: string;
  orderNumber: string;
  pickupBranch: string;
  pickupBranchAddress: string;
  statusLabel: string;
  bookletUrl: string;
  /** Bare permanent short code (no scheme/host) — Verify LINK parameter uses this, never bookletUrl. */
  shortCode: string;
};

export type BookletSmsMetadataV2 = {
  version: 2;
  domain: "booklet";
  event: BookletSmsEvent;
  recipientRole: BookletSmsRecipientRole;
  /** "verify" = sent via SMS.ir Verify (POST /v1/send/verify, service line). "text" = plain sendText (advertising line). */
  channel: "text" | "verify";
  /** "pattern" = SMS.ir approved Verify template id + parameters below. "none" = plain rendered text only. */
  templateKind: "none" | "pattern";
  /** Populated only when templateKind is "pattern". */
  verifyTemplateCode?: string;
  builderName: BookletSmsBuilderName;
  builderVersion: 1;
  correlationId: string;
  orderNumber: string;
  bookletUrl: string;
  productTitles: string;
  amount: string;
  pickupBranch: string;
  pickupBranchAddress: string;
  idempotencyBase: string;
  retry: {
    allowed: true;
    mode: "rebuild_from_order";
  };
};

export type BookletSmsOrderRef = {
  organizationId: string;
  orderId: string;
};

export const BOOKLET_SMS_ERROR_MESSAGES: Record<BookletSmsErrorCode, string> = {
  ORDER_NOT_FOUND: "سفارش یافت نشد.",
  ORG_MISMATCH: "سفارش یافت نشد.",
  INVALID_STAGE: "برای این مرحله پیامک دانش‌آموز تعریف نشده است.",
  NOT_PAID: "سفارش هنوز پرداخت نشده است.",
  NO_BUYER_MOBILE: "شماره موبایل ثبت نشده است.",
  INVALID_MOBILE: "شماره موبایل واردشده معتبر نیست.",
  ADMIN_DISABLED: "اعلان پیامکی مدیر غیرفعال است.",
  SAVE_FAILED: "ثبت پیامک ناموفق بود.",
  SEND_FAILED: "ارسال پیامک ناموفق بود.",
  PROVIDER_FAILED: "ارسال پیامک ناموفق بود.",
  UPDATE_FAILED: "به‌روزرسانی وضعیت پیامک ناموفق بود.",
  MESSAGE_NOT_FOUND: "پیامک یافت نشد.",
  RETRY_NOT_ELIGIBLE: "فقط پیامک ناموفق قابل تلاش مجدد است.",
  VERIFY_NOT_CONFIGURED: "قالب پیامک تأییدشده (Verify) تنظیم نشده است.",
  UNEXPECTED: "ارسال پیامک با خطای پیش‌بینی‌نشده روبه‌رو شد.",
};

export function createBookletSmsCorrelationId(): string {
  return randomUUID();
}

export function isBookletSmsEvent(
  value: string | null | undefined,
): value is BookletSmsEvent {
  return (
    value === "PAID" ||
    value === "READY_FOR_PICKUP" ||
    value === "DELIVERED_TO_STUDENT"
  );
}

export function bookletSmsError(code: BookletSmsErrorCode): BookletSmsError {
  return { code, message: BOOKLET_SMS_ERROR_MESSAGES[code] };
}

export function bookletSmsSuccess(params: {
  status: BookletSmsSuccess["status"];
  event: BookletSmsEvent | "UNKNOWN";
  correlationId: string;
  organizationId: string;
  orderId: string | null;
  messages: BookletSmsMessageOutcome[];
}): BookletSmsSuccess {
  return {
    ok: true,
    status: params.status,
    event: params.event,
    correlationId: params.correlationId,
    organizationId: params.organizationId,
    orderId: params.orderId,
    messages: params.messages,
  };
}

export function bookletSmsFailure(params: {
  event: BookletSmsEvent | "UNKNOWN";
  correlationId: string;
  organizationId: string;
  orderId: string | null;
  messages: BookletSmsMessageOutcome[];
  code: BookletSmsErrorCode;
}): BookletSmsFailure {
  return {
    ok: false,
    status: "failed",
    event: params.event,
    correlationId: params.correlationId,
    organizationId: params.organizationId,
    orderId: params.orderId,
    messages: params.messages,
    error: bookletSmsError(params.code),
  };
}

export function bookletBuyerBuilderName(
  event: BookletSmsEvent,
): BookletSmsBuilderName {
  if (event === "READY_FOR_PICKUP") return "ready_buyer";
  if (event === "DELIVERED_TO_STUDENT") return "delivered_buyer";
  return "paid_buyer";
}

export function bookletSmsPurpose(
  event: BookletSmsEvent,
  role: BookletSmsRecipientRole,
): string {
  if (role === "admin") return "commerce_order_paid_admin";
  return `commerce_order_${event.toLowerCase()}`;
}

export function bookletSmsIdempotencyBase(params: {
  orderId: string;
  event: BookletSmsEvent;
  role: BookletSmsRecipientRole;
  adminMobile?: string;
}): string {
  if (params.role === "admin") {
    return `commerce_order_paid:${params.orderId}:admin:${params.adminMobile ?? ""}`;
  }
  return `commerce_order_sms:${params.orderId}:${params.event}`;
}

export function bookletSmsMetadata(params: {
  event: BookletSmsEvent;
  role: BookletSmsRecipientRole;
  builderName: BookletSmsBuilderName;
  correlationId: string;
  ctx: BookletSmsContext;
  idempotencyBase: string;
  /** Omit for the legacy plain-text channel (sendText). */
  verify?: { templateCode: string };
}): BookletSmsMetadataV2 {
  return {
    version: 2,
    domain: "booklet",
    event: params.event,
    recipientRole: params.role,
    channel: params.verify ? "verify" : "text",
    templateKind: params.verify ? "pattern" : "none",
    ...(params.verify ? { verifyTemplateCode: params.verify.templateCode } : {}),
    builderName: params.builderName,
    builderVersion: 1,
    correlationId: params.correlationId,
    orderNumber: params.ctx.orderNumber,
    bookletUrl: params.ctx.bookletUrl,
    productTitles: params.ctx.booklet,
    amount: params.ctx.amount,
    pickupBranch: params.ctx.pickupBranch,
    pickupBranchAddress: params.ctx.pickupBranchAddress,
    idempotencyBase: params.idempotencyBase,
    retry: {
      allowed: true,
      mode: "rebuild_from_order",
    },
  };
}

export function parseBookletSmsMetadata(raw: unknown): {
  event: BookletSmsEvent | null;
  role: BookletSmsRecipientRole | null;
  correlationId: string | null;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { event: null, role: null, correlationId: null };
  }
  const row = raw as Record<string, unknown>;
  const eventRaw =
    typeof row.event === "string"
      ? row.event
      : typeof row.stage === "string"
        ? row.stage
        : null;
  const roleRaw =
    row.recipientRole === "buyer" || row.recipientRole === "admin"
      ? row.recipientRole
      : null;
  return {
    event: isBookletSmsEvent(eventRaw) ? eventRaw : null,
    role: roleRaw,
    correlationId: typeof row.correlationId === "string" ? row.correlationId : null,
  };
}
