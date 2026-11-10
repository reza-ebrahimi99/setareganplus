import "server-only";
import { prisma } from "@/lib/prisma";
import { acceptWatchDelta, canWatchLesson } from "./catalog";
import { maybeCompleteCourse, noteWatch } from "./points";

async function gate(studentId: string, lessonId: string) {
  const lesson = await prisma.classLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, published: true, freePreview: true, durationSec: true, courseId: true, course: { select: { published: true } } },
  });
  if (!lesson) return null;
  const enrolled = await prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: lesson.courseId } }, select: { id: true } });
  const allowed = canWatchLesson({ published: lesson.published, coursePublished: lesson.course.published, freePreview: lesson.freePreview, loggedIn: true, enrolled: !!enrolled });
  return allowed ? lesson : null;
}

export async function touchOpen(studentId: string, lessonId: string) {
  const lesson = await gate(studentId, lessonId);
  if (!lesson) return;
  const row = await prisma.classProgress.findUnique({ where: { studentId_lessonId: { studentId, lessonId } } });
  const now = new Date();
  if (!row) {
    await prisma.classProgress.create({ data: { studentId, lessonId, opens: 1, lastOpenAt: now } });
    return;
  }
  if (!row.lastOpenAt || now.getTime() - row.lastOpenAt.getTime() > 30 * 60_000) {
    await prisma.classProgress.update({ where: { id: row.id }, data: { opens: { increment: 1 }, lastOpenAt: now } });
  }
}

export async function recordHeartbeat(studentId: string, lessonId: string, deltaSec: number) {
  const lesson = await gate(studentId, lessonId);
  if (!lesson) return { ok: false as const, error: "این جلسه برای شما باز نیست." };
  const row = await prisma.classProgress.findUnique({ where: { studentId_lessonId: { studentId, lessonId } } });
  const elapsed = row?.lastBeatAt ? (Date.now() - row.lastBeatAt.getTime()) / 1000 : null;
  const next = acceptWatchDelta({ deltaSec, elapsedSec: elapsed, watchedSec: row?.secondsWatched ?? 0, durationSec: lesson.durationSec });
  if (next.add <= 0 && !next.completed) return { ok: true as const, seconds: row?.secondsWatched ?? 0, completed: row?.completed ?? false };
  const completed = !!(row?.completed || next.completed);
  await prisma.classProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId, secondsWatched: next.seconds, completed, lastBeatAt: new Date(), opens: 1, lastOpenAt: new Date() },
    update: { secondsWatched: next.seconds, completed, lastBeatAt: new Date() },
  });
  if (completed && !row?.completed) {
    await noteWatch(studentId, lessonId, true);
    await maybeCompleteCourse(studentId, lesson.courseId);
  } else await noteWatch(studentId, lessonId, false);
  return { ok: true as const, seconds: next.seconds, completed };
}

export async function markLessonSeen(studentId: string, lessonId: string) {
  const lesson = await gate(studentId, lessonId);
  if (!lesson) return { ok: false as const, error: "این جلسه برای شما باز نیست." };
  const row = await prisma.classProgress.findUnique({ where: { studentId_lessonId: { studentId, lessonId } } });
  const next = { seconds: Math.max(row?.secondsWatched ?? 0, lesson.durationSec && lesson.durationSec > 0 ? lesson.durationSec : row?.secondsWatched ?? 0), completed: true };
  await prisma.classProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId, secondsWatched: next.seconds, completed: true, opens: 1, lastOpenAt: new Date() },
    update: { secondsWatched: next.seconds, completed: true },
  });
  await noteWatch(studentId, lessonId, true);
  const cert = await maybeCompleteCourse(studentId, lesson.courseId);
  return { ok: true as const, certificate: cert?.code ?? null };
}
