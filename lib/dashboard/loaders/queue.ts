import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";
import { listOperationalQueue } from "@/lib/ops/list";
import type { OpsQueueId } from "@/lib/ops/types";

async function queueSummary(
  ctx: DashboardComposeContext,
  queueId: OpsQueueId,
) {
  const ownerUserId = ctx.permissions.has("crm.view_all")
    ? null
    : ctx.viewerUserId;
  const items = await listOperationalQueue({
    organizationId: ctx.organizationId,
    queueId,
    branchIds: ctx.allBranches ? undefined : ctx.branchIds,
    ownerUserId,
    limit: 5,
  });
  return {
    queueId,
    count: items.length,
    items: items.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      priority: item.priority,
      dueAt: item.dueAt,
      slaState: item.slaState,
      ownerUserId: item.ownerUserId,
    })),
  };
}

export async function loadQueueAssignment(ctx: DashboardComposeContext) {
  return queueSummary(ctx, "ASSIGNMENT");
}

export async function loadQueueFollowUp(ctx: DashboardComposeContext) {
  return queueSummary(ctx, "FOLLOW_UP");
}

export async function loadQueueSla(ctx: DashboardComposeContext) {
  return queueSummary(ctx, "SLA");
}
