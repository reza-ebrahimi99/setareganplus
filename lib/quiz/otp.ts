import "server-only";
import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/shop/sms";
import { allow } from "@/lib/shop/ratelimit";
import { normalizeIranMobile } from "@/lib/format";
import { getQuizSettings } from "./settings";

const OTP_TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_SEND_PER_MOBILE = 5; // per hour
const MAX_SEND_PER_IP = 20; // per hour

export function hashOtp(code: string, mobile: string) {
  return createHash("sha256").update(`${mobile}:${code}`).digest("hex");
}

function genCode() {
  return String(randomInt(10000, 99999)); // 5 digits
}

export type StartOtpInput = {
  firstName: string;
  lastName: string;
  grade: string;
  field?: string | null;
  mobile: string;
  referral?: string | null;
  ip?: string | null;
};

export type StartOtpResult =
  | { ok: true; otpId: string; cooldownSec: number; /** only in non-production when SMS is skipped */ devCode?: string; alreadyDone?: { rewardCode: string; archetype: string; firstName: string; lastName: string } }
  | { ok: false; error: string };

export async function startQuizOtp(input: StartOtpInput): Promise<StartOtpResult> {
  const mobile = normalizeIranMobile(input.mobile);
  if (!mobile) return { ok: false, error: "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)." };
  const firstName = input.firstName.trim().slice(0, 40);
  const lastName = input.lastName.trim().slice(0, 40);
  if (firstName.length < 2 || lastName.length < 2) return { ok: false, error: "نام و نام خانوادگی را کامل وارد کنید." };
  if (!input.grade.trim()) return { ok: false, error: "پایهٔ تحصیلی را انتخاب کنید." };

  const settings = await getQuizSettings();
  // Returning student: same phone → same result (no new OTP needed for re-view; still allow resume via verify path)
  const existing = await prisma.studyQuizLead.findUnique({ where: { mobile } });
  if (existing) {
    return {
      ok: true,
      otpId: "done",
      cooldownSec: 0,
      alreadyDone: { rewardCode: existing.rewardCode, archetype: existing.archetype, firstName: existing.firstName, lastName: existing.lastName },
    };
  }

  const ip = input.ip || "unknown";
  if (!allow(`quiz:ip:${ip}`, MAX_SEND_PER_IP, 60 * 60_000)) return { ok: false, error: "تعداد درخواست از این اینترنت زیاد است؛ کمی بعد دوباره تلاش کنید." };
  if (!allow(`quiz:m:${mobile}`, MAX_SEND_PER_MOBILE, 60 * 60_000)) return { ok: false, error: "برای این شماره زیاد پیامک ارسال شده؛ یک ساعت دیگر تلاش کنید." };

  const latest = await prisma.studyQuizOtp.findFirst({ where: { mobile }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
    return { ok: false, error: `برای ارسال دوباره ${wait} ثانیه صبر کنید.` };
  }

  const code = genCode();
  const row = await prisma.studyQuizOtp.create({
    data: {
      mobile,
      codeHash: hashOtp(code, mobile),
      firstName,
      lastName,
      grade: input.grade.trim(),
      field: input.field?.trim() || null,
      referral: input.referral?.trim().slice(0, 32) || null,
      ip,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  const sent = await sendSms("form", mobile, { CODE: code }, undefined, { templateId: settings.otpTemplateId });
  // Dev / pre-SMS-setup: show the code on-screen when SMS is off or QUIZ_ALLOW_DEV_OTP=1.
  // Never expose the code on a real production send path.
  const allowDevOtp = process.env.NODE_ENV !== "production" || process.env.QUIZ_ALLOW_DEV_OTP === "1";
  const mock = !sent && allowDevOtp;
  if (!sent && !mock) {
    return { ok: false, error: "ارسال پیامک ممکن نشد. قالب SMS تأیید را در پنل تنظیم کنید یا کمی بعد دوباره تلاش کنید." };
  }
  return { ok: true, otpId: row.id, cooldownSec: Math.floor(RESEND_COOLDOWN_MS / 1000), ...(mock ? { devCode: code } : {}) };
}

export type VerifyOtpResult =
  | { ok: true; sessionToken: string; alreadyDone?: { rewardCode: string; archetype: string; firstName: string; lastName: string } }
  | { ok: false; error: string };

/** Opaque session after OTP: base64url(otpId).mobileHash — validated on submit. */
export function makeSessionToken(otpId: string, mobile: string) {
  const sig = createHash("sha256").update(`${otpId}:${mobile}:${process.env.SESSION_SECRET || "x"}`).digest("base64url").slice(0, 16);
  return Buffer.from(JSON.stringify({ o: otpId, m: mobile, s: sig })).toString("base64url");
}

export function parseSessionToken(token: string): { otpId: string; mobile: string } | null {
  try {
    const raw = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as { o?: string; m?: string; s?: string };
    if (!raw?.o || !raw?.m || !raw?.s) return null;
    const sig = createHash("sha256").update(`${raw.o}:${raw.m}:${process.env.SESSION_SECRET || "x"}`).digest("base64url").slice(0, 16);
    if (sig !== raw.s) return null;
    return { otpId: raw.o, mobile: raw.m };
  } catch {
    return null;
  }
}

export async function verifyQuizOtp(otpId: string, codeRaw: string, ip?: string | null): Promise<VerifyOtpResult> {
  if (!allow(`quiz:v:${ip || "x"}`, 30, 10 * 60_000)) return { ok: false, error: "تعداد تلاش زیاد است؛ چند دقیقه بعد دوباره امتحان کنید." };
  const code = codeRaw.replace(/\D/g, "").slice(0, 6);
  if (code.length < 4) return { ok: false, error: "کد تأیید را وارد کنید." };

  // special path: already completed
  if (otpId === "done") return { ok: false, error: "این شماره قبلاً در تست شرکت کرده است." };

  const row = await prisma.studyQuizOtp.findUnique({ where: { id: otpId } });
  if (!row) return { ok: false, error: "جلسهٔ تأیید پیدا نشد؛ دوباره شماره را وارد کنید." };
  if (row.verifiedAt) return { ok: true, sessionToken: makeSessionToken(row.id, row.mobile) };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "کد منقضی شده؛ دوباره پیامک بگیرید." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "تعداد تلاش برای این کد تمام شد؛ دوباره پیامک بگیرید." };

  const ok = row.codeHash === hashOtp(code, row.mobile);
  await prisma.studyQuizOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 }, ...(ok ? { verifiedAt: new Date() } : {}) } });
  if (!ok) return { ok: false, error: "کد نادرست است." };

  const existing = await prisma.studyQuizLead.findUnique({ where: { mobile: row.mobile } });
  if (existing) {
    return {
      ok: true,
      sessionToken: makeSessionToken(row.id, row.mobile),
      alreadyDone: { rewardCode: existing.rewardCode, archetype: existing.archetype, firstName: existing.firstName, lastName: existing.lastName },
    };
  }
  return { ok: true, sessionToken: makeSessionToken(row.id, row.mobile) };
}
