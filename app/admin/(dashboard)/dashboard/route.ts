import { NextResponse } from "next/server";
import { composeDashboard } from "@/lib/dashboard/compose";
import {
  buildComposeContext,
  requireDashboardSessionJson,
} from "@/lib/dashboard/http";
import { isDashboardId } from "@/lib/dashboard/registry/dashboards";

export const dynamic = "force-dynamic";

/**
 * GET /admin/dashboard?id=manager&branch=&from=&to=&includeLazy=1
 */
export async function GET(request: Request) {
  const auth = await requireDashboardSessionJson();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "manager";
  if (!isDashboardId(id)) {
    return NextResponse.json(
      { error: "INVALID_DASHBOARD", message: "Unknown dashboard id." },
      { status: 400 },
    );
  }

  const ctx = buildComposeContext({
    session: auth.session,
    url,
    includeSession: id === "advisor",
  });

  if (!ctx.allBranches && ctx.branchIds.length === 0) {
    return NextResponse.json(
      { error: "FORBIDDEN_BRANCH" },
      { status: 403 },
    );
  }

  const result = await composeDashboard({ dashboardId: id, ctx });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "FORBIDDEN" ? 403 : 404 },
    );
  }

  return NextResponse.json({
    organizationId: auth.session.organization.id,
    ...result.dashboard,
  });
}
