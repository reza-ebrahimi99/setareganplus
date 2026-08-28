import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireAdminSessionOrThrow } from "@/lib/auth/require-admin";
import { generateCommerceOrderQrPng, COMMERCE_QR_DOWNLOAD_SIZE, COMMERCE_QR_PREVIEW_SIZE } from "@/lib/commerce/orders/qr";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  let session: Awaited<ReturnType<typeof requireAdminSessionOrThrow>>;
  try {
    session = await requireAdminSessionOrThrow();
  } catch {
    return NextResponse.json({ error: "برای دریافت QR باید وارد شوید." }, { status: 401 });
  }
  if (!hasPermission(session, "commerce.orders.view")) {
    return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
  }

  const { token } = await context.params;
  const safeToken = decodeURIComponent(token).trim();
  if (!safeToken) {
    return NextResponse.json({ error: "کد QR نامعتبر است." }, { status: 400 });
  }

  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;

  const order = await prisma.commerceOrder.findFirst({
    where: {
      organizationId: session.organization.id,
      qrToken: safeToken,
      ...(allowedBranchIds
        ? {
            OR: [
              { branchId: { in: [...allowedBranchIds] } },
              { pickupBranchId: { in: [...allowedBranchIds] } },
            ],
          }
        : {}),
    },
    select: { qrToken: true },
  });
  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
  }

  const url = new URL(request.url);
  const size = url.searchParams.get("preview") === "1"
    ? COMMERCE_QR_PREVIEW_SIZE
    : COMMERCE_QR_DOWNLOAD_SIZE;
  try {
    const png = await generateCommerceOrderQrPng(order.qrToken, size);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": url.searchParams.get("preview") === "1" ? "inline" : `attachment; filename="order-qr.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "ساخت QR ممکن نیست." }, { status: 503 });
  }
}
