import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";
import {
  loadAutomationActivity,
  loadAutomationNotifications,
} from "@/lib/dashboard/loaders/automation";
import {
  loadKpiConversion,
  loadKpiLeadsToday,
  loadKpiPipeline,
  loadKpiRevenue,
} from "@/lib/dashboard/loaders/kpi";
import {
  loadQueueAssignment,
  loadQueueFollowUp,
  loadQueueSla,
} from "@/lib/dashboard/loaders/queue";
import {
  loadStaticQuickActions,
  loadStaticReadiness,
} from "@/lib/dashboard/loaders/static";
import {
  loadTruthManagerOps,
  loadTruthStaffCallsToday,
  loadTruthWorkspace,
} from "@/lib/dashboard/loaders/truth";

export type WidgetLoader = (
  ctx: DashboardComposeContext,
) => Promise<unknown>;

const LOADERS: Record<string, WidgetLoader> = {
  kpi_leads_today: loadKpiLeadsToday,
  kpi_conversion: loadKpiConversion,
  kpi_revenue: loadKpiRevenue,
  kpi_pipeline: loadKpiPipeline,
  truth_manager_ops: loadTruthManagerOps,
  truth_staff_calls_today: loadTruthStaffCallsToday,
  truth_workspace: loadTruthWorkspace,
  queue_assignment: loadQueueAssignment,
  queue_follow_up: loadQueueFollowUp,
  queue_sla: loadQueueSla,
  automation_activity: loadAutomationActivity,
  automation_notifications: loadAutomationNotifications,
  static_readiness: loadStaticReadiness,
  static_quick_actions: loadStaticQuickActions,
};

export function getWidgetLoader(loaderKey: string): WidgetLoader | undefined {
  return LOADERS[loaderKey];
}
