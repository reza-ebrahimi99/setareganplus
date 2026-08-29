import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { parseAdminCommerceOrderFilters } from "@/lib/commerce/orders/filters";
import { exportCommerceOrdersXlsx } from "@/lib/commerce/orders/export-xlsx";
import type { AdminCommerceOrderListFilters } from "@/lib/commerce/orders/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json(
      { error: "برای دسترسی به این خروجی باید وارد شوید." },
      { status: 401 },
    );
  }

  if (!hasPermission(session, "commerce.orders.view")) {
    return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = parseAdminCommerceOrderFilters(url.searchParams);
  const filters: AdminCommerceOrderListFilters = {
    ...parsed,
    organizationId: session.organization.id,
    allowedBranchIds: session.membership.allBranches
      ? null
      : session.membership.branchIds,
  };

  const result = await exportCommerceOrdersXlsx(filters);
  if (!result.ok) {
    return NextResponse.json(
      { error: "خروجی Excel در حال حاضر در دسترس نیست." },
      { status: 503 },
    );
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
