/**
 * Attribution snapshots (Sprint 2 / 2.6).
 * ATTRIBUTED rows are immutable. PENDING_ATTRIBUTION may complete once.
 */

import type { Prisma } from "@/generated/prisma/client";
import { AttributionSnapshotStatus } from "@/generated/prisma/enums";
import {
  buildAttributionCorrelationId,
  logSnapshotAlreadyExists,
  logSnapshotCreated,
  logSnapshotPendingAttribution,
  logSnapshotPendingRecovered,
} from "@/lib/crm/attribution-observability";
import {
  resolveAttributedUserId,
  resolveDefaultAttributionPolicy,
} from "@/lib/crm/attribution-policy";
import {
  paymentIntentRevenueKey,
  registrationWaivedRevenueKey,
} from "@/lib/crm/attribution-revenue-contract";
import { prisma } from "@/lib/prisma";

export {
  paymentIntentRevenueKey,
  registrationWaivedRevenueKey,
} from "@/lib/crm/attribution-revenue-contract";

export type CreateAttributionSnapshotResult =
  | { created: true; snapshotId: string; status: "ATTRIBUTED" }
  | {
      created: true;
      snapshotId: string;
      status: "PENDING_ATTRIBUTION";
    }
  | {
      created: false;
      snapshotId: string;
      reason: "ALREADY_EXISTS" | "PENDING_RECOVERED";
      status: "ATTRIBUTED" | "PENDING_ATTRIBUTION";
    };

/**
 * Idempotent by (organizationId, revenueKey).
 * Never silently skips: missing lead → PENDING_ATTRIBUTION row.
 * Pending + later lead → one-way completion to ATTRIBUTED.
 */
export async function createAttributionSnapshotForRevenueEvent(params: {
  organizationId: string;
  revenueKey: string;
  leadId: string | null | undefined;
  amountRials: number;
  registrationId?: string | null;
  paymentIntentId?: string | null;
  attributedAt?: Date;
  tx?: Prisma.TransactionClient;
}): Promise<CreateAttributionSnapshotResult> {
  const client = params.tx ?? prisma;
  const leadId = params.leadId ?? null;
  const correlationId = buildAttributionCorrelationId({
    revenueKey: params.revenueKey,
    paymentIntentId: params.paymentIntentId,
    registrationId: params.registrationId,
  });
  const baseLog = {
    organizationId: params.organizationId,
    correlationId,
    revenueKey: params.revenueKey,
    registrationId: params.registrationId,
    paymentIntentId: params.paymentIntentId,
    leadId,
  };

  const existing = await client.attributionSnapshot.findUnique({
    where: {
      organizationId_revenueKey: {
        organizationId: params.organizationId,
        revenueKey: params.revenueKey,
      },
    },
    select: {
      id: true,
      status: true,
      leadId: true,
      attributedUserId: true,
      policyKey: true,
      policyVersion: true,
      policyMode: true,
    },
  });

  if (existing?.status === AttributionSnapshotStatus.ATTRIBUTED) {
    logSnapshotAlreadyExists({
      ...baseLog,
      snapshotId: existing.id,
      policyKey: existing.policyKey,
      policyVersion: existing.policyVersion,
      policyMode: existing.policyMode,
    });
    return {
      created: false,
      snapshotId: existing.id,
      reason: "ALREADY_EXISTS",
      status: "ATTRIBUTED",
    };
  }

  const policy = await resolveDefaultAttributionPolicy({
    organizationId: params.organizationId,
    correlationId,
    revenueKey: params.revenueKey,
    tx: params.tx,
  });
  const attributedAt = params.attributedAt ?? new Date();

  if (
    existing?.status === AttributionSnapshotStatus.PENDING_ATTRIBUTION &&
    leadId
  ) {
    const attributedUserId = await resolveAttributedUserId({
      organizationId: params.organizationId,
      leadId,
      mode: policy.mode,
      tx: params.tx,
    });
    const updated = await client.attributionSnapshot.updateMany({
      where: {
        id: existing.id,
        organizationId: params.organizationId,
        status: AttributionSnapshotStatus.PENDING_ATTRIBUTION,
      },
      data: {
        status: AttributionSnapshotStatus.ATTRIBUTED,
        leadId,
        attributedUserId,
        attributedAt,
        policyId: policy.id,
        policyKey: policy.policyKey,
        policyVersion: policy.version,
        policyMode: policy.mode,
      },
    });
    if (updated.count === 1) {
      logSnapshotPendingRecovered({
        ...baseLog,
        snapshotId: existing.id,
        leadId,
        policyKey: policy.policyKey,
        policyVersion: policy.version,
        policyMode: policy.mode,
      });
      return {
        created: false,
        snapshotId: existing.id,
        reason: "PENDING_RECOVERED",
        status: "ATTRIBUTED",
      };
    }
    logSnapshotAlreadyExists({
      ...baseLog,
      snapshotId: existing.id,
      policyKey: policy.policyKey,
      policyVersion: policy.version,
      policyMode: policy.mode,
    });
    return {
      created: false,
      snapshotId: existing.id,
      reason: "ALREADY_EXISTS",
      status: "ATTRIBUTED",
    };
  }

  if (existing?.status === AttributionSnapshotStatus.PENDING_ATTRIBUTION) {
    logSnapshotAlreadyExists({
      ...baseLog,
      snapshotId: existing.id,
      policyKey: existing.policyKey,
      policyVersion: existing.policyVersion,
      policyMode: existing.policyMode,
    });
    return {
      created: false,
      snapshotId: existing.id,
      reason: "ALREADY_EXISTS",
      status: "PENDING_ATTRIBUTION",
    };
  }

  const status = leadId
    ? AttributionSnapshotStatus.ATTRIBUTED
    : AttributionSnapshotStatus.PENDING_ATTRIBUTION;

  const attributedUserId = leadId
    ? await resolveAttributedUserId({
        organizationId: params.organizationId,
        leadId,
        mode: policy.mode,
        tx: params.tx,
      })
    : null;

  try {
    const snapshot = await client.attributionSnapshot.create({
      data: {
        organizationId: params.organizationId,
        revenueKey: params.revenueKey,
        status,
        leadId,
        registrationId: params.registrationId ?? null,
        paymentIntentId: params.paymentIntentId ?? null,
        amountRials: Math.max(0, Math.trunc(params.amountRials)),
        attributedUserId,
        attributedAt,
        policyId: policy.id,
        policyKey: policy.policyKey,
        policyVersion: policy.version,
        policyMode: policy.mode,
      },
      select: { id: true },
    });

    const logPayload = {
      ...baseLog,
      snapshotId: snapshot.id,
      policyKey: policy.policyKey,
      policyVersion: policy.version,
      policyMode: policy.mode,
    };
    if (status === AttributionSnapshotStatus.PENDING_ATTRIBUTION) {
      logSnapshotPendingAttribution(logPayload);
      return {
        created: true,
        snapshotId: snapshot.id,
        status: "PENDING_ATTRIBUTION",
      };
    }
    logSnapshotCreated(logPayload);
    return {
      created: true,
      snapshotId: snapshot.id,
      status: "ATTRIBUTED",
    };
  } catch {
    const raced = await client.attributionSnapshot.findUnique({
      where: {
        organizationId_revenueKey: {
          organizationId: params.organizationId,
          revenueKey: params.revenueKey,
        },
      },
      select: { id: true, status: true },
    });
    if (raced) {
      if (
        raced.status === AttributionSnapshotStatus.PENDING_ATTRIBUTION &&
        leadId
      ) {
        return createAttributionSnapshotForRevenueEvent(params);
      }
      logSnapshotAlreadyExists({
        ...baseLog,
        snapshotId: raced.id,
        policyKey: policy.policyKey,
        policyVersion: policy.version,
        policyMode: policy.mode,
      });
      return {
        created: false,
        snapshotId: raced.id,
        reason: "ALREADY_EXISTS",
        status:
          raced.status === AttributionSnapshotStatus.PENDING_ATTRIBUTION
            ? "PENDING_ATTRIBUTION"
            : "ATTRIBUTED",
      };
    }
    throw new Error("ATTRIBUTION_SNAPSHOT_CREATE_FAILED");
  }
}

/**
 * After a registration gains a leadId, complete any pending snapshots for it.
 */
export async function recoverPendingAttributionForRegistration(params: {
  organizationId: string;
  registrationId: string;
  leadId: string;
  tx?: Prisma.TransactionClient;
}): Promise<number> {
  const client = params.tx ?? prisma;
  const pending = await client.attributionSnapshot.findMany({
    where: {
      organizationId: params.organizationId,
      registrationId: params.registrationId,
      status: AttributionSnapshotStatus.PENDING_ATTRIBUTION,
    },
    select: {
      revenueKey: true,
      amountRials: true,
      paymentIntentId: true,
      attributedAt: true,
    },
  });

  let recovered = 0;
  for (const row of pending) {
    const result = await createAttributionSnapshotForRevenueEvent({
      organizationId: params.organizationId,
      revenueKey: row.revenueKey,
      leadId: params.leadId,
      amountRials: row.amountRials,
      registrationId: params.registrationId,
      paymentIntentId: row.paymentIntentId,
      attributedAt: row.attributedAt,
      tx: params.tx,
    });
    if (result.status === "ATTRIBUTED") {
      recovered += 1;
    }
  }
  return recovered;
}
