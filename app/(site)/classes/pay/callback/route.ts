import { NextResponse, type NextRequest } from "next/server";
import { settleCoursePayment } from "@/lib/classes/pay";
import { siteUrl } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const token = q.get("token") || "";
  const base = process.env.NODE_ENV === "production" ? siteUrl() : req.nextUrl.origin;
  if (!token) return NextResponse.redirect(`${base}/classes`, 303);
  const out = await settleCoursePayment(token, { trackId: q.get("trackId"), success: q.get("success") }).catch(() => ({ kind: "pending" as const, message: "خطای موقت. صفحه را تازه کنید.", slug: "" }));
  const p = new URLSearchParams({ status: out.kind });
  if ("slug" in out && out.slug) p.set("course", out.slug);
  if ("message" in out && out.message) p.set("m", out.message);
  return NextResponse.redirect(`${base}/classes/pay/result?${p}`, 303);
}
