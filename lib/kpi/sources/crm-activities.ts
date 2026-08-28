/**
 * CRM event loader for KPI (CrmActivity only).
 */

import type { Prisma } from "@/generated/prisma/client";
import { CrmActivityType, LeadSourceType } from "@/generated/prisma/enums";
import type { KpiLeadScope } from "@/lib/kpi/types";
import { prisma } from "@/lib/prisma";

function parseSourceType(value: string | undefined): LeadSourceType | undefined {
  if (!value) return undefined;
  return (Object.values(LeadSourceType) as string[]).includes(value)
    ? (value as LeadSourceType)
    : undefined;
}

export type KpiActivityRow = {
  id: string;
  occurredAt: Date;
  activityType: CrmActivityType;
  actorUserId: string | null;
  leadId: string;
  ownerUserId: string | null;
  branchId: string | null;
  metadataOwnerUserId: string | null;
  metadata: Prisma.JsonValue | null;
};

function metadataOwner(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const ownerUserId = Reflect.get(metadata, "ownerUserId");
  return typeof ownerUserId === "string" ? ownerUserId : null;
}

function leadFilter(params: {
  branchIds?: readonly string[];
  leadScope?: KpiLeadScope;
}): Prisma.LeadWhereInput | undefined {
  const scope = params.leadScope;
  const hasScope =
    Boolean(params.branchIds?.length) ||
    Boolean(scope?.source) ||
    Boolean(scope?.sourceType) ||
    Boolean(scope?.formId) ||
    Boolean(scope?.stageId) ||
    Boolean(scope?.ownerUserIds?.length);
  if (!hasScope) return undefined;
  return {
    ...(params.branchIds
      ? { branchId: { in: [...params.branchIds] } }
      : {}),
    ...(scope?.source ? { source: scope.source } : {}),
    ...(parseSourceType(scope?.sourceType)
      ? { sourceType: parseSourceType(scope?.sourceType) }
      : {}),
    ...(scope?.stageId ? { stageId: scope.stageId } : {}),
    ...(scope?.formId
      ? { formSubmissions: { some: { formId: scope.formId } } }
      : {}),
    ...(scope?.ownerUserIds
      ? { ownerUserId: { in: [...scope.ownerUserIds] } }
      : {}),
  };
}

export async function loadCrmActivities(params: {
  organizationId: string;
  from: Date;
  to: Date;
  activityTypes?: readonly CrmActivityType[];
  branchIds?: readonly string[];
  leadScope?: KpiLeadScope;
  actorUserIds?: readonly string[];
}): Promise<KpiActivityRow[]> {
  const leadWhere = leadFilter(params);
  const rows = await prisma.crmActivity.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.activityTypes?.length
        ? { activityType: { in: [...params.activityTypes] } }
        : {}),
      occurredAt: { gte: params.from, lte: params.to },
      ...(params.actorUserIds?.length
        ? { actorUserId: { in: [...params.actorUserIds] } }
        : {}),
      ...(leadWhere ? { lead: leadWhere } : {}),
    },
    take: 50_000,
    select: {
      id: true,
      occurredAt: true,
      activityType: true,
      actorUserId: true,
      leadId: true,
      metadata: true,
      lead: {
        select: {
          ownerUserId: true,
          branchId: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt,
    activityType: row.activityType,
    actorUserId: row.actorUserId,
    leadId: row.leadId,
    ownerUserId: row.lead?.ownerUserId ?? null,
    branchId: row.lead?.branchId ?? null,
    metadataOwnerUserId: metadataOwner(row.metadata),
    metadata: row.metadata,
  }));
}
