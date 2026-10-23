import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

/** Permanent short link from SMS: /o/AB12CD → the pickup ticket. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).trim().toUpperCase();
  const base = process.env.NODE_ENV === "production" ? siteUrl() : req.nextUrl.origin;
  const o = /^[A-Z0-9]{4,12}$/.test(code) ? await prisma.order.findUnique({ where: { shortCode: code }, select: { qrToken: true } }) : null;
  if (!o) return NextResponse.redirect(`${base}/order?nf=1`, 302);
  return NextResponse.redirect(`${base}/booklet/${encodeURIComponent(o.qrToken)}`, 302);
}
