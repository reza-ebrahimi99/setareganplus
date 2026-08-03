import { NextResponse } from "next/server";
import {
  CommerceFulfillmentStatus,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { exportCommerceOrdersXlsx } from "@/lib/commerce/orders/export-xlsx";
import type { AdminCommerceOrderListFilters } from "@/lib/commerce/orders/service";

export const dynamic = "force-dynamic";

function first(value: string | null): string {
  return (value ?? "").trim();
}

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
  const sp = url.searchParams;

  const paymentStatus = first(sp.get("paymentStatus"));
  const fulfillmentStatus = first(sp.get("fulfillmentStatus"));

  const filters: AdminCommerceOrderListFilters = {
    organizationId: session.organization.id,
    q: first(sp.get("q")),
    buyerName: first(sp.get("buyerName")),
    buyerMobile: first(sp.get("buyerMobile")),
    productQuery: first(sp.get("productQuery")),
    itemId: first(sp.get("itemId")),
    paymentStatus: paymentStatus as CommerceOrderPaymentStatus | "",
    fulfillmentStatus: fulfillmentStatus as CommerceFulfillmentStatus | "",
    paidOnly: sp.get("paidOnly") === "1",
    undeliveredOnly: sp.get("undeliveredOnly") === "1",
    dateFrom: first(sp.get("dateFrom")),
    dateTo: first(sp.get("dateTo")),
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
