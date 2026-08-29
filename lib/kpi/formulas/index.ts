/**
 * Formula registry — maps formulaKey to compute functions.
 */

import { CrmActivityType } from "@/generated/prisma/enums";
import {
  aggregateEvents,
  groupCountByDimensions,
  singleTotalPoint,
} from "@/lib/kpi/aggregation";
import { loadCrmActivities } from "@/lib/kpi/sources/crm-activities";
import {
  loadLeadsCreated,
  loadLeadsOwnedPointInTime,
} from "@/lib/kpi/sources/leads";
import {
  loadCanonicalSnapshotsForKpi,
  loadPendingSnapshots,
} from "@/lib/kpi/sources/snapshots";
import type {
  FormulaContext,
  FormulaFn,
  KpiFormulaKey,
  KpiSeriesPoint,
} from "@/lib/kpi/types";

function snapshotDims(row: {
  attributedUserId: string | null;
  branchId: string | null;
}): Record<string, string | null> {
  return {
    attributedUserId: row.attributedUserId,
    branchId: row.branchId,
    ownerUserId: row.attributedUserId,
  };
}

async function sumCanonicalSnapshotAmount(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const rows = await loadCanonicalSnapshotsForKpi(ctx);
  return aggregateEvents(
    rows.map((row) => ({
      at: row.attributedAt,
      value: row.amountRials,
      dimensions: snapshotDims(row),
    })),
    ctx.grain,
    ctx.dimension === "ownerUserId" ? "attributedUserId" : ctx.dimension,
  );
}

async function countCanonicalSnapshots(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const rows = await loadCanonicalSnapshotsForKpi(ctx);
  return aggregateEvents(
    rows.map((row) => ({
      at: row.attributedAt,
      value: 1,
      dimensions: snapshotDims(row),
    })),
    ctx.grain,
    ctx.dimension === "ownerUserId" ? "attributedUserId" : ctx.dimension,
  );
}

async function sumCanonicalSnapshotAmountByOwner(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const dimension =
    ctx.dimension === "none" || ctx.dimension === "ownerUserId"
      ? "attributedUserId"
      : ctx.dimension;
  const rows = await loadCanonicalSnapshotsForKpi(ctx);
  return aggregateEvents(
    rows.map((row) => ({
      at: row.attributedAt,
      value: row.amountRials,
      dimensions: snapshotDims(row),
    })),
    ctx.grain,
    dimension,
  );
}

async function countPendingSnapshots(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const rows = await loadPendingSnapshots(ctx);
  const dimension =
    ctx.dimension === "attributedUserId" || ctx.dimension === "ownerUserId"
      ? "none"
      : ctx.dimension;
  return aggregateEvents(
    rows.map((row) => ({
      at: row.attributedAt,
      value: 1,
      dimensions: snapshotDims(row),
    })),
    ctx.grain,
    dimension,
  );
}

async function countLeadsCreated(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const rows = await loadLeadsCreated(ctx);
  return aggregateEvents(
    rows.map((row) => ({
      at: row.createdAt,
      value: 1,
      dimensions: {
        ownerUserId: row.ownerUserId,
        branchId: row.branchId,
        attributedUserId: row.ownerUserId,
      },
    })),
    ctx.grain,
    ctx.dimension === "attributedUserId" ? "ownerUserId" : ctx.dimension,
  );
}

async function countLeadsOwned(ctx: FormulaContext): Promise<KpiSeriesPoint[]> {
  const rows = await loadLeadsOwnedPointInTime({
    organizationId: ctx.organizationId,
    branchIds: ctx.branchIds,
    leadScope: ctx.leadScope,
  });
  if (ctx.dimension === "none") {
    return singleTotalPoint(rows.length);
  }
  const dim =
    ctx.dimension === "attributedUserId" ? "ownerUserId" : ctx.dimension;
  return groupCountByDimensions(
    rows.map((row) => ({
      dimensions: {
        ownerUserId: row.ownerUserId,
        branchId: row.branchId,
        attributedUserId: row.ownerUserId,
      },
    })),
    dim,
  );
}

async function countOwnerAssignmentEvents(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const rows = await loadCrmActivities({
    ...ctx,
    activityTypes: [CrmActivityType.OWNER_ASSIGNED],
  });
  return aggregateEvents(
    rows.map((row) => ({
      at: row.occurredAt,
      value: 1,
      dimensions: {
        ownerUserId: row.metadataOwnerUserId ?? row.ownerUserId,
        branchId: row.branchId,
        attributedUserId: row.metadataOwnerUserId ?? row.ownerUserId,
      },
    })),
    ctx.grain,
    ctx.dimension === "attributedUserId" ? "ownerUserId" : ctx.dimension,
  );
}

async function countCrmConvertedEvents(
  ctx: FormulaContext,
): Promise<KpiSeriesPoint[]> {
  const rows = await loadCrmActivities({
    ...ctx,
    activityTypes: [CrmActivityType.CONVERTED],
  });
  return aggregateEvents(
    rows.map((row) => ({
      at: row.occurredAt,
      value: 1,
      dimensions: {
        ownerUserId: row.ownerUserId,
        branchId: row.branchId,
        attributedUserId: row.ownerUserId,
      },
    })),
    ctx.grain,
    ctx.dimension === "attributedUserId" ? "ownerUserId" : ctx.dimension,
  );
}

export const FORMULA_REGISTRY: Record<KpiFormulaKey, FormulaFn> = {
  sum_canonical_snapshot_amount: sumCanonicalSnapshotAmount,
  count_canonical_snapshots: countCanonicalSnapshots,
  sum_canonical_snapshot_amount_by_owner: sumCanonicalSnapshotAmountByOwner,
  count_pending_snapshots: countPendingSnapshots,
  count_leads_created: countLeadsCreated,
  count_leads_owned: countLeadsOwned,
  count_owner_assignment_events: countOwnerAssignmentEvents,
  count_crm_converted_events: countCrmConvertedEvents,
};

export function getFormula(formulaKey: KpiFormulaKey): FormulaFn {
  return FORMULA_REGISTRY[formulaKey];
}
