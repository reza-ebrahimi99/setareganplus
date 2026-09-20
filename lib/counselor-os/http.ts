import { NextResponse } from "next/server";
import { getCounselorContext } from "@/lib/counselor-os/auth";
import {
  MUTATION_ORIGIN_FORBIDDEN_MESSAGE_FA,
  validateTrustedMutationOrigin,
} from "@/lib/http/trusted-mutation-origin";

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

export function assertCounselorMutationOrigin(request: Request): boolean {
  return validateTrustedMutationOrigin(request).ok;
}

export function counselorMutationOriginFailureResponse(
  request: Request,
  reason: string,
): NextResponse {
  const referer = request.headers.get("referer");
  console.info("[choice-studio]", {
    phase: "import.origin.denied",
    reason,
    origin: request.headers.get("origin") ?? undefined,
    host: request.headers.get("host") ?? undefined,
    xForwardedHost: request.headers.get("x-forwarded-host") ?? undefined,
    xForwardedProto: request.headers.get("x-forwarded-proto") ?? undefined,
    refererOrigin: referer
      ? (() => {
          try {
            const u = new URL(referer);
            return `${u.protocol}//${u.host}`;
          } catch {
            return undefined;
          }
        })()
      : undefined,
    requestUrlOrigin: (() => {
      try {
        const u = new URL(request.url);
        return `${u.protocol}//${u.host}`;
      } catch {
        return undefined;
      }
    })(),
  });

  return NextResponse.json(
    {
      ok: false,
      code: "FORBIDDEN_ORIGIN",
      error: MUTATION_ORIGIN_FORBIDDEN_MESSAGE_FA,
    },
    { status: 403 },
  );
}
