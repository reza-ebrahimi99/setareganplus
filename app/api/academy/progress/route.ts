import { NextResponse } from "next/server";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { canUserAccessLesson } from "@/lib/academy/access";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { updateVideoProgress } from "@/lib/academy/progress";

export async function POST(request: Request) {
  const session = await requireAcademySession().catch(() => null);
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: {
    courseId?: string;
    lessonId?: string;
    lastPositionSeconds?: number;
    durationSeconds?: number | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.courseId || !body.lessonId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const organizationId = await getAcademyOrganizationId();
  const access = await canUserAccessLesson({
    organizationId,
    userId: session.userId,
    lessonId: body.lessonId,
  });
  if (!access.allowed) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await updateVideoProgress({
    organizationId,
    userId: session.userId,
    courseId: body.courseId,
    lessonId: body.lessonId,
    lastPositionSeconds: body.lastPositionSeconds ?? 0,
    durationSeconds: body.durationSeconds,
  });

  return NextResponse.json({ ok: true });
}
