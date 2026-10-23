import { NextResponse, type NextRequest } from "next/server";
import { handleCallback, ticketPath } from "@/lib/shop/orders";
import { siteUrl } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

/** Zibal returns the buyer here: ?token=…&trackId=…&success=1|0&status=…&orderId=… */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const token = q.get("token") ?? "";
  const base = process.env.NODE_ENV === "production" ? siteUrl() : req.nextUrl.origin;
  if (!token) return NextResponse.redirect(`${base}/shop`, 303);
  let out;
  try {
    out = await handleCallback(token, { trackId: q.get("trackId"), success: q.get("success") });
  } catch (e) {
    console.error("[shop] callback error", e);
    out = { kind: "pending" as const, message: "خطای موقت در بررسی پرداخت. چند لحظه بعد صفحه را تازه کنید." };
  }
  if (out.kind === "paid" && out.qrToken) return NextResponse.redirect(`${base}${ticketPath(out.qrToken)}?paid=1`, 303);
  const p = new URLSearchParams();
  if (out.qrToken) p.set("o", out.qrToken);
  if (out.message) p.set("m", out.message);
  if (out.kind === "pending") { p.set("pending", "1"); p.set("t", token); }
  return NextResponse.redirect(`${base}/shop/pay/failed?${p}`, 303);
}
