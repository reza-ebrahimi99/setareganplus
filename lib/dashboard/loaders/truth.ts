import type { AdminSessionContext } from "@/lib/auth/require-admin";
import {
  readManagerOpsMetrics,
  readStaffCallsToday,
} from "@/lib/crm/manager-dashboard-reads";
import { readWorkspaceDashboard } from "@/lib/crm/workspace-reads";
import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";

export async function loadTruthManagerOps(ctx: DashboardComposeContext) {
  return readManagerOpsMetrics({
    organizationId: ctx.organizationId,
    branchIds: ctx.allBranches ? undefined : ctx.branchIds,
  });
}

export async function loadTruthStaffCallsToday(ctx: DashboardComposeContext) {
  return readStaffCallsToday({
    organizationId: ctx.organizationId,
    branchIds: ctx.allBranches ? undefined : ctx.branchIds,
    limit: 5,
  });
}

export async function loadTruthWorkspace(ctx: DashboardComposeContext) {
  if (!ctx.session) {
    throw new Error("WORKSPACE_SESSION_REQUIRED");
  }
  return readWorkspaceDashboard(ctx.session as AdminSessionContext);
}
