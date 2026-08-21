import { NextResponse } from "next/server";
import { generateCommerceOrderQrPng, parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token: raw } = await context.params;
  const token = parseCommerceOrderQrInput(decodeURIComponent(raw)) ?? decodeURIComponent(raw).trim();
  if (!token) {
    return NextResponse.json({ error: "کد QR نامعتبر است." }, { status: 400 });
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return NextResponse.json({ error: "یافت نشد." }, { status: 404 });
  }

  const order = await prisma.commerceOrder.findFirst({
    where: { organizationId: organization.id, qrToken: token },
    select: { qrToken: true },
  });
  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
  }

  try {
    const png = await generateCommerceOrderQrPng(order.qrToken);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="booklet-qr.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "ساخت QR ممکن نیست." }, { status: 503 });
  }
}
