import { dashboardQuickActions, platformReadiness } from "@/content/admin";
import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";

export async function loadStaticReadiness(_ctx: DashboardComposeContext) {
  return { items: platformReadiness };
}

export async function loadStaticQuickActions(_ctx: DashboardComposeContext) {
  return { actions: dashboardQuickActions };
}
