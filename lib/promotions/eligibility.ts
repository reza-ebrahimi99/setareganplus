/**
 * Eligibility checks for Promotion Engine candidates.
 */

import type { PromotionCandidate } from "@/lib/promotions/types";

export type EligibilityRejectReason =
  | "inactive"
  | "expired"
  | "not_started"
  | "usage_limit"
  | "per_national_limit"
  | "flow_mismatch"
  | "catalog_mismatch"
  | "min_amount"
  | "self_usage"
  | "stack_blocked"
  | "zero_discount";

export function isPromotionWindowOpen(
  promo: Pick<PromotionCandidate, "startsAt" | "endsAt">,
  now: Date,
): { ok: true } | { ok: false; reason: "not_started" | "expired" } {
  if (promo.startsAt && now < promo.startsAt) {
    return { ok: false, reason: "not_started" };
  }
  if (promo.endsAt && now > promo.endsAt) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

export function evaluatePromotionEligibility(params: {
  promo: PromotionCandidate;
  now: Date;
  registrationFlowId: string | null;
  catalogKey?: string | null;
  currentAmountRials?: number;
  nationalCode?: string | null;
  nationalCodeUsageCount?: number;
  blockedTypes: Set<string>;
}): { ok: true } | { ok: false; reason: EligibilityRejectReason } {
  const { promo, now } = params;
  const rules = promo.rules ?? {};

  if (!promo.isActive) return { ok: false, reason: "inactive" };

  const window = isPromotionWindowOpen(promo, now);
  if (!window.ok) return window;

  if (
    promo.usageLimit != null &&
    promo.usageCount >= promo.usageLimit
  ) {
    return { ok: false, reason: "usage_limit" };
  }

  if (
    promo.usagePerNationalCode != null &&
    promo.usagePerNationalCode > 0 &&
    (params.nationalCodeUsageCount ?? 0) >= promo.usagePerNationalCode
  ) {
    return { ok: false, reason: "per_national_limit" };
  }

  const allowedFlowIds = [
    ...(promo.registrationFlowId ? [promo.registrationFlowId] : []),
    ...(rules.allowedFlowIds ?? []),
  ];
  if (
    allowedFlowIds.length > 0 &&
    params.registrationFlowId &&
    !allowedFlowIds.includes(params.registrationFlowId)
  ) {
    return { ok: false, reason: "flow_mismatch" };
  }

  if (
    rules.allowedCatalogKeys &&
    rules.allowedCatalogKeys.length > 0 &&
    params.catalogKey &&
    !rules.allowedCatalogKeys.includes(params.catalogKey)
  ) {
    return { ok: false, reason: "catalog_mismatch" };
  }

  if (
    rules.minAmountRials != null &&
    params.currentAmountRials != null &&
    params.currentAmountRials < rules.minAmountRials
  ) {
    return { ok: false, reason: "min_amount" };
  }

  const national = (params.nationalCode ?? "").trim();
  if (
    national &&
    rules.blockedNationalCodes &&
    rules.blockedNationalCodes.includes(national)
  ) {
    return { ok: false, reason: "self_usage" };
  }

  if (params.blockedTypes.has(promo.type)) {
    return { ok: false, reason: "stack_blocked" };
  }

  return { ok: true };
}

export function eligibilityMessage(reason: EligibilityRejectReason): string {
  switch (reason) {
    case "inactive":
      return "این تخفیف غیرفعال است.";
    case "expired":
      return "مهلت این تخفیف به پایان رسیده است.";
    case "not_started":
      return "این تخفیف هنوز شروع نشده است.";
    case "usage_limit":
      return "سقف استفاده از این تخفیف تکمیل شده است.";
    case "per_national_limit":
      return "سقف استفاده این کد برای کد ملی شما تکمیل شده است.";
    case "flow_mismatch":
      return "این کد برای این جریان ثبت‌نام معتبر نیست.";
    case "catalog_mismatch":
      return "این کد برای این کاتالوگ ثبت‌نام معتبر نیست.";
    case "min_amount":
      return "مبلغ سفارش کمتر از حداقل لازم برای این تخفیف است.";
    case "self_usage":
      return "استفاده از کد معرف برای خودتان مجاز نیست.";
    case "stack_blocked":
      return "این تخفیف با تخفیف‌های فعلی قابل ترکیب نیست.";
    case "zero_discount":
      return "مبلغ تخفیف قابل اعمال نیست.";
    default:
      return "کد تخفیف معتبر نیست.";
  }
}
