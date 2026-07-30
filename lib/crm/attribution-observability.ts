/**
 * Structured attribution events for ops / KPI forensics.
 */

import { logServerInfo, logServerWarn } from "@/lib/observability/server-log";

export type AttributionCorrelation = {
  organizationId: string;
  correlationId: string;
  revenueKey: string;
  registrationId?: string | null;
  paymentIntentId?: string | null;
  leadId?: string | null;
  snapshotId?: string | null;
  policyKey?: string | null;
  policyVersion?: number | null;
  policyMode?: string | null;
};

function meta(c: AttributionCorrelation) {
  return {
    correlationId: c.correlationId,
    revenueKey: c.revenueKey,
    registrationId: c.registrationId ?? null,
    paymentIntentId: c.paymentIntentId ?? null,
    leadId: c.leadId ?? null,
    policyKey: c.policyKey ?? null,
    policyVersion: c.policyVersion ?? null,
    policyMode: c.policyMode ?? null,
  } as const;
}

export function logPolicyResolved(c: AttributionCorrelation): void {
  logServerInfo({
    module: "attribution",
    action: "PolicyResolved",
    category: "attribution",
    organizationId: c.organizationId,
    recordId: c.snapshotId ?? undefined,
    meta: meta(c),
  });
}

export function logSnapshotCreated(c: AttributionCorrelation): void {
  logServerInfo({
    module: "attribution",
    action: "SnapshotCreated",
    category: "attribution",
    organizationId: c.organizationId,
    recordId: c.snapshotId ?? undefined,
    meta: meta(c),
  });
}

export function logSnapshotAlreadyExists(c: AttributionCorrelation): void {
  logServerInfo({
    module: "attribution",
    action: "SnapshotAlreadyExists",
    category: "attribution",
    organizationId: c.organizationId,
    recordId: c.snapshotId ?? undefined,
    meta: meta(c),
  });
}

export function logSnapshotPendingAttribution(c: AttributionCorrelation): void {
  logServerWarn({
    module: "attribution",
    action: "SnapshotPendingAttribution",
    category: "attribution",
    organizationId: c.organizationId,
    recordId: c.snapshotId ?? undefined,
    message: "Revenue event recorded without lead; pending recovery",
    meta: meta(c),
  });
}

export function logSnapshotPendingRecovered(c: AttributionCorrelation): void {
  logServerInfo({
    module: "attribution",
    action: "SnapshotPendingRecovered",
    category: "attribution",
    organizationId: c.organizationId,
    recordId: c.snapshotId ?? undefined,
    meta: meta(c),
  });
}

export function buildAttributionCorrelationId(params: {
  revenueKey: string;
  paymentIntentId?: string | null;
  registrationId?: string | null;
}): string {
  if (params.paymentIntentId) {
    return `payintent:${params.paymentIntentId}`;
  }
  if (params.registrationId) {
    return `registration:${params.registrationId}:${params.revenueKey}`;
  }
  return `revenue:${params.revenueKey}`;
}
