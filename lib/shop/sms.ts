import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * SMS.ir Verify (template) API — same provider and env keys as the old site.
 * Missing/disabled config ⇒ the message is skipped and logged, never an error for the buyer.
 */
export type SmsKind = "purchase" | "ready" | "admin";
const TEMPLATE_ENV: Record<SmsKind, string> = {
  purchase: "SMSIR_PURCHASE_TEMPLATE_ID",
  ready: "SMSIR_READY_TEMPLATE_ID",
  admin: "SMSIR_ADMIN_TEMPLATE_ID",
};

function config(kind: SmsKind) {
  const enabled = (process.env.SHOP_SMS_ENABLED ?? process.env.STAROS_SMS_ENABLED) === "true";
  const apiKey = process.env.SMSIR_API_KEY?.trim();
  const templateId = Number(process.env[TEMPLATE_ENV[kind]]?.trim());
  let baseUrl = "https://api.sms.ir";
  try {
    const u = new URL(process.env.SMSIR_API_BASE_URL?.trim() || baseUrl);
    if (u.protocol === "https:" && (u.hostname === "sms.ir" || u.hostname.endsWith(".sms.ir"))) baseUrl = u.origin;
  } catch {}
  if (process.env.NODE_ENV !== "production" && process.env.SMSIR_TEST_BASE_URL) baseUrl = process.env.SMSIR_TEST_BASE_URL;
  if (!enabled) return { ok: false as const, why: "SMS غیرفعال است" };
  if (!apiKey) return { ok: false as const, why: "کلید SMS.ir تنظیم نشده" };
  if (!Number.isSafeInteger(templateId) || templateId <= 0) return { ok: false as const, why: `قالب ${kind} تنظیم نشده` };
  return { ok: true as const, apiKey, templateId, baseUrl };
}

export function smsStatus() {
  return (Object.keys(TEMPLATE_ENV) as SmsKind[]).map((k) => {
    const c = config(k);
    return { kind: k, ok: c.ok, why: c.ok ? null : c.why };
  });
}

const clip = (v: string) => (v.length > 25 ? v.slice(0, 24) + "…" : v);

export async function sendSms(kind: SmsKind, mobile: string, params: Record<string, string>, orderId?: string) {
  const c = config(kind);
  if (!c.ok) {
    await prisma.smsLog.create({ data: { kind, mobile, orderId, status: "SKIPPED", detail: c.why } }).catch(() => {});
    return false;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${c.baseUrl}/v1/send/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": c.apiKey },
      body: JSON.stringify({ mobile, templateId: c.templateId, parameters: Object.entries(params).map(([name, value]) => ({ name, value: clip(value) })) }),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => null)) as { status?: number; message?: string } | null;
    const ok = res.ok && json?.status === 1;
    await prisma.smsLog.create({ data: { kind, mobile, orderId, status: ok ? "SENT" : "FAILED", detail: ok ? null : `HTTP ${res.status} ${json?.status ?? ""} ${json?.message ?? ""}`.slice(0, 300) } }).catch(() => {});
    return ok;
  } catch (e) {
    await prisma.smsLog.create({ data: { kind, mobile, orderId, status: "FAILED", detail: e instanceof Error ? e.message.slice(0, 200) : "error" } }).catch(() => {});
    return false;
  } finally {
    clearTimeout(t);
  }
}
