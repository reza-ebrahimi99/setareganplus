"use server";

import { headers } from "next/headers";
import { clientIp } from "@/lib/analytics/classify";
import { catalogFor } from "@/lib/consult/availability";
import type { Catalog } from "@/lib/consult/catalog";
import { createConsultation } from "@/lib/consult/book";
import type { Audience, ConsultMode } from "@/lib/consult/constants";
import { startConsultOtp } from "@/lib/consult/otp";
import { getStudentSession, requestIp } from "@/lib/consult/students";
import type { DraftInput } from "@/lib/consult/validate";
import { allow } from "@/lib/shop/ratelimit";

function ipFrom(h: Headers): string {
  return clientIp({ get: (n) => h.get(n) }) || "unknown";
}

export async function loadCatalog(audience: Audience, mode: ConsultMode, jy: number, jm: number): Promise<Catalog | { error: string }> {
  if ((audience !== "PUBLIC" && audience !== "SPECIAL") || (mode !== "ONLINE" && mode !== "IN_PERSON")) return { error: "درخواست نامعتبر است." };
  if (audience === "SPECIAL" && !(await getStudentSession())) return { error: "برای دیدن وقت‌های ویژه، اول با کد دانش‌آموزی وارد شوید." };
  const ip = ipFrom(await headers());
  if (!allow(`consult:cat:${ip}`, 80, 60_000)) return { error: "درخواست زیاد است. چند لحظه بعد دوباره روز را باز کنید." };
  try {
    return await catalogFor(audience, mode, Number(jy), Number(jm));
  } catch {
    return { error: "تقویم موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید." };
  }
}

export async function sendCode(audience: Audience, mobile: string) {
  if (audience === "SPECIAL") {
    const session = await getStudentSession();
    if (!session) return { ok: false as const, error: "اول با کد دانش‌آموزی وارد شوید." };
    if (session.hasPhone) return { ok: false as const, error: "شمارهٔ این دانش‌آموز در مدرسه ثبت شده و نیازی به پیامک تازه نیست." };
  }
  return startConsultOtp(mobile, await requestIp());
}

export async function book(draft: DraftInput, mobile: string, otpId?: string, otpCode?: string) {
  const ip = ipFrom(await headers());
  if (!allow(`consult:book:${ip}`, 12, 10 * 60_000)) return { ok: false as const, error: "تعداد ثبت از این اینترنت زیاد است. کمی بعد دوباره تلاش کنید." };
  return createConsultation({ draft, mobile, otpId, otpCode });
}
