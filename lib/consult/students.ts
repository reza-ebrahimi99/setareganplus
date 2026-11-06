import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/analytics/classify";
import { normalizeIranMobile } from "@/lib/format";
import {
  CODE_HOUR_MAX,
  CODE_HOUR_MS,
  CODE_WINDOW_MAX,
  CODE_WINDOW_MS,
  formatAccessCode,
  generateAccessCode,
  hashAccessCode,
  hashIp,
  hashesEqual,
  normalizeAccessCode,
  rateDecision,
} from "./access";
import { GENERIC_CODE_ERROR, RATE_LIMIT_ERROR, isGradeId } from "./constants";
import { maskMobile } from "./text";

const COOKIE = "sp_cstu";
const TTL_MS = 2 * 60 * 60_000;

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

function sign(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export type StudentSession = {
  id: string;
  fullName: string;
  grade: string | null;
  hasPhone: boolean;
  maskedPhone: string;
};

export async function requestIp(): Promise<string> {
  const h = await headers();
  return clientIp({ get: (n) => h.get(n) }) || "unknown";
}

async function overLimit(ipHash: string): Promise<boolean> {
  const now = Date.now();
  const [recent, hour] = await Promise.all([
    prisma.consultCodeAttempt.count({ where: { ipHash, createdAt: { gte: new Date(now - CODE_WINDOW_MS) } } }),
    prisma.consultCodeAttempt.count({ where: { ipHash, createdAt: { gte: new Date(now - CODE_HOUR_MS) } } }),
  ]);
  return rateDecision(recent, CODE_WINDOW_MAX) === "block" || rateDecision(hour, CODE_HOUR_MAX) === "block";
}

export async function verifyStudentCode(raw: string, ip: string): Promise<{ ok: true; student: StudentSession } | { ok: false; error: string }> {
  const key = secret();
  if (!key) return { ok: false, error: "ورود دانش‌آموز موقتاً در دسترس نیست. با آموزشگاه تماس بگیرید." };
  const ipHash = hashIp(ip || "unknown", key);
  if (await overLimit(ipHash)) return { ok: false, error: RATE_LIMIT_ERROR };
  const code = normalizeAccessCode(raw);
  if (!code) {
    await prisma.consultCodeAttempt.create({ data: { ipHash, ok: false } });
    return { ok: false, error: GENERIC_CODE_ERROR };
  }
  const codeHash = hashAccessCode(code, key);
  const row = await prisma.enrolledStudent.findUnique({ where: { codeHash } });
  const match = !!row && row.active && hashesEqual(row.codeHash, codeHash);
  await prisma.consultCodeAttempt.create({ data: { ipHash, ok: match } });
  if (!match || !row) return { ok: false, error: GENERIC_CODE_ERROR };
  await writeCookie(row.id, row.codeVersion, key);
  return { ok: true, student: toSession(row) };
}

function toSession(row: { id: string; fullName: string; grade: string | null; mobile: string | null }): StudentSession {
  const mobile = row.mobile ? normalizeIranMobile(row.mobile) : null;
  return { id: row.id, fullName: row.fullName, grade: row.grade && isGradeId(row.grade) ? row.grade : row.grade, hasPhone: !!mobile, maskedPhone: mobile ? maskMobile(mobile) : "" };
}

async function writeCookie(id: string, version: number, key: string) {
  const payload = Buffer.from(JSON.stringify({ id, v: version, exp: Date.now() + TTL_MS })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export async function clearStudentCookie() {
  (await cookies()).delete(COOKIE);
}

export async function getStudentSession(): Promise<(StudentSession & { mobile: string | null; codeVersion: number }) | null> {
  const key = secret();
  if (!key) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(payload, key);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  let parsed: { id?: unknown; v?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof parsed.id !== "string" || typeof parsed.v !== "number" || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
  const row = await prisma.enrolledStudent.findUnique({ where: { id: parsed.id } });
  if (!row || !row.active || row.codeVersion !== parsed.v) return null;
  const mobile = row.mobile ? normalizeIranMobile(row.mobile) : null;
  return { ...toSession({ ...row, mobile }), mobile, codeVersion: row.codeVersion };
}

export async function issueStudentCode(input: { fullName: string; mobile: string | null; grade: string | null; note: string | null }) {
  const key = secret();
  if (!key) return { ok: false as const, error: "SESSION_SECRET تنظیم نشده؛ ساخت کد ممکن نیست." };
  const name = input.fullName.trim().replace(/\s+/g, " ");
  if (name.length < 2) return { ok: false as const, error: "نام دانش‌آموز را کامل بنویسید." };
  const code = generateAccessCode();
  const row = await prisma.enrolledStudent.create({
    data: {
      fullName: name.slice(0, 80),
      mobile: input.mobile,
      grade: input.grade,
      note: input.note,
      codeHash: hashAccessCode(code, key),
      codeSuffix: code.slice(-4),
    },
  });
  return { ok: true as const, id: row.id, code: formatAccessCode(code), name: row.fullName };
}

export async function rotateStudentCode(id: string) {
  const key = secret();
  if (!key) return { ok: false as const, error: "SESSION_SECRET تنظیم نشده؛ ساخت کد ممکن نیست." };
  const code = generateAccessCode();
  const row = await prisma.enrolledStudent.update({
    where: { id },
    data: { codeHash: hashAccessCode(code, key), codeSuffix: code.slice(-4), codeVersion: { increment: 1 } },
  });
  return { ok: true as const, code: formatAccessCode(code), name: row.fullName };
}
