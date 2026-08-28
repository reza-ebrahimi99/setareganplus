import type {
  DashboardDefinition,
  WidgetDefinition,
} from "@/lib/dashboard/contracts/widget";

export function hasAllPermissions(
  granted: ReadonlySet<string>,
  required: readonly string[],
): boolean {
  return required.every((p) => granted.has(p));
}

export function canViewDashboard(
  granted: ReadonlySet<string>,
  dashboard: DashboardDefinition,
): boolean {
  return hasAllPermissions(granted, dashboard.permissions);
}

export function canViewWidget(
  granted: ReadonlySet<string>,
  widget: WidgetDefinition,
): boolean {
  return hasAllPermissions(granted, widget.permissions);
}

export function filterWidgetsByPermission(
  granted: ReadonlySet<string>,
  widgets: readonly WidgetDefinition[],
): WidgetDefinition[] {
  return widgets.filter((w) => canViewWidget(granted, w));
}
