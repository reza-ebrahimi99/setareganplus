import { NextResponse } from "next/server";
import { getCounselorContext } from "@/lib/counselor-os/auth";

export async function requireCounselorSessionJson(): Promise<
  | { ok: true; ctx: NonNullable<Awaited<ReturnType<typeof getCounselorContext>>> }
  | { ok: false; response: NextResponse }
> {
  const ctx = await getCounselorContext();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 }),
    };
  }
  return { ok: true, ctx };
}

/** Reject cross-site POSTs when Origin/Referer is present and does not match the request host. */
export function assertCounselorMutationOrigin(request: Request): boolean {
  const expectedHost = new URL(request.url).host;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === expectedHost;
    } catch {
      return false;
    }
  }
  return true;
}
