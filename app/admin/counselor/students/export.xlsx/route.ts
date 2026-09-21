import { NextResponse } from "next/server";
import { requireCounselorContext } from "@/lib/counselor-os/auth";
import {
  exportCounselorStudentsXlsx,
  parseCounselorStudentExportFilters,
  parseCounselorStudentsExportScope,
} from "@/lib/counselor-os/students-export/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const ctx = await requireCounselorContext();
  const url = new URL(request.url);
  const scope = parseCounselorStudentsExportScope(url.searchParams.get("scope"));
  const filters = parseCounselorStudentExportFilters(url.searchParams);

  const siteOrigin = url.origin;

  const result = await exportCounselorStudentsXlsx({
    ctx,
    scope,
    filters,
    siteOrigin,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    const status = result.reason === "empty" ? 404 : 500;
    return NextResponse.json({ error: result.message }, { status });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Export-Row-Count": String(result.rowCount),
    },
  });
}
