import "server-only";
import { prisma } from "@/lib/prisma";
import { allow } from "@/lib/shop/ratelimit";
import { normalizeIranMobile } from "@/lib/format";
import { generateOtpCode, hashIp, hashOtpCode, hashesEqual } from "./access";
import { getConsultSettings } from "./settings";
import { dispatchConsultMessage } from "./sms-send";

const TTL_MS = 5 * 60_000;
const COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function startConsultOtp(mobileRaw: string, ip: string): Promise<{ ok: true; otpId: string; devCode?: string } | { ok: false; error: string }> {
  const key = secret();
  if (!key) return { ok: false, error: "تأیید شماره موقتاً در دسترس نیست." };
  const mobile = normalizeIranMobile(mobileRaw);
  if (!mobile) return { ok: false, error: "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)." };
  const ipHash = hashIp(ip || "unknown", key);
  if (!allow(`consult:otp:ip:${ipHash}`, 20, 60 * 60_000)) return { ok: false, error: "از این اینترنت زیاد پیامک خواسته شده؛ کمی بعد دوباره تلاش کنید." };
  if (!allow(`consult:otp:m:${mobile}`, 5, 60 * 60_000)) return { ok: false, error: "برای این شماره زیاد پیامک ارسال شده؛ یک ساعت دیگر تلاش کنید." };
  const latest = await prisma.consultOtp.findFirst({ where: { mobile }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000);
    return { ok: false, error: `برای ارسال دوباره ${wait} ثانیه صبر کنید.` };
  }
  const code = generateOtpCode();
  const row = await prisma.consultOtp.create({
    data: { mobile, codeHash: hashOtpCode(code, mobile, key), ipHash, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  const settings = await getConsultSettings();
  const sent = await dispatchConsultMessage({
    mobile,
    body: `کد تأیید مشاوره ستارگان: ${code}`,
    templateId: settings.otpTemplateId,
    params: { CODE: code },
  });
  await prisma.smsLog.create({ data: { kind: "consult", mobile, status: sent.status, detail: sent.status === "SENT" ? "otp" : sent.detail } }).catch(() => undefined);
  const allowDev = process.env.NODE_ENV !== "production" || process.env.CONSULT_ALLOW_DEV_OTP === "1";
  const mock = sent.status === "SKIPPED" && allowDev;
  if (sent.status !== "SENT" && !mock) {
    return { ok: false, error: "ارسال پیامک ممکن نشد. شناسهٔ قالب CODE را در تنظیمات مشاوره بگذارید یا کمی بعد دوباره تلاش کنید." };
  }
  return { ok: true, otpId: row.id, ...(mock ? { devCode: code } : {}) };
}

export async function assertOtpVerified(otpId: string, codeRaw: string, mobile: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = secret();
  if (!key) return { ok: false, error: "تأیید شماره موقتاً در دسترس نیست." };
  if (!allow(`consult:otp:v:${otpId}`, 8, 10 * 60_000)) return { ok: false, error: "تعداد تلاش برای این کد زیاد است؛ دوباره پیامک بگیرید." };
  const code = codeRaw.replace(/\D/g, "").slice(0, 6);
  if (code.length < 5) return { ok: false, error: "کد تأیید را کامل وارد کنید." };
  const row = await prisma.consultOtp.findUnique({ where: { id: otpId } });
  if (!row || row.mobile !== mobile) return { ok: false, error: "جلسهٔ تأیید پیدا نشد؛ دوباره شماره را وارد کنید." };
  if (row.usedAt) return { ok: false, error: "این کد قبلاً استفاده شده؛ دوباره پیامک بگیرید." };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "کد منقضی شده؛ دوباره پیامک بگیرید." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "تعداد تلاش برای این کد تمام شد؛ دوباره پیامک بگیرید." };
  const ok = hashesEqual(row.codeHash, hashOtpCode(code, mobile, key));
  if (!ok) {
    await prisma.consultOtp.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "کد نادرست است." };
  }
  if (!row.verifiedAt) await prisma.consultOtp.update({ where: { id: row.id }, data: { verifiedAt: new Date() } });
  return { ok: true };
}

/** Inside the booking transaction: an OTP can confirm only one reservation. */
export async function consumeOtp(tx: { consultOtp: { updateMany: typeof prisma.consultOtp.updateMany } }, otpId: string, mobile: string) {
  const updated = await tx.consultOtp.updateMany({ where: { id: otpId, mobile, usedAt: null, expiresAt: { gt: new Date() }, verifiedAt: { not: null } }, data: { usedAt: new Date() } });
  return updated.count === 1;
}
