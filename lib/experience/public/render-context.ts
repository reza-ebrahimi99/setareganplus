/**
 * Public-safe render context for Experience blocks.
 * Domain values are fetched once per request and passed into renderers —
 * blocks must never query Prisma or trust monetary/capacity fields from config.
 */

import type { ExperienceBindingContext } from "@/lib/experience/binding-context";
import type { PublicRegistrationFlow } from "@/lib/registration/flows/public";
import { getPublicRegistrationWizardPath } from "@/lib/registration/flows/public-url";
import { FLOW_PAYMENT_MODE_LABELS } from "@/lib/registration/flows/constants";
import { publicUrlForStorageKey } from "@/lib/media/storage";

export type ExperiencePublicOrganization = {
  id: string;
};

export type ExperiencePublicPricingResult = {
  paymentMode: PublicRegistrationFlow["paymentMode"];
  paymentLabel: string;
  amountRials: number;
  finalAmountRials: number;
  discountRials: number;
  discountActive: boolean;
  pricingBadge: string | null;
  discountStartsAtIso: string | null;
  discountEndsAtIso: string | null;
  showCountdown: boolean;
  discountPercent: number | null;
  paymentAmountRials: number;
  saleAmountRials: number | null;
  showDiscountCountdown: boolean;
};

/** Landing-visible promotion = timed discount on the flow (codes apply in wizard). */
export type ExperiencePublicPromotionResult = {
  kind: "TIMED_DISCOUNT" | null;
  active: boolean;
  badge: string | null;
  endsAtIso: string | null;
  discountPercent: number | null;
  discountRials: number;
};

export type ExperiencePublicCapacityResult = {
  limit: number | null;
  used: number;
  remaining: number | null;
  isUnlimited: boolean;
  isFull: boolean;
  isUnavailable: boolean;
};

export type ExperiencePublicDeadlineResult = {
  registrationOpensAtIso: string | null;
  registrationClosesAtIso: string | null;
  discountEndsAtIso: string | null;
  /** Preferred countdown target for COUNTDOWN blocks (discount window, else registration close). */
  countdownTargetIso: string | null;
  countdownKind: "DISCOUNT" | "REGISTRATION_CLOSE" | null;
};

export type ExperiencePublicAvailability = {
  isOpen: boolean;
  closedReason: PublicRegistrationFlow["closedReason"];
  canStartRegistration: boolean;
  allowPreview: boolean;
};

export type ExperiencePublicRenderContext = {
  organization: ExperiencePublicOrganization;
  registrationFlow: PublicRegistrationFlow;
  availability: ExperiencePublicAvailability;
  pricing: ExperiencePublicPricingResult;
  promotion: ExperiencePublicPromotionResult;
  capacity: ExperiencePublicCapacityResult;
  deadlines: ExperiencePublicDeadlineResult;
  wizardPath: string;
  /** Wizard path with preserved public query (attribution / preview). */
  wizardHref: string;
  locale: "fa-IR";
  direction: "rtl";
  now: Date;
  mediaPublicUrl: (storageKey: string) => string;
};

export type BuildExperiencePublicRenderContextInput = {
  flow: PublicRegistrationFlow;
  allowPreview?: boolean;
  /** Forwarded search string without leading `?` (e.g. utm_* + preview). */
  wizardQuery?: string | null;
  now?: Date;
};

function appendQuery(path: string, query: string | null | undefined): string {
  const q = query?.trim();
  if (!q) return path;
  const normalized = q.startsWith("?") ? q.slice(1) : q;
  if (!normalized) return path;
  return `${path}?${normalized}`;
}

export function buildExperiencePublicRenderContext(
  input: BuildExperiencePublicRenderContextInput,
): ExperiencePublicRenderContext {
  const flow = input.flow;
  const now = input.now ?? new Date();
  const allowPreview = input.allowPreview === true;
  const canStartRegistration = flow.isOpen || allowPreview;
  const wizardPath = getPublicRegistrationWizardPath(flow.slug);
  const wizardHref = appendQuery(wizardPath, input.wizardQuery);

  const isUnlimited = flow.capacity == null || flow.capacity <= 0;
  const used = flow.registrationCount;
  const remaining = isUnlimited
    ? null
    : Math.max(0, (flow.capacity as number) - used);
  const isFull = flow.closedReason === "full" || (!isUnlimited && remaining === 0);

  const discountEndsAtIso =
    flow.pricing.discountEndsAtIso ??
    (flow.discountEndsAt ? flow.discountEndsAt.toISOString() : null);
  const registrationClosesAtIso = flow.closesAt
    ? flow.closesAt.toISOString()
    : null;

  let countdownTargetIso: string | null = null;
  let countdownKind: ExperiencePublicDeadlineResult["countdownKind"] = null;
  if (flow.pricing.showCountdown && discountEndsAtIso) {
    countdownTargetIso = discountEndsAtIso;
    countdownKind = "DISCOUNT";
  } else if (registrationClosesAtIso) {
    countdownTargetIso = registrationClosesAtIso;
    countdownKind = "REGISTRATION_CLOSE";
  }

  const pricing: ExperiencePublicPricingResult = {
    paymentMode: flow.paymentMode,
    paymentLabel: FLOW_PAYMENT_MODE_LABELS[flow.paymentMode],
    amountRials: flow.pricing.amountRials,
    finalAmountRials: flow.pricing.finalAmountRials,
    discountRials: flow.pricing.discountRials,
    discountActive: flow.pricing.discountActive,
    pricingBadge: flow.pricing.pricingBadge,
    discountStartsAtIso: flow.discountStartsAt
      ? flow.discountStartsAt.toISOString()
      : null,
    discountEndsAtIso,
    showCountdown: flow.pricing.showCountdown,
    discountPercent: flow.pricing.discountPercent,
    paymentAmountRials: flow.paymentAmountRials,
    saleAmountRials: flow.saleAmountRials,
    showDiscountCountdown: flow.showDiscountCountdown,
  };

  const promotion: ExperiencePublicPromotionResult = {
    kind: flow.pricing.discountActive ? "TIMED_DISCOUNT" : null,
    active: flow.pricing.discountActive,
    badge: flow.pricing.pricingBadge,
    endsAtIso: discountEndsAtIso,
    discountPercent: flow.pricing.discountPercent,
    discountRials: flow.pricing.discountRials,
  };

  return {
    organization: { id: flow.organizationId },
    registrationFlow: flow,
    availability: {
      isOpen: flow.isOpen,
      closedReason: flow.closedReason,
      canStartRegistration,
      allowPreview,
    },
    pricing,
    promotion,
    capacity: {
      limit: isUnlimited ? null : flow.capacity,
      used,
      remaining,
      isUnlimited,
      isFull,
      isUnavailable: false,
    },
    deadlines: {
      registrationOpensAtIso: flow.opensAt ? flow.opensAt.toISOString() : null,
      registrationClosesAtIso,
      discountEndsAtIso,
      countdownTargetIso,
      countdownKind,
    },
    wizardPath,
    wizardHref,
    locale: "fa-IR",
    direction: "rtl",
    now,
    mediaPublicUrl: publicUrlForStorageKey,
  };
}

/** Binding slice for supportsBindings blocks — derived from the full context. */
export function bindingFromPublicRenderContext(
  context: ExperiencePublicRenderContext,
): ExperienceBindingContext {
  return {
    flow: context.registrationFlow,
    wizardPath: context.wizardHref,
    canStartRegistration: context.availability.canStartRegistration,
    registrationCount: context.capacity.used,
  };
}
