import { NextResponse } from "next/server";
import {
  requireDashboardSessionJson,
  sessionPermissionSet,
} from "@/lib/dashboard/http";
import { filterWidgetsByPermission } from "@/lib/dashboard/permissions/filter";
import { listDashboardDefinitions } from "@/lib/dashboard/registry/dashboards";
import { listWidgetDefinitions } from "@/lib/dashboard/registry/widgets";

export const dynamic = "force-dynamic";

/**
 * GET /admin/dashboard/widgets — catalog of widgets (and dashboards) filtered by RBAC.
 */
export async function GET() {
  const auth = await requireDashboardSessionJson();
  if (!auth.ok) return auth.response;

  const granted = sessionPermissionSet(auth.session);
  const widgets = filterWidgetsByPermission(
    granted,
    listWidgetDefinitions(),
  ).map((w) => ({
    id: w.id,
    title: w.title,
    permissions: w.permissions,
    refreshIntervalSeconds: w.refreshIntervalSeconds,
    dataSource: w.dataSource,
    lazy: w.lazy ?? false,
    emptyState: w.emptyState,
    loadingState: w.loadingState,
  }));

  const dashboards = listDashboardDefinitions()
    .filter((d) => d.permissions.every((p) => granted.has(p)))
    .map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      permissions: d.permissions,
      widgetIds: d.widgetIds,
    }));

  return NextResponse.json({
    organizationId: auth.session.organization.id,
    widgets,
    dashboards,
  });
}
