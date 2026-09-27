import { getAcademySettings } from "@/lib/academy/config";
import { prisma } from "@/lib/prisma";

export async function updateVideoProgress(params: {
  organizationId: string;
  userId: string;
  courseId: string;
  lessonId: string;
  lastPositionSeconds: number;
  durationSeconds?: number | null;
}) {
  const settings = await getAcademySettings(params.organizationId);
  const last = Math.max(0, Math.floor(params.lastPositionSeconds));
  const duration =
    params.durationSeconds != null && params.durationSeconds > 0
      ? Math.floor(params.durationSeconds)
      : null;

  const existing = await prisma.academyVideoProgress.findUnique({
    where: {
      organizationId_userId_lessonId: {
        organizationId: params.organizationId,
        userId: params.userId,
        lessonId: params.lessonId,
      },
    },
    select: { maxPositionSeconds: true, completed: true },
  });

  const maxPosition = Math.max(existing?.maxPositionSeconds ?? 0, last);
  let completed = existing?.completed ?? false;
  let completedAt: Date | null | undefined = undefined;

  if (!completed && duration && duration > 0) {
    const pct = (maxPosition / duration) * 100;
    if (pct >= settings.completionThresholdPct) {
      completed = true;
      completedAt = new Date();
    }
  }

  return prisma.academyVideoProgress.upsert({
    where: {
      organizationId_userId_lessonId: {
        organizationId: params.organizationId,
        userId: params.userId,
        lessonId: params.lessonId,
      },
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      courseId: params.courseId,
      lessonId: params.lessonId,
      lastPositionSeconds: last,
      maxPositionSeconds: maxPosition,
      durationSeconds: duration,
      completed,
      completedAt: completed ? new Date() : null,
      lastViewedAt: new Date(),
    },
    update: {
      lastPositionSeconds: last,
      maxPositionSeconds: maxPosition,
      durationSeconds: duration ?? undefined,
      completed,
      ...(completedAt ? { completedAt } : {}),
      lastViewedAt: new Date(),
    },
  });
}
