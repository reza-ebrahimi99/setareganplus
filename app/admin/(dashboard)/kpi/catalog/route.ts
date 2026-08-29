import { NextResponse } from "next/server";
import { requireReportsViewJson } from "@/lib/kpi/http";
import { listKpiCatalog } from "@/lib/kpi/registry";

export const dynamic = "force-dynamic";

/**
 * GET /admin/kpi/catalog — registry only (no compute).
 */
export async function GET() {
  const auth = await requireReportsViewJson();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    organizationId: auth.session.organization.id,
    catalog: listKpiCatalog(),
  });
}
