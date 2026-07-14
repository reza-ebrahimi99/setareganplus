import { NextResponse } from "next/server";
import { exportFormResponsesCsv } from "@/lib/forms/export-form-responses";
import { parseResponseFiltersFromSearchParams } from "@/lib/forms/response-filters";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * CSV export for one form's submissions.
 * TODO(auth): Protect this route with authenticated admin authorization.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const filters = parseResponseFiltersFromSearchParams(
    Object.fromEntries(url.searchParams.entries()),
  );

  const result = await exportFormResponsesCsv(id, filters);

  if (!result.ok && result.reason === "not_found") {
    return NextResponse.json(
      { error: "فرم مورد نظر یافت نشد." },
      { status: 404 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: "خروجی CSV در حال حاضر در دسترس نیست." },
      { status: 503 },
    );
  }

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
