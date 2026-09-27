import { NextResponse } from "next/server";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { createPlaybackSession } from "@/lib/academy/playback";

export async function POST(request: Request) {
  const session = await requireAcademySession().catch(() => null);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { lessonId?: string; deviceKey?: string };
  try {
    body = (await request.json()) as { lessonId?: string; deviceKey?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!body.lessonId) {
    return NextResponse.json({ ok: false, error: "lessonId required" }, { status: 400 });
  }

  const organizationId = await getAcademyOrganizationId();
  const meta = await readSessionRequestMetadata();

  const created = await createPlaybackSession({
    organizationId,
    userId: session.userId,
    lessonId: body.lessonId,
    deviceKey: body.deviceKey ?? null,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.error }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: created.sessionId,
    manifestUrl: created.manifestUrl,
    expiresAt: created.expiresAt.toISOString(),
  });
}
