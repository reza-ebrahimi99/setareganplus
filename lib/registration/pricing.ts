/**
 * Server-authoritative registration pricing.
 * Client may preview; createRegistration always re-resolves with DB flow config + now.
 */

import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import {
  isDiscountWindowActive,
  type RegistrationFlowConfig,
} from "@/lib/registration/flow-config-shared";
import type { DetailsStepInput } from "@/lib/registration/types";

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
};

export type ResolvePricingFailure = { ok: false; error: string };

function trim(value: string): string {
  return value.trim();
}

export function resolveRegistrationPricing(params: {
  flowKey: string;
  details: DetailsStepInput;
  flow: RegistrationFlowConfig | null;
  now?: Date;
}): ResolvedRegistrationPricing | ResolvePricingFailure {
  const catalog = getRegistrationCatalog(params.flowKey);
  if (!catalog) return { ok: false, error: "جریان ثبت‌نام یافت نشد." };

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

  if (!product || !session || !pkg || !venue) {
    return { ok: false, error: "جزئیات ثبت‌نام ناقص است." };
  }

  const now = params.now ?? new Date();
  const flow = params.flow;
  const packageOverride =
    flow?.settings.packagePricing[params.details.packageKey] ?? null;

  const amountRials =
    packageOverride?.baseAmountRials ??
    flow?.baseAmountRials ??
    pkg.amountRials;

  if (!Number.isInteger(amountRials) || amountRials < 0) {
    return { ok: false, error: "مبلغ پایه نامعتبر است." };
  }

  const saleCandidate =
    packageOverride?.saleAmountRials ?? flow?.saleAmountRials ?? null;

  const discountWindowActive =
    flow != null &&
    isDiscountWindowActive(
      {
        discountStartsAt: flow.discountStartsAt,
        discountEndsAt: flow.discountEndsAt,
        saleAmountRials: saleCandidate,
        isFree: flow.isFree,
      },
      now,
    );

  let discountRials = 0;
  let discountCode: string | null = null;
  let discountActive = false;

  if (flow?.isFree) {
    discountRials = amountRials;
    discountActive = true;
  } else if (
    discountWindowActive &&
    saleCandidate != null &&
    saleCandidate <= amountRials
  ) {
    discountRials = amountRials - saleCandidate;
    discountActive = discountRials > 0;
  } else {
    const code = trim(params.details.discountCode).toUpperCase();
    if (code && code in catalog.discountCodes) {
      discountRials = Math.min(catalog.discountCodes[code]!, amountRials);
      discountCode = discountRials > 0 ? code : null;
    }
  }

  const finalAmountRials = Math.max(0, amountRials - discountRials);
  const isFree = Boolean(flow?.isFree) || finalAmountRials === 0;
  const savingsRials = discountRials;
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
    pricingBadge: flow?.pricingBadge ?? null,
    isFree,
    discountActive,
    discountEndsAt: discountActive ? (flow?.discountEndsAt ?? null) : null,
    savingsRials,
    discountPercent,
  };
}
