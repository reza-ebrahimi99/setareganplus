/**
 * AttributionSnapshot loader for KPI — always applies revenue contract for financial KPIs.
 */

import { AttributionSnapshotStatus } from "@/generated/prisma/enums";
import { selectCanonicalSnapshotsForKpi } from "@/lib/crm/attribution-revenue-contract";
import { prisma } from "@/lib/prisma";

export type KpiSnapshotRow = {
  id: string;
  revenueKey: string;
  registrationId: string | null;
  amountRials: number;
  status: "PENDING_ATTRIBUTION" | "ATTRIBUTED";
  attributedAt: Date;
  attributedUserId: string | null;
  leadId: string | null;
  branchId: string | null;
};

export async function loadAttributedSnapshots(params: {
  organizationId: string;
  from: Date;
  to: Date;
  branchIds?: readonly string[];
}): Promise<KpiSnapshotRow[]> {
  const rows = await prisma.attributionSnapshot.findMany({
    where: {
      organizationId: params.organizationId,
      status: AttributionSnapshotStatus.ATTRIBUTED,
      attributedAt: { gte: params.from, lte: params.to },
      ...(params.branchIds
        ? {
            OR: [
              { leadId: null },
              { lead: { branchId: { in: [...params.branchIds] } } },
            ],
          }
        : {}),
    },
    take: 50_000,
    select: {
      id: true,
      revenueKey: true,
      registrationId: true,
      amountRials: true,
      status: true,
      attributedAt: true,
      attributedUserId: true,
      leadId: true,
      lead: { select: { branchId: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    revenueKey: row.revenueKey,
    registrationId: row.registrationId,
    amountRials: row.amountRials,
    status: row.status,
    attributedAt: row.attributedAt,
    attributedUserId: row.attributedUserId,
    leadId: row.leadId,
    branchId: row.lead?.branchId ?? null,
  }));
}

export async function loadCanonicalSnapshotsForKpi(params: {
  organizationId: string;
  from: Date;
  to: Date;
  branchIds?: readonly string[];
}): Promise<KpiSnapshotRow[]> {
  const attributed = await loadAttributedSnapshots(params);
  return selectCanonicalSnapshotsForKpi(attributed);
}

export async function loadPendingSnapshots(params: {
  organizationId: string;
  from: Date;
  to: Date;
  branchIds?: readonly string[];
}): Promise<KpiSnapshotRow[]> {
  const rows = await prisma.attributionSnapshot.findMany({
    where: {
      organizationId: params.organizationId,
      status: AttributionSnapshotStatus.PENDING_ATTRIBUTION,
      attributedAt: { gte: params.from, lte: params.to },
      ...(params.branchIds
        ? {
            OR: [
              { leadId: null },
              { lead: { branchId: { in: [...params.branchIds] } } },
            ],
          }
        : {}),
    },
    take: 50_000,
    select: {
      id: true,
      revenueKey: true,
      registrationId: true,
      amountRials: true,
      status: true,
      attributedAt: true,
      attributedUserId: true,
      leadId: true,
      lead: { select: { branchId: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    revenueKey: row.revenueKey,
    registrationId: row.registrationId,
    amountRials: row.amountRials,
    status: row.status,
    attributedAt: row.attributedAt,
    attributedUserId: row.attributedUserId,
    leadId: row.leadId,
    branchId: row.lead?.branchId ?? null,
  }));
}
