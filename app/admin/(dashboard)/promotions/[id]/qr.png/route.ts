import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-admin";
import { getPromotionDetail } from "@/lib/promotions/admin";
import { generateReferralQrPng } from "@/lib/promotions/generate-referral-qr";
import { listFlowOptions } from "@/lib/promotions/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await requirePermission("promotions.view");
  const { id } = await context.params;
  const promo = await getPromotionDetail(session.organization.id, id);
  if (!promo?.code) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const flowParam = url.searchParams.get("flow")?.trim();
  const flows = await listFlowOptions(session.organization.id);
  const flowSlug =
    flowParam ||
    promo.registrationFlow?.slug ||
    flows[0]?.slug ||
    "qalamchi-exam";

  const png = await generateReferralQrPng({
    flowSlug,
    code: promo.code,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="referral-${promo.code}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
