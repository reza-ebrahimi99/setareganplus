import { NextResponse, type NextRequest } from "next/server";
import { handleFormCallback, receiptPath } from "@/lib/forms/registration";
import { siteUrl } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

/** Zibal returns form registrants here: ?token=…&trackId=…&success=1|0 (new route; the old /payments/callback/zibal is untouched). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const token = q.get("token") ?? "";
  const base = process.env.NODE_ENV === "production" ? siteUrl() : req.nextUrl.origin;
  if (!token) return NextResponse.redirect(`${base}/forms`, 303);
  let out;
  try {
    out = await handleFormCallback(token, { trackId: q.get("trackId"), success: q.get("success") });
  } catch (e) {
    console.error("[forms] callback error", e);
    out = { kind: "pending" as const, receipt: undefined };
  }
  if (!out.receipt) return NextResponse.redirect(`${base}/forms`, 303);
  return NextResponse.redirect(`${base}${receiptPath(out.receipt)}?r=${out.kind}`, 303);
}
