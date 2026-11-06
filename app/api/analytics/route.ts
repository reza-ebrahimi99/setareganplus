import { NextResponse } from "next/server";
import { pageViewCookies, recordPageView } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const headerGet = (name: string) => req.headers.get(name);
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 0 && text.length <= 2000) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }
  const cookie = req.headers.get("cookie") ?? "";
  const result = await recordPageView({
    body,
    userAgent: headerGet("user-agent"),
    headerGet,
    vidCookie: readCookie(cookie, "sp_vid"),
    attrCookie: readCookie(cookie, "sp_src"),
  });
  const res = new NextResponse(null, { status: result.status, headers: { "cache-control": "no-store" } });
  for (const c of pageViewCookies(result)) {
    res.cookies.set(c.name, c.value, { httpOnly: c.httpOnly, sameSite: c.sameSite, secure: c.secure, path: c.path, maxAge: c.maxAge });
  }
  return res;
}

function readCookie(header: string, name: string): string | null {
  const parts = header.split(/; */);
  for (const part of parts) {
    const i = part.indexOf("=");
    if (i <= 0) continue;
    if (part.slice(0, i) !== name) continue;
    try {
      return decodeURIComponent(part.slice(i + 1));
    } catch {
      return part.slice(i + 1);
    }
  }
  return null;
}
