import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFields, isInput, type FormValues } from "@/lib/forms/types";
import { isVisible, validateValues } from "@/lib/forms/validate";
import { totals, isPaidMode, MIN_PAY_RIALS } from "@/lib/forms/pricing";
import { formState, HOLD_MS } from "@/lib/forms/public";
import { createRegistration, findDiscount, identity, notifyRegistered, receiptPath, startFormPayment } from "@/lib/forms/registration";
import { savePrivateFile } from "@/lib/uploads";
import { submissionRef } from "@/lib/submissions";
import { allow } from "@/lib/shop/ratelimit";

const STATE_ERR = { soon: "ثبت‌نام این فرم هنوز شروع نشده است.", closed: "مهلت ثبت‌نام این فرم به پایان رسیده است.", full: "ظرفیت این ثبت‌نام تکمیل شده است." } as const;

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const form = await prisma.form.findUnique({ where: { slug } });
  if (!form || form.status === "DRAFT") return NextResponse.json({ error: "این فرم فعال نیست." }, { status: 404 });
  const st = await formState(form);
  if (st.state !== "open") return NextResponse.json({ error: STATE_ERR[st.state], state: st.state }, { status: 409 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  // generous: parents often share one IP (school Wi-Fi, mobile carrier NAT, front-desk PC)
  if (!allow(`form:${ip}`, 30, 10 * 60_000)) return NextResponse.json({ error: "تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد تلاش کنید." }, { status: 429 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }
  if (fd.get("__hp")) return NextResponse.json({ message: form.successMessage }); // bot

  let values: FormValues = {};
  try {
    const raw = JSON.parse(String(fd.get("__values") ?? "{}"));
    if (raw && typeof raw === "object") values = raw;
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const fields = parseFields(form.fields);
  const known = new Set(fields.filter(isInput).map((f) => f.id));
  for (const k of Object.keys(values)) if (!known.has(k)) delete values[k];

  const errors = validateValues(fields, values);
  const data: Record<string, unknown> = { ...values };
  for (const f of fields.filter((x) => x.type === "file")) {
    if (!isVisible(f, values)) continue;
    const file = fd.get(`file_${f.id}`);
    if (file instanceof File && file.size > 0) {
      if (Object.keys(errors).length) continue; // don't store files for a submission we reject
      try {
        data[f.id] = await savePrivateFile(file);
      } catch (e) {
        errors[f.id] = (e as Error).message;
      }
    } else if (f.required) errors[f.id] = "بارگذاری فایل الزامی است.";
  }
  if (Object.keys(errors).length) return NextResponse.json({ error: "لطفاً خطاهای فرم را برطرف کنید.", errors }, { status: 422 });

  // ---- price (server is the authority; the client total is only a preview) ----
  let discount = null;
  const rawCode = String(fd.get("__discount") ?? "").trim();
  if (isPaidMode(form) && rawCode) {
    const d = await findDiscount(form.id, rawCode.slice(0, 40));
    if (!d.ok) return NextResponse.json({ error: d.error, errors: { __discount: d.error } }, { status: 422 });
    discount = d.d;
  }
  const t = totals(form, fields, values, discount);
  if (t.total > 0 && t.total < MIN_PAY_RIALS) return NextResponse.json({ error: "مبلغ قابل پرداخت کمتر از حد مجاز درگاه است." }, { status: 422 });

  const who = identity(fields, values);
  const created = await createRegistration(
    {
      form,
      data,
      labels: Object.fromEntries(fields.filter(isInput).map((f) => [f.id, f.label])),
      identity: { mobile: who.mobile, nationalCode: who.nationalCode },
      amountRials: t.total,
      lines: t.lines,
      discount: discount && t.discount > 0 ? { code: discount.code, rials: t.discount } : null,
    },
    HOLD_MS,
  );
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: created.status });

  const receipt = receiptPath(created.token);
  if (!created.paid) {
    await notifyRegistered(created.id).catch((e) => console.error("[forms] sms", e));
    return NextResponse.json({ message: form.successMessage, ref: submissionRef(created.id), receipt, redirect: form.successRedirect || null });
  }
  const pay = await startFormPayment(created.id);
  if (!pay.ok) {
    await prisma.submission.update({ where: { id: created.id }, data: { payState: "FAILED" } });
    return NextResponse.json({ error: `${pay.error} می‌توانید از صفحهٔ رسید دوباره برای پرداخت اقدام کنید.`, receipt }, { status: 502 });
  }
  return NextResponse.json({ pay: pay.url, ref: submissionRef(created.id), receipt });
}
