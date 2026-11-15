import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { allow } from "@/lib/shop/ratelimit";
import { normalizeIranMobile } from "@/lib/format";
import { SEED_QUESTIONS } from "./bank";
import { SKILLS, isJourneyGrade, needsField, skillBySlug } from "./catalog";
import { advance, applyAnswer, buildQueue, emptyState, isFinished, notesForStation, stationRatio, type BankQ, type RunState } from "./engine";

const COOKIE = "sp_safar";
const MAX_AGE = 60 * 60 * 24 * 30;

function randomSeed() {
  return randomBytes(8).toString("hex");
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set.");
  return "safar-dev-secret";
}

function sign(id: string) {
  return createHmac("sha256", secret()).update(`safar:v1:${id}`).digest("base64url");
}

export async function setJourneyCookie(id: string) {
  const jar = await cookies();
  jar.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readJourneyId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  const [id, mac] = raw.split(".");
  if (!id || !mac) return null;
  const expect = sign(id);
  if (mac.length !== expect.length) return null;
  let ok = 0;
  for (let i = 0; i < mac.length; i++) ok |= mac.charCodeAt(i) ^ expect.charCodeAt(i);
  return ok === 0 ? id : null;
}

let seeding: Promise<void> | null = null;

export function ensureJourneyBank() {
  seeding ??= seedBank();
  return seeding;
}

async function seedBank() {
  for (const skill of SKILLS) {
    await prisma.journeySkill.upsert({
      where: { slug: skill.slug },
      create: {
        slug: skill.slug,
        title: skill.title,
        taughtGrade: skill.taughtGrade,
        sortOrder: skill.sortOrder,
        prereqSlug: skill.prereq ?? null,
        courseSlug: skill.courseSlug ?? null,
        fields: skill.fields,
      },
      update: {
        title: skill.title,
        taughtGrade: skill.taughtGrade,
        sortOrder: skill.sortOrder,
        prereqSlug: skill.prereq ?? null,
        courseSlug: skill.courseSlug ?? null,
        fields: skill.fields,
      },
    });
  }
  for (const item of SEED_QUESTIONS) {
    const exists = await prisma.journeyQuestion.findUnique({ where: { id: item.id }, select: { id: true } });
    if (exists) continue;
    await prisma.journeyQuestion.create({
      data: {
        id: item.id,
        skillSlug: item.skill,
        stem: item.stem,
        explain: item.explain,
        sortOrder: Number(item.id.split("-")[1] ?? 0),
        options: {
          create: item.options.map((o, i) => ({
            id: `${item.id}-${i}`,
            text: o.text,
            correct: !!o.ok,
            misconception: o.miss ?? "",
            sortOrder: i,
          })),
        },
      },
    });
  }
}

export async function loadBank(): Promise<BankQ[]> {
  await ensureJourneyBank();
  const rows = await prisma.journeyQuestion.findMany({
    where: { active: true, skill: { active: true } },
    orderBy: [{ skill: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  return rows.map((row) => ({
    id: row.id,
    skill: row.skillSlug,
    stem: row.stem,
    explain: row.explain,
    options: row.options.map((o) => ({ id: o.id, text: o.text, correct: o.correct, misconception: o.misconception })),
  }));
}

function asState(value: unknown): RunState {
  const v = value as RunState;
  if (!v || !Array.isArray(v.queue)) return emptyState([]);
  return { queue: v.queue, cursor: v.cursor ?? 0, qIndex: v.qIndex ?? 0, drilled: v.drilled ?? [], reveal: v.reveal ?? null };
}

export async function getRun() {
  const id = await readJourneyId();
  if (!id) return null;
  return prisma.journeyRun.findUnique({ where: { id }, include: { answers: true } });
}

export type StartInput = { name: string; mobile: string; parentMobile?: string; grade: number; field?: string; school?: string; ip?: string };

export async function startJourney(input: StartInput): Promise<{ ok: true; resumed: boolean } | { ok: false; error: string }> {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 3) return { ok: false, error: "نام و نام خانوادگی را بنویس." };
  const mobile = normalizeIranMobile(input.mobile);
  if (!mobile) return { ok: false, error: "شماره موبایل درست نیست. مثلاً ۰۹۱۲۳۴۵۶۷۸۹." };
  const parent = input.parentMobile?.trim() ? normalizeIranMobile(input.parentMobile) : "";
  if (input.parentMobile?.trim() && !parent) return { ok: false, error: "شماره همراه خانواده درست نیست." };
  if (!isJourneyGrade(input.grade)) return { ok: false, error: "پایه را از پنجم تا دوازدهم انتخاب کن." };
  const field = (input.field ?? "").trim();
  if (needsField(input.grade)) {
    if (!["riazi", "tajrobi", "ensani"].includes(field)) return { ok: false, error: "رشته را انتخاب کن: ریاضی، تجربی یا انسانی." };
  }
  if (!allow(`safar:ip:${input.ip || "x"}`, 12, 60 * 60_000)) return { ok: false, error: "از این اینترنت زیاد درخواست آمده. کمی بعد دوباره سر بزن." };
  await ensureJourneyBank();
  const open = await prisma.journeyRun.findFirst({ where: { mobile, status: "OPEN" }, orderBy: { updatedAt: "desc" } });
  if (open) {
    await setJourneyCookie(open.id);
    return { ok: true, resumed: true };
  }
  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const recent = await prisma.journeyRun.count({ where: { mobile, createdAt: { gte: since } } });
  if (recent >= 4) return { ok: false, error: "برای این شماره، امروز به اندازهٔ کافی سفر ثبت شده. فردا می‌توانی یکی تازه شروع کنی." };
  const week = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const finished = await prisma.journeyRun.count({ where: { mobile, status: "DONE", finishedAt: { gte: week } } });
  if (finished >= 3) return { ok: false, error: "این شماره این هفته سه سفر را تمام کرده. سفر قبلی‌ات در نقشهٔ قدرت‌ها مانده است." };
  const bank = await loadBank();
  const queue = buildQueue(input.grade, needsField(input.grade) ? field : "", bank, randomSeed());
  if (!queue.length) return { ok: false, error: "برای این پایه هنوز نشانه‌ای چیده نشده." };
  const run = await prisma.journeyRun.create({
    data: {
      name,
      mobile,
      parentMobile: parent || "",
      grade: input.grade,
      field: needsField(input.grade) ? field : "",
      school: (input.school ?? "").trim().slice(0, 80),
      state: emptyState(queue) as object,
      ip: (input.ip ?? "").slice(0, 64),
    },
  });
  await setJourneyCookie(run.id);
  return { ok: true, resumed: false };
}

export async function submitKey(optionId: string): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const run = await getRun();
  if (!run || run.status !== "OPEN") return { ok: false, error: "سفر پیدا نشد. از اول نقشه را باز کن." };
  const state = asState(run.state);
  const bankRows = await loadBank();
  const bank = new Map(bankRows.map((q) => [q.id, q]));
  const { state: next, saved } = applyAnswer(state, bank, optionId);
  if (!saved) return { ok: false, error: "این کلید با این معما جور نیست." };
  const dup = run.answers.some((a) => a.questionId === saved.questionId && a.drill === saved.drill);
  if (dup) return { ok: true, href: "/safar/go" };
  await prisma.journeyAnswer.create({
    data: {
      runId: run.id,
      questionId: saved.questionId,
      skillSlug: saved.skill,
      optionId: saved.optionId,
      correct: saved.correct,
      unknown: saved.unknown,
      misconception: saved.misconception,
      drill: saved.drill,
    },
  });
  if (next.reveal) {
    const station = next.queue[next.cursor];
    const answers = [...run.answers.map((a) => ({ questionId: a.questionId, optionId: a.optionId, unknown: a.unknown, correct: a.correct })), { questionId: saved.questionId, optionId: saved.optionId, unknown: saved.unknown, correct: saved.correct }];
    next.reveal.notes = station ? notesForStation(station, bank, answers) : [];
  }
  await prisma.journeyRun.update({ where: { id: run.id }, data: { state: next as object } });
  return { ok: true, href: "/safar/go" };
}

export async function continueJourney(): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const run = await getRun();
  if (!run || run.status !== "OPEN") return { ok: false, error: "سفر پیدا نشد." };
  const state = asState(run.state);
  if (!state.reveal) return { ok: true, href: "/safar/go" };
  const bankRows = await loadBank();
  const bySkill = new Map<string, string[]>();
  for (const q of bankRows) {
    const list = bySkill.get(q.skill) ?? [];
    list.push(q.id);
    bySkill.set(q.skill, list);
  }
  const station = state.queue[state.cursor];
  const answers = run.answers.filter((a) => station?.ids.includes(a.questionId));
  const ratio = station ? stationRatio(station, answers) : 1;
  const next = advance(state, bySkill, ratio, run.id);
  if (isFinished(next)) {
    await prisma.journeyRun.update({ where: { id: run.id }, data: { state: next as object, status: "DONE", finishedAt: new Date(), fresh: true } });
    await notifyFinished(run.id, run.name, run.grade, run.field, run.mobile);
    return { ok: true, href: "/safar/power" };
  }
  await prisma.journeyRun.update({ where: { id: run.id }, data: { state: next as object } });
  return { ok: true, href: "/safar/go" };
}

async function notifyFinished(id: string, name: string, grade: number, field: string, mobile: string) {
  const url = process.env.JOURNEY_WEBHOOK_URL?.trim();
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "journey-finished", id, name, grade, field, mobile }),
  }).catch(() => undefined);
}

export function skillTitle(slug: string) {
  return skillBySlug(slug)?.title ?? slug;
}

