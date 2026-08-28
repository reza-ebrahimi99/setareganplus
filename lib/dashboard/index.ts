export {
  composeDashboard,
  loadWidgetPayload,
  type ComposedDashboard,
} from "@/lib/dashboard/compose";
export type {
  DashboardComposeContext,
  DashboardDefinition,
  WidgetDefinition,
  WidgetPayload,
} from "@/lib/dashboard/types";
export {
  getDashboardDefinition,
  isDashboardId,
  listDashboardDefinitions,
} from "@/lib/dashboard/registry/dashboards";
export {
  getWidgetDefinition,
  isWidgetId,
  listWidgetDefinitions,
} from "@/lib/dashboard/registry/widgets";
export {
  canViewDashboard,
  canViewWidget,
  filterWidgetsByPermission,
  hasAllPermissions,
} from "@/lib/dashboard/permissions/filter";
