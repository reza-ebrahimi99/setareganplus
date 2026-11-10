import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { allowedImageUrl, courseForChapter, normalizeBankItem, type BankDraft, type BankInput } from "./bank";
import { parseCsv } from "./csv";

function uploadRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./storage/uploads");
}

const PAGE = 1000;

export function qbankOrigin() {
  return (process.env.QBANK_API_URL || "https://qbank.setareganplus.ir").replace(/\/+$/, "");
}

function token() {
  return process.env.QBANK_API_TOKEN?.trim() || "";
}

async function saveRemote(url: string, name: string): Promise<string | null> {
  const origin = qbankOrigin();
  if (!allowedImageUrl(url, origin)) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const headers: Record<string, string> = { Accept: "image/*" };
    const key = token();
    if (key) headers.Authorization = `Bearer ${key}`;
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80 || buf.length > 8_000_000) return null;
    const dir = path.join(uploadRoot(), "public", "qbank");
    await mkdir(dir, { recursive: true });
    const file = `${name}.webp`;
    await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, file));
    return `/media/qbank/${file}`;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function upsertOne(draft: BankDraft) {
  const imagePath = draft.image ? await saveRemote(draft.image, `${draft.externalId}-q`) : null;
  const solutionPaths: string[] = [];
  for (let i = 0; i < draft.solutionImages.length; i++) {
    const saved = await saveRemote(draft.solutionImages[i], `${draft.externalId}-s-${i}`);
    if (saved) solutionPaths.push(saved);
  }
  await prisma.bankOption.deleteMany({ where: { questionId: draft.externalId } });
  await prisma.bankQuestion.upsert({
    where: { externalId: draft.externalId },
    create: {
      externalId: draft.externalId,
      grade: draft.grade,
      field: draft.field,
      difficulty: draft.difficulty,
      chapters: draft.chapters,
      prompt: draft.prompt,
      solution: draft.solution,
      sourceLabel: draft.sourceLabel,
      imagePath,
      solutionPaths,
      active: true,
      options: { create: draft.options.map((o, i) => ({ text: o.text, correct: o.correct, sortOrder: i })) },
    },
    update: {
      grade: draft.grade,
      field: draft.field,
      difficulty: draft.difficulty,
      chapters: draft.chapters,
      prompt: draft.prompt,
      solution: draft.solution,
      sourceLabel: draft.sourceLabel,
      ...(imagePath ? { imagePath } : {}),
      ...(solutionPaths.length ? { solutionPaths } : {}),
      active: true,
      options: { create: draft.options.map((o, i) => ({ text: o.text, correct: o.correct, sortOrder: i })) },
    },
  });
}

export async function importBankItems(items: BankInput[]) {
  let imported = 0;
  let skipped = 0;
  let maxId = 0;
  for (const raw of items) {
    const id = Number(raw.id);
    if (Number.isFinite(id)) maxId = Math.max(maxId, id);
    if (raw.needs_review) {
      skipped++;
      if (Number.isFinite(id)) await prisma.bankQuestion.updateMany({ where: { externalId: String(id) }, data: { active: false } });
      continue;
    }
    const draft = normalizeBankItem(raw);
    if (!draft) {
      skipped++;
      continue;
    }
    await upsertOne(draft);
    imported++;
  }
  return { imported, skipped, maxId };
}

export async function syncQbank(opts: { maxQuestions?: number } = {}) {
  const key = token();
  if (!key) return { ok: false as const, error: "QBANK_API_TOKEN در env سرور نیست." };
  const cap = opts.maxQuestions ?? Number.POSITIVE_INFINITY;
  const cursor = await prisma.bankSync.findUnique({ where: { id: "main" } });
  let sinceId = cursor?.sinceId ?? 0;
  let imported = 0;
  let skipped = 0;
  let offset = 0;
  while (imported + skipped < cap) {
    const url = new URL("/api/v1/questions/", qbankOrigin() + "/");
    url.searchParams.set("since_id", String(sinceId));
    url.searchParams.set("limit", String(PAGE));
    url.searchParams.set("offset", String(offset));
    const res = await fetch(url, { headers: { Accept: "application/json", Authorization: `Bearer ${key}` } });
    if (res.status === 401) return { ok: false as const, error: "بانک سؤال این درخواست را نپذیرفت." };
    if (!res.ok) return { ok: false as const, error: "دریافت سؤال‌ها ممکن نشد.", imported, skipped };
    const body = (await res.json()) as { results?: BankInput[] };
    const results = Array.isArray(body.results) ? body.results : [];
    if (results.length === 0) break;
    const slice = results.slice(0, Math.max(0, cap - imported - skipped));
    const done = await importBankItems(slice);
    imported += done.imported;
    skipped += done.skipped;
    sinceId = Math.max(sinceId, done.maxId);
    if (results.length < PAGE || slice.length < results.length) break;
    offset += results.length;
  }
  await prisma.bankSync.upsert({
    where: { id: "main" },
    create: { id: "main", sinceId, imported, skipped, note: "api" },
    update: { sinceId, imported: (cursor?.imported ?? 0) + imported, skipped: (cursor?.skipped ?? 0) + skipped, note: "api", ranAt: new Date() },
  });
  return { ok: true as const, imported, skipped, sinceId };
}

export async function ensureDefaultChapters(rows: { code: string; title: string }[]) {
  const courses = await prisma.classCourse.findMany({ where: { kind: "TOPIC" }, select: { id: true, slug: true } });
  let added = 0;
  for (const course of courses) {
    const have = await prisma.classChapter.count({ where: { courseId: course.id, lessonId: "" } });
    if (have > 0) continue;
    const codes = rows.filter((r) => courseForChapter(r.title) === course.slug);
    for (const row of codes) {
      await prisma.classChapter.create({ data: { courseId: course.id, lessonId: "", code: row.code } });
      added++;
    }
  }
  return added;
}

export async function readChapterCatalog() {
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), "prisma/class-seed/chapters.csv");
  const text = await readFile(file, "utf8");
  return parseCsv(text).map((r) => ({ code: r.code, title: r.title, grade: r.grade, count: r.count }));
}
