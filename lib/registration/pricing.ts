/**
 * Sync registration pricing preview (Client + Server safe).
 * Server checkout uses resolveRegistrationPricingAsync in pricing-async.ts.
 */

import type { AppliedPromotionLine } from "@/lib/promotions/types";
import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import type { RegistrationFlowConfig } from "@/lib/registration/flow-config-shared";
import { resolveTimedDiscountPricing } from "@/lib/registration/timed-discount";
import type {
  DetailsStepInput,
  RegistrationFlowCatalog,
} from "@/lib/registration/types";

export type ResolvedRegistrationPricing = {
  ok: true;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  productTitle: string;
  sessionTitle: string;
  packageTitle: string;
  venueBranchTitle: string;
  discountCode: string | null;
  pricingBadge: string | null;
  isFree: boolean;
  discountActive: boolean;
  discountEndsAt: Date | null;
  savingsRials: number;
  discountPercent: number | null;
  appliedPromotions?: AppliedPromotionLine[];
  referralPromotionId?: string | null;
  referralOwnerStaffId?: string | null;
};

export type ResolvePricingFailure = { ok: false; error: string };

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
 * Sync preview (wizard UI): timed discount + legacy catalog coupon map.
 * Does not hit Promotion DB (use resolveRegistrationPricingAsync on server).
 */
export function resolveRegistrationPricing(params: {
  flowKey: string;
  details: DetailsStepInput;
  flow: RegistrationFlowConfig | null;
  now?: Date;
  catalog?: RegistrationFlowCatalog | null;
}): ResolvedRegistrationPricing | ResolvePricingFailure {
  const selected = resolveCatalogSelections(params);
  if (!selected) {
    return { ok: false, error: "جزئیات ثبت‌نام ناقص است." };
  }
  const { product, session, pkg, venue } = selected;

  const now = params.now ?? new Date();
  const flow = params.flow;
  const packageOverride =
    flow?.settings.packagePricing[params.details.packageKey] ?? null;

  const amountRials = resolveBaseAmountRials({
    flow,
    packageKey: params.details.packageKey,
    catalogPackageAmount: pkg.amountRials,
  });

  if (!Number.isInteger(amountRials) || amountRials < 0) {
    return { ok: false, error: "مبلغ پایه نامعتبر است." };
  }

  const saleCandidate =
    packageOverride?.saleAmountRials ?? flow?.saleAmountRials ?? null;
  const isFree = Boolean(flow?.isFree);

  if (isFree) {
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
    };
  }

  const timed = resolveTimedDiscountPricing(
    {
      paymentAmountRials: amountRials,
      saleAmountRials: saleCandidate,
      discountStartsAt: flow?.discountStartsAt ?? null,
      discountEndsAt: flow?.discountEndsAt ?? null,
      pricingBadge: flow?.pricingBadge ?? null,
      showDiscountCountdown: flow?.showDiscountCountdown ?? true,
      isFree: false,
    },
    now,
  );

  return {
    ok: true,
    amountRials,
    discountRials: timed.discountRials,
    finalAmountRials: timed.finalAmountRials,
    productTitle: product.title,
    sessionTitle: session.title,
    packageTitle: pkg.title,
    venueBranchTitle: venue.title,
    discountCode: null,
    pricingBadge: timed.pricingBadge,
    isFree: timed.finalAmountRials === 0,
    discountActive: timed.discountActive,
    discountEndsAt: timed.discountActive
      ? (flow?.discountEndsAt ?? null)
      : null,
    savingsRials: timed.discountRials,
    discountPercent: timed.discountPercent,
    appliedPromotions: [],
  };
}
