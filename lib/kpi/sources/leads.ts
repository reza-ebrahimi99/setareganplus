/**
 * Truth Spine lead loader for KPI (never mutates ownership).
 */

import type { Prisma } from "@/generated/prisma/client";
import { LeadSourceType } from "@/generated/prisma/enums";
import type { KpiLeadScope } from "@/lib/kpi/types";
import { prisma } from "@/lib/prisma";

export type KpiLeadRow = {
  id: string;
  createdAt: Date;
  ownerUserId: string | null;
  branchId: string;
};

function parseSourceType(value: string | undefined): LeadSourceType | undefined {
  if (!value) return undefined;
  return (Object.values(LeadSourceType) as string[]).includes(value)
    ? (value as LeadSourceType)
    : undefined;
}

function leadScopeWhere(scope?: KpiLeadScope): Prisma.LeadWhereInput {
  if (!scope) return {};
  const sourceType = parseSourceType(scope.sourceType);
  return {
    ...(scope.source ? { source: scope.source } : {}),
    ...(sourceType ? { sourceType } : {}),
    ...(scope.stageId ? { stageId: scope.stageId } : {}),
    ...(scope.formId
      ? { formSubmissions: { some: { formId: scope.formId } } }
      : {}),
    ...(scope.ownerUserIds
      ? { ownerUserId: { in: [...scope.ownerUserIds] } }
      : {}),
  };
}

export async function loadLeadsCreated(params: {
  organizationId: string;
  from: Date;
  to: Date;
  branchIds?: readonly string[];
  leadScope?: KpiLeadScope;
}): Promise<KpiLeadRow[]> {
  return prisma.lead.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      createdAt: { gte: params.from, lte: params.to },
      ...(params.branchIds
        ? { branchId: { in: [...params.branchIds] } }
        : {}),
      ...leadScopeWhere(params.leadScope),
    },
    take: 50_000,
    select: {
      id: true,
      createdAt: true,
      ownerUserId: true,
      branchId: true,
    },
  });
}

export async function loadLeadsOwnedPointInTime(params: {
  organizationId: string;
  branchIds?: readonly string[];
  leadScope?: KpiLeadScope;
}): Promise<KpiLeadRow[]> {
  return prisma.lead.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      ownerUserId: { not: null },
      ...(params.branchIds
        ? { branchId: { in: [...params.branchIds] } }
        : {}),
      ...leadScopeWhere(params.leadScope),
    },
    take: 50_000,
    select: {
      id: true,
      createdAt: true,
      ownerUserId: true,
      branchId: true,
    },
  });
}
