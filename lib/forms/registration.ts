import "server-only";
import { prisma } from "@/lib/prisma";
import type { Form, Prisma } from "@/generated/prisma/client";
import { normalizeIranMobile, toEn } from "@/lib/format";
import { siteUrl, formatToman } from "@/lib/shop/config";
import { newToken } from "@/lib/shop/orders";
import { zibalRequest, zibalVerify, startUrl } from "@/lib/shop/zibal";
import { sendSms } from "@/lib/shop/sms";
import { getShopSettings } from "@/lib/shop/settings";
import { submissionRef } from "@/lib/submissions";
import { parseFields, type FieldDef, type FormValues } from "./types";
import type { Discount } from "./pricing";

// ---------- settings (kept in the DB: no new env vars) ----------
export type FormsSms = { confirmTemplateId: number | null; adminMobiles: string[] };
const SMS_KEY = "formsSms";
export async function getFormsSms(): Promise<FormsSms> {
  const row = await prisma.setting.findUnique({ where: { key: SMS_KEY } });
  const v = (row?.value ?? {}) as Partial<FormsSms>;
  return { confirmTemplateId: Number(v.confirmTemplateId) > 0 ? Number(v.confirmTemplateId) : null, adminMobiles: Array.isArray(v.adminMobiles) ? v.adminMobiles.map(String) : [] };
}
export async function saveFormsSms(v: FormsSms) {
  await prisma.setting.upsert({ where: { key: SMS_KEY }, create: { key: SMS_KEY, value: v as object }, update: { value: v as object } });
}

// ---------- helpers ----------
export const receiptPath = (token: string) => `/f/r/${encodeURIComponent(token)}`;
export const formCallbackUrl = (token: string) => `${siteUrl()}/f/pay/callback?token=${encodeURIComponent(token)}`;

/** Registrant name / mobile / national code from the answers (first matching fields). */
export function identity(fields: FieldDef[], data: FormValues | Record<string, unknown>) {
  const str = (id?: string) => (id && typeof data[id] === "string" ? (data[id] as string) : "");
  const nameField = fields.find((f) => f.type === "text" && /نام/.test(f.label)) ?? fields.find((f) => f.type === "text");
  const mobile = normalizeIranMobile(str(fields.find((f) => f.type === "phone" && str(f.id))?.id)) ?? null;
  const nc = toEn(str(fields.find((f) => f.type === "nationalCode" && str(f.id))?.id)).replace(/\D/g, "") || null;
  return { name: str(nameField?.id).trim(), mobile, nationalCode: nc };
}

export const normCode = (raw: string) => toEn(raw).trim().toUpperCase().replace(/\s+/g, "");

/** A usable discount code for a form, or an error message. */
export async function findDiscount(formId: string, raw: string): Promise<{ ok: true; d: Discount & { id: string } } | { ok: false; error: string }> {
  const code = normCode(raw);
  if (!code) return { ok: false, error: "کد تخفیف را وارد کنید." };
  const d = await prisma.formDiscount.findUnique({ where: { formId_code: { formId, code } } });
  if (!d || !d.active) return { ok: false, error: "کد تخفیف معتبر نیست." };
  if (d.expiresAt && d.expiresAt < new Date()) return { ok: false, error: "مهلت این کد تخفیف تمام شده است." };
  if (d.maxUses != null && d.used >= d.maxUses) return { ok: false, error: "ظرفیت این کد تخفیف تکمیل شده است." };
  return { ok: true, d: { id: d.id, code: d.code, percent: d.percent, amountRials: d.amountRials } };
}

// ---------- payment ----------
export type PayOutcome = { kind: "paid" | "failed" | "pending"; receipt?: string; message?: string };

/** New Zibal attempt for an unpaid registration → gateway URL. */
export async function startFormPayment(submissionId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId }, include: { form: true } });
  if (!sub) return { ok: false, error: "ثبت‌نام پیدا نشد." };
  if (sub.payState === "PAID") return { ok: false, error: "این ثبت‌نام قبلاً پرداخت شده است." };
  if (sub.payState === "NONE" || sub.amountRials <= 0) return { ok: false, error: "این ثبت‌نام نیازی به پرداخت ندارد." };
  const token = newToken(24);
  const pay = await prisma.formPayment.create({ data: { submissionId: sub.id, amountRials: sub.amountRials, token } });
  const r = await zibalRequest({
    amountRials: sub.amountRials,
    callbackUrl: formCallbackUrl(token),
    orderId: `F${submissionRef(sub.id)}-${pay.id.slice(-4)}`,
    mobile: sub.mobile ?? undefined,
    description: `ثبت‌نام: ${sub.form.title}`,
  });
  if (!r.ok) {
    await prisma.formPayment.update({ where: { id: pay.id }, data: { status: "FAILED", message: r.error, result: "result" in r ? (r.result as number) : null } });
    return { ok: false, error: r.error };
  }
  await prisma.formPayment.update({ where: { id: pay.id }, data: { trackId: r.trackId } });
  // a retry after a failure puts the registration back to "awaiting payment"
  await prisma.submission.updateMany({ where: { id: sub.id, payState: "FAILED" }, data: { payState: "PENDING" } });
  return { ok: true, url: startUrl(r.trackId) };
}

/**
 * Zibal return for a form payment. Idempotent (refresh, double callback, admin re-check):
 * server-side verify, amount check, guarded PENDING→PAID flip so SMS / discount usage happen once.
 */
export async function handleFormCallback(token: string, query: { trackId?: string | null; success?: string | null }): Promise<PayOutcome> {
  const pay = await prisma.formPayment.findUnique({ where: { token }, include: { submission: { select: { token: true } } } });
  if (!pay) return { kind: "failed", message: "پرداخت پیدا نشد." };
  const receipt = pay.submission.token ?? undefined;
  if (pay.status === "PAID") return { kind: "paid", receipt };
  if (!pay.trackId || (query.trackId && query.trackId !== pay.trackId)) return { kind: "failed", receipt, message: "اطلاعات بازگشتی درگاه با ثبت‌نام مطابقت ندارد." };
  if (query.success === "0") {
    await prisma.formPayment.updateMany({ where: { id: pay.id, status: "PENDING" }, data: { status: "FAILED", message: "انصراف یا خطا در پرداخت" } });
    await prisma.submission.updateMany({ where: { id: pay.submissionId, payState: "PENDING" }, data: { payState: "FAILED" } });
    return { kind: "failed", receipt, message: "پرداخت انجام نشد یا لغو شد." };
  }
  return verifyFormPayment(pay.id);
}

export async function verifyFormPayment(paymentId: string): Promise<PayOutcome> {
  const pay = await prisma.formPayment.findUnique({ where: { id: paymentId }, include: { submission: true } });
  if (!pay || !pay.trackId) return { kind: "failed", message: "پرداخت پیدا نشد." };
  const receipt = pay.submission.token ?? undefined;
  if (pay.status === "PAID") return { kind: "paid", receipt };
  const v = await zibalVerify(pay.trackId);
  if (v.kind === "error") {
    await prisma.formPayment.update({ where: { id: pay.id }, data: { message: v.message } });
    return { kind: "pending", receipt, message: "تأیید پرداخت از درگاه انجام نشد. اگر مبلغ از حساب شما کم شده، چند دقیقه بعد همین صفحه را دوباره باز کنید یا با ما تماس بگیرید." };
  }
  if (v.kind === "failed") {
    await prisma.formPayment.updateMany({ where: { id: pay.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "FAILED", result: v.result, message: v.message } });
    await prisma.submission.updateMany({ where: { id: pay.submissionId, payState: "PENDING" }, data: { payState: "FAILED" } });
    return { kind: "failed", receipt, message: "پرداخت تأیید نشد. اگر مبلغی کسر شده، طی ۷۲ ساعت به حساب شما برمی‌گردد." };
  }
  if (v.amountRials !== pay.amountRials) {
    await prisma.formPayment.update({ where: { id: pay.id }, data: { result: v.result, message: `مغایرت مبلغ: ${v.amountRials} ≠ ${pay.amountRials}` } });
    return { kind: "pending", receipt, message: "مبلغ پرداختی با مبلغ ثبت‌نام مغایرت دارد. همکاران ما بررسی و با شما تماس می‌گیرند." };
  }
  const flipped = await prisma.$transaction(async (tx) => {
    const r = await tx.formPayment.updateMany({
      where: { id: pay.id, status: { not: "PAID" } },
      data: { status: "PAID", result: v.result, refNumber: v.refNumber, cardNumber: v.cardNumber, paidAt: new Date(), message: null },
    });
    if (r.count !== 1) return false;
    const s = await tx.submission.updateMany({ where: { id: pay.submissionId, payState: { not: "PAID" } }, data: { payState: "PAID", paidAt: new Date() } });
    if (s.count !== 1) {
      await tx.formPayment.update({ where: { id: pay.id }, data: { message: "پرداخت تکراری — بررسی برای استرداد" } });
      return false;
    }
    if (pay.submission.discountCode) {
      await tx.formDiscount.updateMany({ where: { formId: pay.submission.formId, code: pay.submission.discountCode }, data: { used: { increment: 1 } } });
    }
    return true;
  });
  if (flipped) await notifyRegistered(pay.submissionId);
  return { kind: "paid", receipt };
}

/** Confirmation SMS to the registrant (+ admins). Called once per registration (free: on submit, paid: on verified payment). */
export async function notifyRegistered(submissionId: string) {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId }, include: { form: true } });
  if (!sub) return;
  const fields = parseFields(sub.form.fields);
  const who = identity(fields, sub.data as Record<string, unknown>);
  const ref = submissionRef(sub.id);
  const cfg = await getFormsSms();
  if (sub.form.smsConfirm && sub.mobile) {
    await sendSms("form", sub.mobile, { FULLNAME: who.name || "ثبت‌نام‌کننده", TITLE: sub.form.title, CODE: ref }, undefined, { templateId: cfg.confirmTemplateId, submissionId: sub.id });
  }
  if (sub.form.adminNotify) {
    const admins = cfg.adminMobiles.length ? cfg.adminMobiles : (await getShopSettings()).adminMobiles;
    const params = { FULLNAME: who.name || "-", TITLE: sub.form.title, PRICE: sub.amountRials > 0 ? formatToman(sub.amountRials) : "رایگان", ORDER_NUMBER: ref };
    for (const m of admins) await sendSms("admin", m, params, undefined, { submissionId: sub.id });
  }
}

export type NewRegistration = {
  form: Form;
  data: Record<string, unknown>;
  labels: Record<string, string>;
  identity: { mobile: string | null; nationalCode: string | null };
  amountRials: number;
  lines: { label: string; rials: number }[];
  discount: { code: string; rials: number } | null;
};

/**
 * Creates the submission under a per-form advisory lock so capacity and "one per person" hold under concurrency.
 * Returns an error message when the form is full / duplicate.
 */
export async function createRegistration(r: NewRegistration, holdMs: number): Promise<{ ok: true; id: string; token: string; paid: boolean } | { ok: false; error: string; status: number }> {
  const token = newToken(18);
  const paid = r.amountRials > 0;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"form:" + r.form.id}))`;
    if (r.form.capacity != null) {
      const taken = await tx.submission.count({
        where: { formId: r.form.id, OR: [{ payState: { in: ["NONE", "PAID"] } }, { payState: "PENDING", createdAt: { gte: new Date(Date.now() - holdMs) } }] },
      });
      if (taken >= r.form.capacity) return { ok: false as const, error: "ظرفیت این ثبت‌نام تکمیل شده است.", status: 409 };
    }
    const key = r.form.uniqueBy === "MOBILE" ? { mobile: r.identity.mobile } : r.form.uniqueBy === "NATIONAL_CODE" ? { nationalCode: r.identity.nationalCode } : null;
    if (key && Object.values(key)[0]) {
      const dup = await tx.submission.findFirst({ where: { formId: r.form.id, ...key, payState: { in: ["NONE", "PAID"] } }, select: { id: true } });
      if (dup) return { ok: false as const, error: r.form.uniqueBy === "MOBILE" ? "با این شماره موبایل قبلاً ثبت‌نام شده است." : "با این کد ملی قبلاً ثبت‌نام شده است.", status: 409 };
    }
    const sub = await tx.submission.create({
      data: {
        formId: r.form.id,
        data: r.data as Prisma.InputJsonValue,
        labels: r.labels,
        token,
        mobile: r.identity.mobile,
        nationalCode: r.identity.nationalCode,
        payState: paid ? "PENDING" : "NONE",
        amountRials: r.amountRials,
        priceLines: r.lines,
        discountCode: r.discount?.code ?? null,
        discountRials: r.discount?.rials ?? 0,
      },
    });
    // a discount that made the registration free is used right away
    if (!paid && r.discount) await tx.formDiscount.updateMany({ where: { formId: r.form.id, code: r.discount.code }, data: { used: { increment: 1 } } });
    return { ok: true as const, id: sub.id, token, paid };
  });
}
