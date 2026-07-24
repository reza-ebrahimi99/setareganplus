/**
 * Preview / validate a redeem code against current base amount + timed sale.
 */

import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { applyPromotionEngine } from "@/lib/promotions/engine";
import {
  countNationalCodeUsages,
  findPromotionByCode,
  loadPromotionCandidates,
} from "@/lib/promotions/load";
import {
  eligibilityMessage,
  evaluatePromotionEligibility,
} from "@/lib/promotions/eligibility";
import { ensureRegistrationFlowConfig } from "@/lib/registration/flow-config-db";
import { resolveRegistrationCatalog } from "@/lib/registration/flows/resolve-catalog";
import type { DetailsStepInput } from "@/lib/registration/types";

export type PreviewPromotionResult =
  | {
      ok: true;
      title: string;
      type: string;
      code: string;
      discountAmountRials: number;
      amountRials: number;
      finalAmountRials: number;
      appliedTitles: string[];
    }
  | { ok: false; error: string };

export async function previewRegistrationPromotionCode(params: {
  flowKey: string;
  details: DetailsStepInput;
  redeemCode: string;
  nationalCode?: string | null;
}): Promise<PreviewPromotionResult> {
  const code = params.redeemCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "کد تخفیف یا معرف را وارد کنید." };
  }

  const organization = await getCurrentOrganization();
  try {
    const { ensureLegacyCatalogPromotions } = await import(
      "@/lib/promotions/legacy"
    );
    await ensureLegacyCatalogPromotions(organization.id);
  } catch {
    /* non-blocking */
  }

  const catalog = await resolveRegistrationCatalog(params.flowKey);
  if (!catalog) return { ok: false, error: "جریان ثبت‌نام یافت نشد." };

  const promo = await findPromotionByCode({
    organizationId: organization.id,
    code,
  });
  if (!promo) {
    return { ok: false, error: "کد تخفیف یا معرف معتبر نیست." };
  }

  const flow = await ensureRegistrationFlowConfig({
    organizationId: organization.id,
    flowKey: catalog.flowKey,
  });

  const amountRials =
    flow.settings.packagePricing[params.details.packageKey]?.baseAmountRials ??
    flow.baseAmountRials ??
    catalog.packages.find((p) => p.key === params.details.packageKey)
      ?.amountRials ??
    0;

  const candidates = await loadPromotionCandidates({
    organizationId: organization.id,
    registrationFlowId: flow.id,
    redeemCode: code,
  });

  const usageMap = await countNationalCodeUsages({
    organizationId: organization.id,
    nationalCode: params.nationalCode?.trim() || null,
    promotionIds: candidates.map((c) => c.id),
  });

  const eligibility = evaluatePromotionEligibility({
    promo,
    now: new Date(),
    registrationFlowId: flow.id,
    nationalCodeUsageCount: usageMap[promo.id] ?? 0,
    blockedTypes: new Set(),
  });
  if (!eligibility.ok) {
    return { ok: false, error: eligibilityMessage(eligibility.reason) };
  }

  const engine = applyPromotionEngine({
    amountRials,
    candidates,
    redeemCode: code,
    registrationFlowId: flow.id,
    nationalCodeUsageByPromotionId: usageMap,
    timedFields: {
      paymentAmountRials: amountRials,
      saleAmountRials:
        flow.settings.packagePricing[params.details.packageKey]
          ?.saleAmountRials ?? flow.saleAmountRials,
      discountStartsAt: flow.discountStartsAt,
      discountEndsAt: flow.discountEndsAt,
      pricingBadge: flow.pricingBadge,
      showDiscountCountdown: flow.showDiscountCountdown,
      isFree: flow.isFree,
    },
  });

  const matched = engine.applied.find(
    (line) => line.code?.toUpperCase() === code,
  );
  if (!matched) {
    return {
      ok: false,
      error: "این کد با شرایط فعلی ثبت‌نام قابل اعمال نیست.",
    };
  }

  return {
    ok: true,
    title: matched.title,
    type: matched.type,
    code,
    discountAmountRials: engine.discountRials,
    amountRials: engine.amountRials,
    finalAmountRials: engine.finalAmountRials,
    appliedTitles: engine.applied.map((a) => a.title),
  };
}
