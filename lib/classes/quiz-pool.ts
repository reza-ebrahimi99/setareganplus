import { prisma } from "@/lib/prisma";
import { pickForStudent } from "./bank";
import { signDraw } from "./draw";
import { renderMath } from "./math";
import { fa } from "@/lib/format";

function secret() {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function codesFor(courseId: string, lessonId = "") {
  const rows = await prisma.classChapter.findMany({ where: { courseId }, select: { lessonId: true, code: true } });
  const own = lessonId ? rows.filter((r) => r.lessonId === lessonId).map((r) => r.code) : [];
  const shared = rows.filter((r) => r.lessonId === "").map((r) => r.code);
  return [...new Set(own.length ? own : shared)];
}

export type ShownQuestion = {
  id: string;
  html: string;
  image: string | null;
  source: string | null;
  choices: { id: string; html: string }[];
};

export async function drawBankQuiz(opts: { courseId: string; lessonId?: string; field: string | null; count: number; kind: "lesson" | "practice"; ref: string; difficulty?: number }) {
  const sec = secret();
  if (!sec) return null;
  const codes = await codesFor(opts.courseId, opts.lessonId ?? "");
  if (!codes.length) return null;
  const poolAll = await prisma.bankQuestion.findMany({
    where: { active: true, chapters: { hasSome: codes } },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  const pool = opts.difficulty ? poolAll.filter((q) => q.difficulty === opts.difficulty) : poolAll;
  if (!pool.length) return null;
  const picked = pickForStudent(pool, opts.count, opts.field);
  if (!picked.length) return null;
  const token = signDraw({ kind: opts.kind, ref: opts.ref, ids: picked.map((q) => q.externalId), exp: Date.now() + 2 * 60 * 60 * 1000 }, sec);
  const questions: ShownQuestion[] = picked.map((q) => ({
    id: q.externalId,
    html: renderMath(q.prompt),
    image: q.imagePath,
    source: q.sourceLabel ? q.sourceLabel.replace(/\d+/g, (n) => fa(n)) : null,
    choices: q.options.map((c) => ({ id: c.id, html: renderMath(c.text) })),
  }));
  return { token, questions };
}
