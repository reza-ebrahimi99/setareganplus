/**
 * Commerce order operations pipeline — pure stage machine.
 * UI and persistence both consume this; do not duplicate transition rules.
 */

export const COMMERCE_OPS_STAGES = [
  "REGISTERED",
  "PAID",
  "IN_PRODUCTION",
  "READY_FOR_PICKUP",
  "DELIVERED_TO_STUDENT",
] as const;

export type CommerceOpsStageValue = (typeof COMMERCE_OPS_STAGES)[number];

export const COMMERCE_OPS_STAGE_LABELS: Record<CommerceOpsStageValue, string> =
  {
    REGISTERED: "ثبت سفارش",
    PAID: "پرداخت",
    IN_PRODUCTION: "در حال تولید",
    READY_FOR_PICKUP: "آماده تحویل",
    DELIVERED_TO_STUDENT: "تحویل به دانش‌آموز",
  };

export const COMMERCE_OPS_STAGE_HINTS: Record<CommerceOpsStageValue, string> = {
  REGISTERED: "سفارش ثبت شده و در انتظار پرداخت است.",
  PAID: "پرداخت تأیید شد؛ آماده ورود به تولید.",
  IN_PRODUCTION: "چاپ، تکثیر و صحافی در جریان است.",
  READY_FOR_PICKUP: "چاپ و بسته‌بندی شده؛ در انتظار دانش‌آموز.",
  DELIVERED_TO_STUDENT: "جزوه به‌صورت حضوری تحویل داده شد.",
};

export const COMMERCE_OPS_NEXT_ACTION_LABELS: Partial<
  Record<CommerceOpsStageValue, string>
> = {
  REGISTERED: "ثبت پرداخت",
  PAID: "ثبت در حال تولید",
  IN_PRODUCTION: "ثبت آماده تحویل",
  READY_FOR_PICKUP: "ثبت تحویل به دانش‌آموز",
};

const STAGE_INDEX: Record<CommerceOpsStageValue, number> = {
  REGISTERED: 0,
  PAID: 1,
  IN_PRODUCTION: 2,
  READY_FOR_PICKUP: 3,
  DELIVERED_TO_STUDENT: 4,
};

export function isCommerceOpsStage(
  value: string | null | undefined,
): value is CommerceOpsStageValue {
  return (
    typeof value === "string" &&
    (COMMERCE_OPS_STAGES as readonly string[]).includes(value)
  );
}

export function commerceOpsStageIndex(stage: CommerceOpsStageValue): number {
  return STAGE_INDEX[stage];
}

export function nextCommerceOpsStage(
  current: CommerceOpsStageValue,
): CommerceOpsStageValue | null {
  const index = STAGE_INDEX[current];
  return COMMERCE_OPS_STAGES[index + 1] ?? null;
}

export function previousCommerceOpsStage(
  current: CommerceOpsStageValue,
): CommerceOpsStageValue | null {
  const index = STAGE_INDEX[current];
  if (index <= 0) return null;
  return COMMERCE_OPS_STAGES[index - 1] ?? null;
}

export function commerceOpsNextActionLabel(
  current: CommerceOpsStageValue,
): string | null {
  const next = nextCommerceOpsStage(current);
  if (!next) return null;
  return COMMERCE_OPS_NEXT_ACTION_LABELS[current] ?? `ثبت ${COMMERCE_OPS_STAGE_LABELS[next]}`;
}

/** Last-activity copy for a completed or current node. */
export const COMMERCE_OPS_ACTIVITY_TITLES: Record<CommerceOpsStageValue, string> =
  {
    REGISTERED: "سفارش ایجاد شد",
    PAID: "پرداخت ثبت شد",
    IN_PRODUCTION: "ورود به تولید",
    READY_FOR_PICKUP: "تحویل به مسئول کتاب",
    DELIVERED_TO_STUDENT: "تحویل انجام شد",
  };

export type SyncedCommerceLifecycle = {
  status: "DRAFT" | "AWAITING_PAYMENT" | "PAID" | "FULFILLING" | "COMPLETED";
  fulfillmentStatus: "AWAITING_PICKUP" | "DELIVERED" | null;
};

/**
 * Keep legacy CommerceOrderStatus / fulfillment columns aligned with opsStage
 * so existing payment APIs and exports stay valid.
 */
export function syncedLifecycleForOpsStage(
  stage: CommerceOpsStageValue,
  paymentPaid: boolean,
): SyncedCommerceLifecycle {
  if (stage === "DELIVERED_TO_STUDENT") {
    return { status: "COMPLETED", fulfillmentStatus: "DELIVERED" };
  }
  if (stage === "READY_FOR_PICKUP") {
    return { status: "FULFILLING", fulfillmentStatus: "AWAITING_PICKUP" };
  }
  if (stage === "IN_PRODUCTION") {
    return { status: "FULFILLING", fulfillmentStatus: "AWAITING_PICKUP" };
  }
  if (stage === "PAID" || paymentPaid) {
    return { status: "PAID", fulfillmentStatus: "AWAITING_PICKUP" };
  }
  return { status: "AWAITING_PAYMENT", fulfillmentStatus: null };
}

export function canAdvanceCommerceOpsStage(params: {
  current: CommerceOpsStageValue;
  paymentPaid: boolean;
}): { ok: true; next: CommerceOpsStageValue } | { ok: false; error: string } {
  const next = nextCommerceOpsStage(params.current);
  if (!next) {
    return { ok: false, error: "این سفارش در آخرین مرحله است." };
  }
  if (params.current === "REGISTERED" && !params.paymentPaid) {
    return {
      ok: false,
      error: "تا پیش از ثبت پرداخت نمی‌توان مرحله را جلو برد.",
    };
  }
  if (next !== "PAID" && !params.paymentPaid && params.current !== "PAID") {
    return {
      ok: false,
      error: "فقط سفارش‌های پرداخت‌شده قابل پیشروی هستند.",
    };
  }
  return { ok: true, next };
}

export function canRollbackCommerceOpsStage(params: {
  current: CommerceOpsStageValue;
  paymentPaid: boolean;
}): { ok: true; previous: CommerceOpsStageValue } | { ok: false; error: string } {
  const previous = previousCommerceOpsStage(params.current);
  if (!previous) {
    return { ok: false, error: "مرحله‌ای برای بازگشت وجود ندارد." };
  }
  if (previous === "REGISTERED" && params.paymentPaid) {
    return {
      ok: false,
      error: "پس از پرداخت ثبت‌شده نمی‌توان به مرحله ثبت سفارش بازگشت.",
    };
  }
  return { ok: true, previous };
}
