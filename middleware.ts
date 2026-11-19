import { NextResponse, type NextRequest } from "next/server";

export const config = { matcher: ["/admin/shop/pricing"] };

function b64url(bytes: ArrayBuffer): string {
  const raw = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

/** Owner session: env admin, no staff id. Anyone else is refused before the page renders. */
async function ownerCookie(raw: string | undefined, secret: string): Promise<boolean> {
  if (!raw || secret.length < 32) return false;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = await sign(secret, payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))) as { u?: unknown; sid?: unknown; exp?: unknown };
    const owner = process.env.ADMIN_USERNAME || "";
    return typeof data.exp === "number" && data.exp > Date.now() && !data.sid && typeof data.u === "string" && !!owner && data.u === owner;
  } catch {
    return false;
  }
}

const PAGE = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>دسترسی ندارید</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f3ee;font-family:Tahoma,sans-serif;color:#0b1f3a"><main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-size:1.6rem">دسترسی ندارید</h1><p>این بخش فقط برای مدیر اصلی باز است.</p></main></body></html>`;

export async function middleware(req: NextRequest) {
  const ok = await ownerCookie(req.cookies.get("sp_admin")?.value, process.env.SESSION_SECRET || "");
  if (ok) return NextResponse.next();
  return new NextResponse(PAGE, { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
