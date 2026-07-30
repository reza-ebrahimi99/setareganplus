/**
 * Canonical revenue-event contract for Admissions CRM v2 attribution.
 * KPI consumers MUST use helpers here — never sum raw snapshots blindly.
 *
 * See docs/architecture/admissions-crm-v2/05-revenue-attribution-contract.md
 */

import { RegistrationFlowPaymentMode } from "@/generated/prisma/enums";

export const REVENUE_KEY_PREFIX = {
  PAYMENT_INTENT: "PAYMENT_INTENT:",
  REGISTRATION_WAIVED: "REGISTRATION_WAIVED:",
} as const;

export type AttributionRevenueKind =
  | "PAYMENT_INTENT"
  | "REGISTRATION_WAIVED"
  | "UNKNOWN";

export function paymentIntentRevenueKey(paymentIntentId: string): string {
  return `${REVENUE_KEY_PREFIX.PAYMENT_INTENT}${paymentIntentId}`;
}

export function registrationWaivedRevenueKey(registrationId: string): string {
  return `${REVENUE_KEY_PREFIX.REGISTRATION_WAIVED}${registrationId}`;
}

export function parseRevenueKeyKind(revenueKey: string): AttributionRevenueKind {
  if (revenueKey.startsWith(REVENUE_KEY_PREFIX.PAYMENT_INTENT)) {
    return "PAYMENT_INTENT";
  }
  if (revenueKey.startsWith(REVENUE_KEY_PREFIX.REGISTRATION_WAIVED)) {
    return "REGISTRATION_WAIVED";
  }
  return "UNKNOWN";
}

/**
 * Terminal waived/free revenue only.
 * OPTIONAL skip must NOT emit REGISTRATION_WAIVED (payment may follow).
 */
export function shouldEmitRegistrationWaivedSnapshot(
  paymentMode: RegistrationFlowPaymentMode | string,
): boolean {
  return paymentMode === RegistrationFlowPaymentMode.FREE;
}

export type CanonicalSnapshotCandidate = {
  id: string;
  revenueKey: string;
  registrationId: string | null;
  amountRials: number;
  status: "PENDING_ATTRIBUTION" | "ATTRIBUTED";
};

/**
 * Per registrationId, keep at most one KPI-countable snapshot:
 * PAYMENT_INTENT (ATTRIBUTED) wins over REGISTRATION_WAIVED.
 * PENDING rows are excluded from KPI totals until ATTRIBUTED.
 */
export function selectCanonicalSnapshotsForKpi<
  T extends CanonicalSnapshotCandidate,
>(snapshots: readonly T[]): T[] {
  const byRegistration = new Map<string, T[]>();
  const withoutRegistration: T[] = [];

  for (const snap of snapshots) {
    if (snap.status !== "ATTRIBUTED") continue;
    if (!snap.registrationId) {
      withoutRegistration.push(snap);
      continue;
    }
    const group = byRegistration.get(snap.registrationId) ?? [];
    group.push(snap);
    byRegistration.set(snap.registrationId, group);
  }

  const selected: T[] = [...withoutRegistration];
  for (const group of byRegistration.values()) {
    const paid = group.find(
      (row) => parseRevenueKeyKind(row.revenueKey) === "PAYMENT_INTENT",
    );
    if (paid) {
      selected.push(paid);
      continue;
    }
    const waived = group.find(
      (row) => parseRevenueKeyKind(row.revenueKey) === "REGISTRATION_WAIVED",
    );
    if (waived) selected.push(waived);
  }
  return selected;
}
