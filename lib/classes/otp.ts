import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/shop/sms";
import { allow } from "@/lib/shop/ratelimit";
import { normalizeIranMobile } from "@/lib/format";
import { DEFAULT_OTP_TEMPLATE_ID } from "@/lib/quiz/settings";
import { devOtpAllowed, isFieldId, isGrade, MAJOR_GRADES } from "./catalog";
import { setClassSession } from "./session";

const TTL = 5 * 60_000;
const COOLDOWN = 60_000;

function hashOtp(code: string, mobile: string) {
  const sec = process.env.SESSION_SECRET || "class-otp";
  return createHmac("sha256", sec).update(`class-otp:v1:${mobile}:${code}`).digest("hex");
}

export type StartResult = { ok: true; otpId: string; devCode?: string } | { ok: false; error: string };

export async function startClassOtp(input: { firstName: string; lastName: string; grade: string; field?: string | null; mobile: string; ip: string }): Promise<StartResult> {
  const mobile = normalizeIranMobile(input.mobile);
  if (!mobile) return { ok: false, error: "شماره موبایل معتبر نیست. مثلاً ۰۹۱۲۳۴۵۶۷۸۹." };
  const firstName = input.firstName.trim().slice(0, 40);
  const lastName = input.lastName.trim().slice(0, 40);
  if (firstName.length < 2 || lastName.length < 2) return { ok: false, error: "نام و نام خانوادگی را کامل وارد کنید." };
  if (!isGrade(input.grade)) return { ok: false, error: "پایه را از دوم ابتدایی تا کنکور انتخاب کنید." };
  const field = input.field?.trim() || "";
  if (MAJOR_GRADES.has(input.grade) && !isFieldId(field)) return { ok: false, error: "رشته را انتخاب کنید: ریاضی، تجربی یا انسانی." };
  if (field && !isFieldId(field)) return { ok: false, error: "رشته نامعتبر است." };
  if (!allow(`class:otp:ip:${input.ip || "x"}`, 20, 60 * 60_000)) return { ok: false, error: "از این اینترنت زیاد پیامک خواسته شده. کمی بعد دوباره تلاش کنید." };
  if (!allow(`class:otp:m:${mobile}`, 5, 60 * 60_000)) return { ok: false, error: "برای این شماره زیاد پیامک ارسال شده. یک ساعت دیگر تلاش کنید." };
  const latest = await prisma.classOtp.findFirst({ where: { mobile }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < COOLDOWN) {
    const wait = Math.ceil((COOLDOWN - (Date.now() - latest.createdAt.getTime())) / 1000);
    return { ok: false, error: `برای ارسال دوباره ${wait} ثانیه صبر کنید.` };
  }
  const code = String(randomInt(10000, 99999));
  const row = await prisma.classOtp.create({
    data: {
      mobile,
      codeHash: hashOtp(code, mobile),
      firstName,
      lastName,
      grade: input.grade,
      field: field || null,
      ip: input.ip.slice(0, 64),
      expiresAt: new Date(Date.now() + TTL),
    },
  });
  const sent = await sendSms("form", mobile, { CODE: code }, undefined, { templateId: DEFAULT_OTP_TEMPLATE_ID });
  const mock = !sent && devOtpAllowed(process.env.NODE_ENV);
  if (!sent && !mock) return { ok: false, error: "ارسال پیامک ممکن نشد. کمی بعد دوباره تلاش کنید." };
  return { ok: true, otpId: row.id, ...(mock ? { devCode: code } : {}) };
}

export async function verifyClassOtp(otpId: string, codeRaw: string, ip: string) {
  if (!allow(`class:otp:v:${ip || "x"}`, 30, 10 * 60_000)) return { ok: false as const, error: "تعداد تلاش زیاد است. چند دقیقه بعد دوباره امتحان کنید." };
  const code = codeRaw.replace(/\D/g, "").slice(0, 6);
  if (code.length < 4) return { ok: false as const, error: "کد تأیید را وارد کنید." };
  const row = await prisma.classOtp.findUnique({ where: { id: otpId } });
  if (!row) return { ok: false as const, error: "درخواست تأیید پیدا نشد. دوباره شماره را وارد کنید." };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false as const, error: "کد منقضی شده. دوباره پیامک بگیرید." };
  if (row.attempts >= 5) return { ok: false as const, error: "تعداد تلاش برای این کد تمام شد. دوباره پیامک بگیرید." };
  const ok = row.codeHash === hashOtp(code, row.mobile);
  await prisma.classOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 }, ...(ok ? { verifiedAt: new Date() } : {}) } });
  if (!ok) return { ok: false as const, error: "کد نادرست است." };
  const student = await prisma.classStudent.upsert({
    where: { mobile: row.mobile },
    create: { firstName: row.firstName, lastName: row.lastName, mobile: row.mobile, grade: row.grade, field: row.field, lastLoginAt: new Date() },
    update: { firstName: row.firstName, lastName: row.lastName, grade: row.grade, field: row.field, lastLoginAt: new Date() },
  });
  await setClassSession(student.id);
  return { ok: true as const, studentId: student.id };
}
