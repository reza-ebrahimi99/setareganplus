"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeIranMobile, toEn } from "@/lib/format";
import { GRADES, MAJORS, gradeHasMajor, isValidNationalCode, BRANCHES } from "@/lib/shop/config";
import { createOrder, startPayment, ShopError, ticketPath } from "@/lib/shop/orders";
import { getShopSettings } from "@/lib/shop/settings";
import { allow } from "@/lib/shop/ratelimit";

export type CheckoutState = { errors: Record<string, string>; error?: string; values?: Record<string, string> };

export async function checkout(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  const values = Object.fromEntries(["buyerName", "mobile", "nationalCode", "parentName", "grade", "major", "branch", "customerNote"].map((k) => [k, g(k)]));
  if (g("website")) return { errors: {}, error: "درخواست نامعتبر است." };
  const errors: Record<string, string> = {};
  const name = values.buyerName.replace(/\s+/g, " ");
  if (name.length < 3) errors.buyerName = "نام و نام خانوادگی را کامل بنویسید.";
  const mobile = normalizeIranMobile(values.mobile);
  if (!mobile) errors.mobile = "شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).";
  const nc = toEn(values.nationalCode).replace(/\D/g, "");
  if (values.nationalCode && !isValidNationalCode(nc)) errors.nationalCode = "کد ملی معتبر نیست.";
  if (!(GRADES as readonly string[]).includes(values.grade)) errors.grade = "پایه را انتخاب کنید.";
  const needMajor = gradeHasMajor(values.grade);
  if (needMajor && !(MAJORS as readonly string[]).includes(values.major)) errors.major = "رشته را انتخاب کنید.";
  if (!(values.branch in BRANCHES)) errors.branch = "محل تحویل را انتخاب کنید.";
  if (Object.keys(errors).length) return { errors, values };

  const settings = await getShopSettings();
  if (!settings.open) return { errors: {}, values, error: "ثبت سفارش موقتاً بسته است." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  if (!allow(`co:${ip}`, 12, 10 * 60_000) || !allow(`com:${mobile}`, 6, 10 * 60_000)) return { errors: {}, values, error: "تعداد تلاش‌ها زیاد است؛ چند دقیقه بعد دوباره امتحان کنید." };

  const productId = g("productId");
  let order;
  try {
    order = await createOrder(productId, {
      buyerName: name,
      mobile: mobile!,
      nationalCode: nc || null,
      parentName: values.parentName || null,
      grade: values.grade,
      major: needMajor ? values.major : null,
      branch: values.branch as "BOYS" | "GIRLS",
      customerNote: values.customerNote.slice(0, 1000) || null,
    });
  } catch (e) {
    if (e instanceof ShopError) return { errors: {}, values, error: e.message };
    console.error("[shop] createOrder failed", e);
    return { errors: {}, values, error: "ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید." };
  }
  const pay = await startPayment(order.id);
  if (!pay.ok) redirect(`/shop/pay/failed?o=${encodeURIComponent(order.qrToken)}&m=${encodeURIComponent(pay.error)}`);
  redirect(pay.url);
}

/** Retry payment for an unpaid order (from the failed page / ticket). */
export async function retryPayment(fd: FormData) {
  const token = String(fd.get("o") ?? "");
  const order = await prisma.order.findUnique({ where: { qrToken: token } });
  if (!order) redirect("/shop");
  if (order.payStatus === "PAID") redirect(ticketPath(order.qrToken));
  const pay = await startPayment(order.id);
  if (!pay.ok) redirect(`/shop/pay/failed?o=${encodeURIComponent(order.qrToken)}&m=${encodeURIComponent(pay.error)}`);
  redirect(pay.url);
}
