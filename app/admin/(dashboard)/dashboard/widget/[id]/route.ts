import { NextResponse } from "next/server";
import { loadWidgetPayload } from "@/lib/dashboard/compose";
import {
  buildComposeContext,
  requireDashboardSessionJson,
} from "@/lib/dashboard/http";
import { getWidgetDefinition, isWidgetId } from "@/lib/dashboard/registry/widgets";

export const dynamic = "force-dynamic";

/**
 * GET /admin/dashboard/widget/:id — single widget for partial refresh.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireDashboardSessionJson();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isWidgetId(id)) {
    return NextResponse.json(
      { error: "INVALID_WIDGET", message: "Unknown widget id." },
      { status: 400 },
    );
  }

  const widget = getWidgetDefinition(id)!;
  const url = new URL(request.url);
  const ctx = buildComposeContext({
    session: auth.session,
    url,
    includeSession: widget.loaderKey === "truth_workspace",
  });

  if (!ctx.allBranches && ctx.branchIds.length === 0) {
    return NextResponse.json(
      { error: "FORBIDDEN_BRANCH" },
      { status: 403 },
    );
  }

  const payload = await loadWidgetPayload({
    widget,
    ctx,
    useCache: url.searchParams.get("nocache") !== "1",
  });

  if (payload.status === "forbidden") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Widget not permitted." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    organizationId: auth.session.organization.id,
    widget: payload,
  });
}
