/**
 * Client-safe RegistrationFlow commercial config types + pure helpers.
 * DB access lives in flow-config-db.ts.
 */

import type {
  RegistrationFlowLifecycle,
  RegistrationFlowPaymentMode,
  RegistrationProductType,
} from "@/generated/prisma/enums";
import {
  isTimedDiscountWindowActive,
  resolveTimedDiscountPricing,
} from "@/lib/registration/timed-discount";

export type RegistrationFlowPackagePricing = {
  baseAmountRials?: number;
  saleAmountRials?: number;
};

export type RegistrationFlowSettings = {
  packagePricing: Record<string, RegistrationFlowPackagePricing>;
};

export type RegistrationFlowConfig = {
  id: string;
  organizationId: string;
  /** Catalog / public key — stored as RegistrationFlow.slug */
  flowKey: string;
  title: string;
  subtitle: string | null;
  productType: RegistrationProductType;
  isActive: boolean;
  baseAmountRials: number | null;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  isFree: boolean;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  showDiscountCountdown: boolean;
  registrationStartsAt: Date | null;
  registrationEndsAt: Date | null;
  capacity: number | null;
  bookedCount: number;
  showRemainingCapacity: boolean;
  confirmationSmsEnabled: boolean;
  adminNotificationSmsEnabled: boolean;
  smsTemplateCode: string | null;
  adminSmsRecipients: string[];
  settings: RegistrationFlowSettings;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRegistrationFlowSettings(
  raw: unknown,
): RegistrationFlowSettings {
  if (!isRecord(raw)) {
    return { packagePricing: {} };
  }
  const packagePricing: Record<string, RegistrationFlowPackagePricing> = {};
  if (isRecord(raw.packagePricing)) {
    for (const [key, value] of Object.entries(raw.packagePricing)) {
      if (!isRecord(value)) continue;
      const entry: RegistrationFlowPackagePricing = {};
      if (
        typeof value.baseAmountRials === "number" &&
        Number.isInteger(value.baseAmountRials) &&
        value.baseAmountRials >= 0
      ) {
        entry.baseAmountRials = value.baseAmountRials;
      }
      if (
        typeof value.saleAmountRials === "number" &&
        Number.isInteger(value.saleAmountRials) &&
        value.saleAmountRials >= 0
      ) {
        entry.saleAmountRials = value.saleAmountRials;
      }
      if (entry.baseAmountRials != null || entry.saleAmountRials != null) {
        packagePricing[key] = entry;
      }
    }
  }
  return { packagePricing };
}

export function parseAdminSmsRecipients(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function remainingCapacity(flow: RegistrationFlowConfig): number | null {
  if (flow.capacity == null) return null;
  return Math.max(0, flow.capacity - flow.bookedCount);
}

export function isRegistrationWindowOpen(
  flow: RegistrationFlowConfig,
  now = new Date(),
):
  | { open: true }
  | { open: false; reason: "not_started" | "ended" | "inactive" } {
  if (!flow.isActive) return { open: false, reason: "inactive" };
  if (flow.registrationStartsAt && now < flow.registrationStartsAt) {
    return { open: false, reason: "not_started" };
  }
  if (flow.registrationEndsAt && now > flow.registrationEndsAt) {
    return { open: false, reason: "ended" };
  }
  return { open: true };
}

export function isDiscountWindowActive(
  flow: Pick<
    RegistrationFlowConfig,
    "discountStartsAt" | "discountEndsAt" | "saleAmountRials" | "isFree"
  >,
  now = new Date(),
): boolean {
  return isTimedDiscountWindowActive(flow, now);
}

export type RegistrationFlowPublicView = {
  flowKey: string;
  title: string;
  subtitle: string | null;
  baseAmountRials: number | null;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  isFree: boolean;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  showDiscountCountdown: boolean;
  registrationStartsAt: string | null;
  registrationEndsAt: string | null;
  capacity: number | null;
  remainingCapacity: number | null;
  showRemainingCapacity: boolean;
  window:
    | { open: true }
    | { open: false; reason: "not_started" | "ended" | "inactive" };
  discountActive: boolean;
};

export function toRegistrationFlowPublicView(
  flow: RegistrationFlowConfig,
  now = new Date(),
): RegistrationFlowPublicView {
  const remaining = remainingCapacity(flow);
  const timed = resolveTimedDiscountPricing(
    {
      paymentAmountRials: flow.baseAmountRials ?? 0,
      saleAmountRials: flow.saleAmountRials,
      discountStartsAt: flow.discountStartsAt,
      discountEndsAt: flow.discountEndsAt,
      pricingBadge: flow.pricingBadge,
      showDiscountCountdown: flow.showDiscountCountdown,
      isFree: flow.isFree,
    },
    now,
  );
  return {
    flowKey: flow.flowKey,
    title: flow.title,
    subtitle: flow.subtitle,
    baseAmountRials: flow.baseAmountRials,
    saleAmountRials: flow.saleAmountRials,
    pricingBadge: timed.pricingBadge,
    isFree: flow.isFree,
    discountStartsAt: flow.discountStartsAt?.toISOString() ?? null,
    discountEndsAt: flow.discountEndsAt?.toISOString() ?? null,
    showDiscountCountdown: flow.showDiscountCountdown,
    registrationStartsAt: flow.registrationStartsAt?.toISOString() ?? null,
    registrationEndsAt: flow.registrationEndsAt?.toISOString() ?? null,
    capacity: flow.capacity,
    remainingCapacity: remaining,
    showRemainingCapacity: flow.showRemainingCapacity,
    window: isRegistrationWindowOpen(flow, now),
    discountActive: timed.discountActive,
  };
}

/** Serializable snapshot for client wizard (Dates → ISO). */
export type RegistrationFlowSnapshot = Omit<
  RegistrationFlowConfig,
  | "discountStartsAt"
  | "discountEndsAt"
  | "registrationStartsAt"
  | "registrationEndsAt"
> & {
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  registrationStartsAt: string | null;
  registrationEndsAt: string | null;
};

export function serializeRegistrationFlow(
  flow: RegistrationFlowConfig,
): RegistrationFlowSnapshot {
  return {
    ...flow,
    discountStartsAt: flow.discountStartsAt?.toISOString() ?? null,
    discountEndsAt: flow.discountEndsAt?.toISOString() ?? null,
    registrationStartsAt: flow.registrationStartsAt?.toISOString() ?? null,
    registrationEndsAt: flow.registrationEndsAt?.toISOString() ?? null,
  };
}

export function hydrateRegistrationFlow(
  snapshot: RegistrationFlowSnapshot,
): RegistrationFlowConfig {
  return {
    ...snapshot,
    discountStartsAt: snapshot.discountStartsAt
      ? new Date(snapshot.discountStartsAt)
      : null,
    discountEndsAt: snapshot.discountEndsAt
      ? new Date(snapshot.discountEndsAt)
      : null,
    registrationStartsAt: snapshot.registrationStartsAt
      ? new Date(snapshot.registrationStartsAt)
      : null,
    registrationEndsAt: snapshot.registrationEndsAt
      ? new Date(snapshot.registrationEndsAt)
      : null,
  };
}

/** Used by server mapper; kept here so parse helpers stay co-located. */
export type RegistrationFlowRowLike = {
  id: string;
  organizationId: string;
  slug: string;
  title: string;
  description: string;
  productType: RegistrationProductType;
  lifecycle: RegistrationFlowLifecycle;
  paymentMode: RegistrationFlowPaymentMode;
  paymentAmountRials: number;
  saleAmountRials: number | null;
  pricingBadge: string | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  showDiscountCountdown: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  capacity: number | null;
  showRemainingCapacity: boolean;
  confirmationSmsEnabled: boolean;
  adminNotificationSmsEnabled: boolean;
  smsTemplateCode: string | null;
  adminSmsRecipients: unknown;
  metadata: unknown;
  _count?: { registrations: number };
};
