/**
 * Server-authoritative registration pricing via Promotion Engine.
 * Must not be imported from Client Components (pulls Prisma).
 */

import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { applyPromotionEngine } from "@/lib/promotions/engine";
import {
  countNationalCodeUsages,
  loadPromotionCandidates,
} from "@/lib/promotions/load";
import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import type { RegistrationFlowConfig } from "@/lib/registration/flow-config-shared";
import type {
  ResolvedRegistrationPricing,
  ResolvePricingFailure,
} from "@/lib/registration/pricing";
import type {
  DetailsStepInput,
  RegistrationFlowCatalog,
} from "@/lib/registration/types";

function trim(value: string): string {
  return value.trim();
}

function resolveCatalogSelections(params: {
  flowKey: string;
  details: DetailsStepInput;
  catalog?: RegistrationFlowCatalog | null;
}) {
  const catalog =
    params.catalog ?? getRegistrationCatalog(params.flowKey);
  if (!catalog) return null;

  const product = catalog.products.find(
    (item) => item.key === params.details.productKey,
  );
  const session = catalog.sessions.find(
    (item) => item.key === params.details.sessionKey,
  );
  const pkg = catalog.packages.find(
    (item) => item.key === params.details.packageKey,
  );
  const venue = catalog.venueBranches.find(
    (item) => item.key === params.details.venueBranchKey,
  );

  if (!product || !session || !pkg || !venue) return null;
  return { catalog, product, session, pkg, venue };
}

function resolveBaseAmountRials(params: {
  flow: RegistrationFlowConfig | null;
  packageKey: string;
  catalogPackageAmount: number;
}): number {
  const packageOverride =
    params.flow?.settings.packagePricing[params.packageKey] ?? null;
  return (
    packageOverride?.baseAmountRials ??
    params.flow?.baseAmountRials ??
    params.catalogPackageAmount
  );
}

/**
 * Full server pricing with Promotion Engine (TIMED → COUPON → REFERRAL → VIP).
 */
export async function resolveRegistrationPricingAsync(params: {
  flowKey: string;
  details: DetailsStepInput;
  flow: RegistrationFlowConfig | null;
  now?: Date;
  catalog?: RegistrationFlowCatalog | null;
  organizationId?: string;
  nationalCode?: string | null;
}): Promise<ResolvedRegistrationPricing | ResolvePricingFailure> {
  const selected = resolveCatalogSelections(params);
  if (!selected) {
    return { ok: false, error: "جزئیات ثبت‌نام ناقص است." };
  }
  const { product, session, pkg, venue } = selected;
  const now = params.now ?? new Date();
  const flow = params.flow;

  const amountRials = resolveBaseAmountRials({
    flow,
    packageKey: params.details.packageKey,
    catalogPackageAmount: pkg.amountRials,
  });

  if (!Number.isInteger(amountRials) || amountRials < 0) {
    return { ok: false, error: "مبلغ پایه نامعتبر است." };
  }

  if (flow?.isFree) {
    return {
      ok: true,
      amountRials,
      discountRials: amountRials,
      finalAmountRials: 0,
      productTitle: product.title,
      sessionTitle: session.title,
      packageTitle: pkg.title,
      venueBranchTitle: venue.title,
      discountCode: null,
      pricingBadge: null,
      isFree: true,
      discountActive: false,
      discountEndsAt: null,
      savingsRials: amountRials,
      discountPercent: amountRials > 0 ? 100 : null,
      appliedPromotions: [],
      referralPromotionId: null,
      referralOwnerStaffId: null,
    };
  }

  const organizationId =
    params.organizationId ?? (await getCurrentOrganization()).id;

  const packageOverride =
    flow?.settings.packagePricing[params.details.packageKey] ?? null;
  const redeemCode = trim(params.details.discountCode).toUpperCase() || null;

  const candidates = await loadPromotionCandidates({
    organizationId,
    registrationFlowId: flow?.id ?? null,
    redeemCode,
  });

  const usageMap = await countNationalCodeUsages({
    organizationId,
    nationalCode: params.nationalCode?.trim() || null,
    promotionIds: candidates.map((c) => c.id),
  });

  const engine = applyPromotionEngine({
    amountRials,
    candidates,
    redeemCode,
    registrationFlowId: flow?.id ?? null,
    now,
    nationalCodeUsageByPromotionId: usageMap,
    timedFields: flow
      ? {
          paymentAmountRials: amountRials,
          saleAmountRials:
            packageOverride?.saleAmountRials ?? flow.saleAmountRials,
          discountStartsAt: flow.discountStartsAt,
          discountEndsAt: flow.discountEndsAt,
          pricingBadge: flow.pricingBadge,
          showDiscountCountdown: flow.showDiscountCountdown,
          isFree: false,
        }
      : null,
  });

  let discountRials = engine.discountRials;
  let finalAmountRials = engine.finalAmountRials;
  let discountCode = engine.discountCode;
  const applied = [...engine.applied];

  const discountPercent =
    amountRials > 0 && discountRials > 0
      ? Math.round((discountRials / amountRials) * 100)
      : null;

  return {
    ok: true,
    amountRials,
    discountRials,
    finalAmountRials,
    productTitle: product.title,
    sessionTitle: session.title,
    packageTitle: pkg.title,
    venueBranchTitle: venue.title,
    discountCode,
    pricingBadge: engine.pricingBadge,
    isFree: finalAmountRials === 0,
    discountActive: discountRials > 0,
    discountEndsAt: engine.discountEndsAt,
    savingsRials: discountRials,
    discountPercent,
    appliedPromotions: applied,
    referralPromotionId: engine.referralPromotionId,
    referralOwnerStaffId: engine.referralOwnerStaffId,
  };
}
