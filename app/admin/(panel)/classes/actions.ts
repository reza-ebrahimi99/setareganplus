"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm, logAction } from "@/lib/auth";
import { b, n, s, sn, imageField } from "@/lib/admin";
import { FIELDS, GRADES, MAX_QUIZ_QUESTIONS, PREMIUM_LIST_PRICE_RIALS, SEED_LIST_PRICE_RIALS, isFieldId, isGrade, parseAparatHash } from "@/lib/classes/catalog";
import { parseQbank } from "@/lib/classes/qbank";
import { saveClassPdf } from "@/lib/classes/files";
import { normalizeIranMobile } from "@/lib/format";
import { ensureDefaultChapters, readChapterCatalog, syncQbank } from "@/lib/classes/bank-sync";

function checked(fd: FormData, name: string) {
  return fd.getAll(name).map(String).filter(Boolean);
}

export async function saveCourse(fd: FormData) {
  const me = await requirePerm("classes.manage");
  const id = s(fd, "id");
  const priceToman = Math.max(0, n(fd, "priceToman"));
  const saleRaw = s(fd, "saleToman");
  const data = {
    title: s(fd, "title"),
    slug: s(fd, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""),
    summary: sn(fd, "summary"),
    intro: sn(fd, "intro"),
    teacher: s(fd, "teacher") || "مهندس رضا ابراهیمی",
    grades: checked(fd, "grades").filter(isGrade),
    fields: checked(fd, "fields").filter(isFieldId),
    priceRials: priceToman * 10,
    salePriceRials: saleRaw ? Math.max(0, n(fd, "saleToman")) * 10 : null,
    isFree: b(fd, "isFree"),
    isPremium: b(fd, "isPremium"),
    bookletSlug: s(fd, "bookletSlug"),
    suggestConsult: b(fd, "suggestConsult"),
    published: b(fd, "published"),
    sortOrder: n(fd, "sortOrder"),
  };
  if (!data.title || !data.slug) return;
  const current = id ? await prisma.classCourse.findUnique({ where: { id } }) : null;
  const cover = await imageField(fd, "cover", current?.cover ?? null, "class-covers", 1400);
  const row = id
    ? await prisma.classCourse.update({ where: { id }, data: { ...data, cover } })
    : await prisma.classCourse.create({ data: { ...data, cover, kind: "TOPIC" } });
  if (data.isPremium) await applyPremiumPrice(row.id);
  await logAction(me, "class.course", data.title, row.id);
  revalidatePath("/classes");
  revalidatePath(`/classes/${row.slug}`);
  redirect(`/admin/classes/${row.id}?ok=1`);
}

export async function addLesson(fd: FormData) {
  const me = await requirePerm("classes.manage");
  const courseId = s(fd, "courseId");
  const hash = parseAparatHash(s(fd, "link"));
  const course = await prisma.classCourse.findUnique({ where: { id: courseId } });
  if (!course || !hash) redirect(`/admin/classes/${courseId}?e=link`);
  const title = s(fd, "title") || `جلسه ${hash}`;
  const premium = b(fd, "isPremium");
  const row = await prisma.classLesson.upsert({
    where: { aparatHash: hash },
    create: { courseId, aparatHash: hash, title, description: sn(fd, "description"), durationSec: n(fd, "durationMin") ? n(fd, "durationMin") * 60 : null, freePreview: b(fd, "freePreview"), isPremium: premium, sortOrder: n(fd, "sortOrder"), grades: course.grades, fields: course.fields, published: true },
    update: { courseId, title, freePreview: b(fd, "freePreview"), isPremium: premium, sortOrder: n(fd, "sortOrder"), published: true },
  });
  if (premium) await applyPremiumPrice(course.id);
  await logAction(me, "class.lesson", title, row.id);
  revalidatePath(`/classes/${course.slug}`);
  redirect(`/admin/classes/lessons/${row.id}?ok=1`);
}

export async function saveLesson(fd: FormData) {
  const me = await requirePerm("classes.manage");
  const id = s(fd, "id");
  const row = await prisma.classLesson.update({
    where: { id },
    data: {
      title: s(fd, "title"),
      description: sn(fd, "description"),
      durationSec: n(fd, "durationMin") ? n(fd, "durationMin") * 60 : null,
      freePreview: b(fd, "freePreview"),
      sortOrder: n(fd, "sortOrder"),
      published: b(fd, "published"),
      isPremium: b(fd, "isPremium"),
      courseId: s(fd, "courseId") || undefined,
      grades: checked(fd, "grades").filter(isGrade),
      fields: checked(fd, "fields").filter(isFieldId),
    },
  });
  await logAction(me, "class.lesson", row.title, row.id);
  if (row.isPremium) await applyPremiumPrice(row.courseId);
  redirect(`/admin/classes/lessons/${row.id}?ok=1`);
}

async function applyPremiumPrice(courseId: string) {
  const course = await prisma.classCourse.findUnique({ where: { id: courseId }, select: { isFree: true, priceRials: true } });
  if (!course?.isFree) return;
  if (course.priceRials === 0 || course.priceRials === SEED_LIST_PRICE_RIALS) {
    await prisma.classCourse.update({ where: { id: courseId }, data: { priceRials: PREMIUM_LIST_PRICE_RIALS } });
  }
}

export async function setLessonPremium(fd: FormData) {
  await requirePerm("classes.manage");
  const id = s(fd, "id");
  const isPremium = b(fd, "isPremium");
  const row = await prisma.classLesson.update({ where: { id }, data: { isPremium }, select: { courseId: true, course: { select: { slug: true } } } });
  if (isPremium) await applyPremiumPrice(row.courseId);
  revalidatePath(`/classes/${row.course.slug}`);
  revalidatePath("/classes");
  redirect(`/admin/classes/${row.courseId}?ok=1`);
}

export async function deleteLesson(fd: FormData) {
  await requirePerm("classes.manage");
  const id = s(fd, "id");
  const row = await prisma.classLesson.delete({ where: { id } });
  redirect(`/admin/classes/${row.courseId}?ok=1`);
}

export async function addQuestion(fd: FormData) {
  await requirePerm("classes.manage");
  const lessonId = s(fd, "lessonId");
  const count = await prisma.quizQuestion.count({ where: { lessonId, published: true } });
  if (count >= MAX_QUIZ_QUESTIONS) redirect(`/admin/classes/lessons/${lessonId}?e=max`);
  const choices = [0, 1, 2, 3].map((i) => ({ text: s(fd, `c${i}`), correct: s(fd, "correct") === String(i) })).filter((c) => c.text);
  if (choices.length < 2 || choices.filter((c) => c.correct).length !== 1 || !s(fd, "prompt")) redirect(`/admin/classes/lessons/${lessonId}?e=quiz`);
  await prisma.quizQuestion.create({
    data: { lessonId, prompt: s(fd, "prompt"), explanation: sn(fd, "explanation"), sortOrder: count, choices: { create: choices.map((c, i) => ({ ...c, sortOrder: i })) } },
  });
  redirect(`/admin/classes/lessons/${lessonId}?ok=1`);
}

export async function deleteQuestion(fd: FormData) {
  await requirePerm("classes.manage");
  const id = s(fd, "id");
  const row = await prisma.quizQuestion.delete({ where: { id } });
  redirect(`/admin/classes/lessons/${row.lessonId}?ok=1`);
}

export async function saveFile(fd: FormData) {
  await requirePerm("classes.manage");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size <= 0) return;
  const saved = await saveClassPdf(file);
  const courseId = s(fd, "courseId") || null;
  const lessonId = s(fd, "lessonId") || null;
  await prisma.classFile.create({ data: { title: s(fd, "title") || saved.name, fileName: saved.name, storageKey: saved.key, bytes: saved.bytes, courseId, lessonId, published: true } });
  redirect(lessonId ? `/admin/classes/lessons/${lessonId}?ok=1` : `/admin/classes/${courseId}?ok=1`);
}

export async function manualEnroll(fd: FormData) {
  const me = await requirePerm("classes.manage");
  const courseId = s(fd, "courseId");
  const mobile = normalizeIranMobile(s(fd, "mobile"));
  if (!mobile) redirect(`/admin/classes/${courseId}?e=mobile`);
  const student = await prisma.classStudent.findUnique({ where: { mobile } });
  if (!student) redirect(`/admin/classes/${courseId}?e=nostudent`);
  await prisma.classEnrollment.upsert({ where: { studentId_courseId: { studentId: student.id, courseId } }, create: { studentId: student.id, courseId, source: "ADMIN" }, update: {} });
  await logAction(me, "class.enroll", mobile, courseId);
  redirect(`/admin/classes/${courseId}?ok=1`);
}

export async function importQuestions(fd: FormData) {
  const me = await requirePerm("classes.manage");
  let parsed: unknown;
  const file = fd.get("file");
  const text = file instanceof File && file.size > 0 ? await file.text() : s(fd, "json");
  try {
    parsed = JSON.parse(text);
  } catch {
    redirect("/admin/classes/import?e=json");
  }
  const q = parseQbank(parsed);
  if (!q.ok) redirect(`/admin/classes/import?e=${encodeURIComponent(q.error)}`);
  let nOk = 0;
  let skipped = 0;
  for (const item of q.file.questions) {
    const lesson = await prisma.classLesson.findUnique({ where: { aparatHash: item.lessonHash } });
    if (!lesson) {
      skipped++;
      continue;
    }
    const existing = await prisma.quizQuestion.findUnique({ where: { externalId: item.externalId } });
    const count = await prisma.quizQuestion.count({ where: { lessonId: lesson.id, published: true, NOT: existing ? { id: existing.id } : undefined } });
    if (!existing && count >= MAX_QUIZ_QUESTIONS) {
      skipped++;
      continue;
    }
    if (existing) {
      await prisma.quizChoice.deleteMany({ where: { questionId: existing.id } });
      await prisma.quizQuestion.update({
        where: { id: existing.id },
        data: { lessonId: lesson.id, prompt: item.prompt, explanation: item.explanation, published: item.published, choices: { create: item.choices.map((c, i) => ({ text: c.text, correct: c.correct, sortOrder: i })) } },
      });
    } else {
      await prisma.quizQuestion.create({
        data: { lessonId: lesson.id, externalId: item.externalId, prompt: item.prompt, explanation: item.explanation, published: item.published, sortOrder: count, choices: { create: item.choices.map((c, i) => ({ text: c.text, correct: c.correct, sortOrder: i })) } },
      });
    }
    nOk++;
  }
  await logAction(me, "class.qbank", `${nOk} سؤال`, q.file.source || "json");
  redirect(`/admin/classes/import?ok=${nOk}&skip=${skipped}`);
}

export async function replyThread(fd: FormData) {
  const me = await requirePerm("classes.manage");
  const id = s(fd, "id");
  const body = s(fd, "body");
  if (body) await prisma.classReply.create({ data: { threadId: id, body, author: me.name } });
  const status = s(fd, "status");
  if (status === "PUBLISHED" || status === "HIDDEN" || status === "PENDING") await prisma.classThread.update({ where: { id }, data: { status } });
  redirect("/admin/classes/threads?ok=1");
}

export async function savePath(fd: FormData) {
  await requirePerm("classes.manage");
  const grade = s(fd, "grade");
  const field = s(fd, "field");
  if (!isGrade(grade)) return;
  const title = s(fd, "title") || `مسیر ${grade}`;
  const slugs = s(fd, "slugs").split("\n").map((x) => x.trim()).filter(Boolean);
  const courses = await prisma.classCourse.findMany({ where: { slug: { in: slugs } } });
  const by = new Map(courses.map((c) => [c.slug, c]));
  const path = await prisma.classPath.upsert({
    where: { grade_field: { grade, field } },
    create: { grade, field, title, published: b(fd, "published") },
    update: { title, published: b(fd, "published") },
  });
  await prisma.classPathStep.deleteMany({ where: { pathId: path.id } });
  let i = 0;
  for (const slug of slugs) {
    const course = by.get(slug);
    if (!course) continue;
    await prisma.classPathStep.create({ data: { pathId: path.id, courseId: course.id, sortOrder: i++ } });
  }
  redirect("/admin/classes/paths?ok=1");
}

export async function saveChapters(fd: FormData) {
  await requirePerm("classes.manage");
  const courseId = s(fd, "courseId");
  const lessonId = s(fd, "lessonId");
  const codes = [...new Set(s(fd, "codes").split(/[\s,]+/).map((c) => c.trim()).filter((c) => /^[A-Za-z0-9-]{2,24}$/.test(c)))];
  await prisma.classChapter.deleteMany({ where: { courseId, lessonId } });
  if (codes.length) await prisma.classChapter.createMany({ data: codes.map((code) => ({ courseId, lessonId, code })) });
  redirect(lessonId ? `/admin/classes/lessons/${lessonId}?ok=1` : `/admin/classes/${courseId}?ok=1`);
}

export async function syncBankNow() {
  await requirePerm("classes.manage");
  await ensureDefaultChapters(await readChapterCatalog());
  const result = await syncQbank({ maxQuestions: 2000 });
  if (!result.ok) redirect(`/admin/classes?e=${encodeURIComponent(result.error)}`);
  redirect(`/admin/classes?synced=${result.imported}`);
}
