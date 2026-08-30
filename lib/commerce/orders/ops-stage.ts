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
    READY_FOR_PICKUP: "آماده تحویل",
    DELIVERED_TO_STUDENT: "تحویل شد",
  };

export const COMMERCE_OPS_STAGE_TONES: Record<
  CommerceOpsStageValue | "ROLLBACK",
  string
> = {
  REGISTERED: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  PAID: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  IN_PRODUCTION:
    "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100",
  READY_FOR_PICKUP:
    "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
  DELIVERED_TO_STUDENT:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  ROLLBACK: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
};

export const COMMERCE_OPS_STAGE_DOT: Record<CommerceOpsStageValue, string> = {
  REGISTERED: "bg-slate-400 border-slate-400",
  PAID: "bg-amber-400 border-amber-400",
  IN_PRODUCTION: "bg-orange-500 border-orange-500",
  READY_FOR_PICKUP: "bg-sky-500 border-sky-500",
  DELIVERED_TO_STUDENT: "bg-emerald-500 border-emerald-500",
};

export function commerceLastActivityTone(
  title: string,
  stage: CommerceOpsStageValue,
): CommerceOpsStageValue | "ROLLBACK" {
  if (title.startsWith("بازگشت")) return "ROLLBACK";
  return stage;
}

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
  handoverStaffUserId?: string | null;
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
  if (next !== "PAID" && !params.paymentPaid) {
    return {
      ok: false,
      error: "نمی‌توان سفارش پرداخت‌نشده را تحویل داد یا جلو برد.",
    };
  }
  if (next === "DELIVERED_TO_STUDENT" && !params.handoverStaffUserId?.trim()) {
    return { ok: false, error: "قبل از تحویل، مسئول تحویل را انتخاب کنید." };
  }
  return { ok: true, next };
}

/**
 * Shipping/fulfillment status copy for the public tracking page.
 * Today there is only one delivery method (on-site pickup); branch on
 * `deliveryMethod` here first when courier / shipping-company delivery is
 * added so every caller of this function keeps working unchanged.
 */
export function commerceShippingStatusLabel(params: {
  opsStage: CommerceOpsStageValue;
  deliveryMethod?: string | null;
}): string {
  if (params.opsStage === "DELIVERED_TO_STUDENT") return "تحویل داده شد";
  if (params.opsStage === "READY_FOR_PICKUP") return "آماده تحویل حضوری";
  if (params.opsStage === "IN_PRODUCTION") return "در حال آماده‌سازی";
  return "در انتظار آماده‌سازی";
}

export function canRollbackCommerceOpsStage(params: {
  current: CommerceOpsStageValue;
  paymentPaid: boolean;
  allowDeliveredRollback?: boolean;
}): { ok: true; previous: CommerceOpsStageValue } | { ok: false; error: string } {
  const previous = previousCommerceOpsStage(params.current);
  if (!previous) {
    return { ok: false, error: "مرحله‌ای برای بازگشت وجود ندارد." };
  }
  if (params.current === "DELIVERED_TO_STUDENT" && !params.allowDeliveredRollback) {
    return {
      ok: false,
      error: "بازگشت سفارش تحویل‌شده نیاز به مجوز دارد.",
    };
  }
  if (previous === "REGISTERED" && params.paymentPaid) {
    return {
      ok: false,
      error: "پس از پرداخت ثبت‌شده نمی‌توان به مرحله ثبت سفارش بازگشت.",
    };
  }
  return { ok: true, previous };
}
