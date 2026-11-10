"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { allow } from "@/lib/shop/ratelimit";
import { chargeRials, safeNext, canWatchLesson } from "@/lib/classes/catalog";
import { startClassOtp, verifyClassOtp } from "@/lib/classes/otp";
import { clearClassSession, getClassStudent } from "@/lib/classes/session";
import { startCoursePayment } from "@/lib/classes/pay";
import { maybeCompleteCourse, noteQuiz } from "@/lib/classes/points";
import { markLessonSeen } from "@/lib/classes/watch";
import { renderMath } from "@/lib/classes/math";
import { readDraw } from "@/lib/classes/draw";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function startLogin(input: { firstName: string; lastName: string; grade: string; field?: string; mobile: string }) {
  return startClassOtp({ ...input, ip: await ip() });
}

export async function verifyLogin(otpId: string, code: string, next: string) {
  const res = await verifyClassOtp(otpId, code, await ip());
  if (!res.ok) return res;
  return { ok: true as const, next: safeNext(next) };
}

export async function logoutClass() {
  await clearClassSession();
  redirect("/classes");
}

export async function enrollAction(courseId: string) {
  const student = await getClassStudent();
  const course = await prisma.classCourse.findUnique({ where: { id: courseId } });
  if (!course || !course.published) redirect("/classes");
  if (!student) redirect(`/classes/login?next=${encodeURIComponent(`/classes/${course.slug}`)}`);
  if (chargeRials(course) > 0) redirect(`/classes/${course.slug}?e=pay`);
  await prisma.classEnrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId } },
    create: { studentId: student.id, courseId, source: "FREE" },
    update: {},
  });
  redirect(`/classes/${course.slug}?ok=1`);
}

export async function checkoutAction(courseId: string) {
  const student = await getClassStudent();
  const course = await prisma.classCourse.findUnique({ where: { id: courseId } });
  if (!course) redirect("/classes");
  if (!student) redirect(`/classes/login?next=${encodeURIComponent(`/classes/${course.slug}`)}`);
  const res = await startCoursePayment(student.id, courseId);
  if (!res.ok) redirect(`/classes/${course.slug}?e=${encodeURIComponent(res.error)}`);
  redirect(res.url);
}

export async function markSeenAction(lessonId: string) {
  const student = await getClassStudent();
  if (!student) return { ok: false as const, error: "برای ثبت پیشرفت وارد شو." };
  return markLessonSeen(student.id, lessonId);
}

export async function submitQuiz(token: string, answers: Record<string, string>) {
  const student = await getClassStudent();
  if (!student) return { ok: false as const, error: "برای آزمون وارد شو." };
  const sec = process.env.SESSION_SECRET;
  if (!sec) return { ok: false as const, error: "ورود موقتاً ممکن نیست." };
  const draw = readDraw(token, sec);
  if (!draw) return { ok: false as const, error: "این آزمون منقضی شده. صفحه را تازه کن." };
  if (!allow(`class:quiz:${student.id}`, 40, 10 * 60_000)) return { ok: false as const, error: "تعداد تلاش زیاد است. کمی بعد دوباره امتحان کن." };

  if (draw.kind === "lesson") {
    const lesson = await prisma.classLesson.findUnique({ where: { id: draw.ref }, include: { course: true } });
    if (!lesson) return { ok: false as const, error: "جلسه پیدا نشد." };
    const enrolled = await prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: lesson.courseId } } });
    if (!canWatchLesson({ published: lesson.published, coursePublished: lesson.course.published, freePreview: lesson.freePreview, loggedIn: true, enrolled: !!enrolled })) {
      return { ok: false as const, error: "اول باید این جلسه برایت باز باشد." };
    }
  } else {
    const course = await prisma.classCourse.findUnique({ where: { id: draw.ref } });
    if (!course?.published) return { ok: false as const, error: "دوره پیدا نشد." };
    const enrolled = await prisma.classEnrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } } });
    if (!enrolled && chargeRials(course) > 0) return { ok: false as const, error: "اول در دوره ثبت‌نام کن." };
    if (!enrolled && chargeRials(course) <= 0) return { ok: false as const, error: "اول ثبت‌نام رایگان را بزن." };
  }

  const banks = await prisma.bankQuestion.findMany({ where: { externalId: { in: draw.ids }, active: true }, include: { options: true } });
  const manuals = await prisma.quizQuestion.findMany({ where: { id: { in: draw.ids }, published: true }, include: { choices: true } });
  const bankBy = new Map(banks.map((q) => [q.externalId, q]));
  const manualBy = new Map(manuals.map((q) => [q.id, q]));
  let score = 0;
  const items = draw.ids.map((id) => {
    const bank = bankBy.get(id);
    if (bank) {
      const chosen = bank.options.find((c) => c.id === answers[id]);
      const right = bank.options.find((c) => c.correct);
      const correct = !!chosen && chosen.correct;
      if (correct) score += 1;
      return {
        id,
        correct,
        explanationHtml: bank.solution ? renderMath(bank.solution) : "",
        choiceHtml: right ? renderMath(right.text) : "",
        images: bank.solutionPaths,
      };
    }
    const manual = manualBy.get(id);
    const chosen = manual?.choices.find((c) => c.id === answers[id]);
    const right = manual?.choices.find((c) => c.correct);
    const correct = !!manual && !!chosen && chosen.correct;
    if (correct) score += 1;
    return { id, correct, explanationHtml: manual?.explanation ? renderMath(manual.explanation) : "", choiceHtml: right ? renderMath(right.text) : "", images: [] as string[] };
  });
  const total = draw.ids.length;
  if (draw.kind === "lesson") {
    await prisma.quizAttempt.create({ data: { studentId: student.id, lessonId: draw.ref, score, total, answers } });
    const lesson = await prisma.classLesson.findUnique({ where: { id: draw.ref }, select: { courseId: true } });
    const points = await noteQuiz(student.id, draw.ref, score, total);
    if (lesson) await maybeCompleteCourse(student.id, lesson.courseId);
    return { ok: true as const, review: { score, total, points, items } };
  }
  await prisma.quizAttempt.create({ data: { studentId: student.id, courseId: draw.ref, score, total, answers } });
  return { ok: true as const, review: { score, total, points: 0, items } };
}

export async function askQuestion(lessonId: string, fd: FormData) {
  const body = String(fd.get("body") || "");
  const student = await getClassStudent();
  const lesson = await prisma.classLesson.findUnique({ where: { id: lessonId }, include: { course: { select: { slug: true, published: true } } } });
  if (!lesson || !lesson.course.published) return;
  const back = `/classes/${lesson.course.slug}/${lesson.aparatHash}`;
  if (!student) redirect(`/classes/login?next=${encodeURIComponent(back)}`);
  const text = body.trim().slice(0, 1000);
  if (text.length < 5) redirect(`${back}?e=${encodeURIComponent("سؤال را کمی کامل‌تر بنویس.")}`);
  if (!allow(`class:qa:${student.id}`, 5, 60 * 60_000)) redirect(`${back}?e=${encodeURIComponent("سؤال‌های زیادی فرستادی. کمی بعد دوباره بنویس.")}`);
  await prisma.classThread.create({ data: { lessonId, studentId: student.id, body: text, status: "PENDING" } });
  redirect(`${back}?ok=ask`);
}
