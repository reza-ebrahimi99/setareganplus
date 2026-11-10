import "server-only";
import { prisma } from "@/lib/prisma";
import { COURSE_POINTS, WATCH_POINTS, quizPoints, shiftDay, tehranDay } from "./catalog";
import { issueCertificate } from "./certificate";

/** Raise the stored grant for this key up to `points` and log only the difference. */
export async function awardPoints(studentId: string, key: string, points: number) {
  if (points <= 0) return 0;
  const existing = await prisma.classPoint.findUnique({ where: { studentId_key: { studentId, key } } });
  const prev = existing?.points ?? 0;
  if (points <= prev) return 0;
  const delta = points - prev;
  await prisma.$transaction([
    prisma.classPoint.upsert({
      where: { studentId_key: { studentId, key } },
      create: { studentId, key, points },
      update: { points },
    }),
    prisma.classPointLog.create({ data: { studentId, points: delta } }),
    prisma.classStudent.update({ where: { id: studentId }, data: { points: { increment: delta } } }),
  ]);
  return delta;
}

export async function touchStreak(studentId: string) {
  const today = tehranDay();
  const row = await prisma.classStudent.findUnique({ where: { id: studentId }, select: { streak: true, lastActiveOn: true } });
  if (!row || row.lastActiveOn === today) return row?.streak ?? 0;
  const streak = row.lastActiveOn === shiftDay(today, -1) ? row.streak + 1 : 1;
  await prisma.classStudent.update({ where: { id: studentId }, data: { streak, lastActiveOn: today } });
  if (streak >= 7) {
    await prisma.classBadge.upsert({
      where: { studentId_kind_courseId: { studentId, kind: "streak_7", courseId: "" } },
      create: { studentId, kind: "streak_7", courseId: "" },
      update: {},
    });
  }
  return streak;
}

export async function noteWatch(studentId: string, lessonId: string, completed: boolean) {
  await touchStreak(studentId);
  if (completed) await awardPoints(studentId, `watch:${lessonId}`, WATCH_POINTS);
}

export async function noteQuiz(studentId: string, lessonId: string, score: number, total: number) {
  await touchStreak(studentId);
  return awardPoints(studentId, `quiz:${lessonId}`, quizPoints(score, total));
}

export async function maybeCompleteCourse(studentId: string, courseId: string) {
  const lessons = await prisma.classLesson.findMany({
    where: { courseId, published: true },
    select: {
      id: true,
      durationSec: true,
      questions: { where: { published: true }, select: { id: true } },
      progress: { where: { studentId }, select: { completed: true, secondsWatched: true } },
    },
  });
  if (lessons.length === 0) return null;
  const links = await prisma.classChapter.findMany({ where: { courseId }, select: { lessonId: true, code: true } });
  const courseCodes = links.filter((l) => l.lessonId === "").map((l) => l.code);
  const bankFor = async (codes: string[]) => (codes.length ? prisma.bankQuestion.count({ where: { active: true, chapters: { hasSome: codes } } }) : 0);
  const courseBank = await bankFor(courseCodes);
  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId, lessonId: { in: lessons.map((l) => l.id) } },
    select: { lessonId: true },
  });
  const tried = new Set(attempts.map((a) => a.lessonId).filter((id): id is string => !!id));
  for (const lesson of lessons) {
    const p = lesson.progress[0];
    const watched = !!p && (p.completed || (!!lesson.durationSec && p.secondsWatched >= Math.floor(lesson.durationSec * 0.9)));
    if (!watched) return null;
    const own = links.filter((l) => l.lessonId === lesson.id).map((l) => l.code);
    const ownBank = await bankFor(own);
    if ((lesson.questions.length > 0 || courseBank > 0 || ownBank > 0) && !tried.has(lesson.id)) return null;
  }
  await awardPoints(studentId, `course:${courseId}`, COURSE_POINTS);
  await prisma.classBadge.upsert({
    where: { studentId_kind_courseId: { studentId, kind: "course_complete", courseId } },
    create: { studentId, kind: "course_complete", courseId },
    update: {},
  });
  return issueCertificate(studentId, courseId);
}
