import "server-only";

/**
 * Zibal IPG client. Never logs the merchant id.
 * Docs: POST /v1/request → {result:100, trackId}; user goes to /start/{trackId};
 * callback ?trackId&success&status&orderId; POST /v1/verify → 100 ok, 201 already verified.
 */
const ORIGIN = "https://gateway.zibal.ir";

function base(): string {
  // Override only outside production (local mock tests).
  if (process.env.NODE_ENV !== "production" && process.env.ZIBAL_BASE_URL) return process.env.ZIBAL_BASE_URL.replace(/\/+$/, "");
  return ORIGIN;
}
export const merchant = () => process.env.ZIBAL_MERCHANT_ID?.trim() || null;
export const zibalConfigured = () => merchant() !== null;
export const startUrl = (trackId: string) => `${base()}/start/${encodeURIComponent(trackId)}`;

type Json = Record<string, unknown>;
async function post(path: string, body: Json): Promise<{ ok: true; json: Json } | { ok: false; error: string }> {
  const ctrl = new AbortController();
  const ms = Math.max(3000, Number(process.env.ZIBAL_TIMEOUT_MS) || 15000);
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${base()}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as Json | null;
    if (!json || typeof json !== "object") return { ok: false, error: "پاسخ درگاه قابل خواندن نبود." };
    return { ok: true, json };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "AbortError" ? "زمان پاسخ درگاه به پایان رسید." : "ارتباط با درگاه زیبال برقرار نشد." };
  } finally {
    clearTimeout(t);
  }
}

const REQUEST_ERRORS: Record<number, string> = {
  102: "شناسه پذیرنده درگاه نامعتبر است.",
  103: "درگاه پرداخت غیرفعال است.",
  104: "شناسه پذیرنده درگاه نامعتبر است.",
  105: "مبلغ کمتر از حد مجاز است.",
  106: "نشانی بازگشت نامعتبر است.",
  113: "مبلغ بیشتر از سقف مجاز است.",
};

export async function zibalRequest(input: { amountRials: number; callbackUrl: string; orderId: string; mobile?: string; description?: string }) {
  const m = merchant();
  if (!m) return { ok: false as const, error: "پرداخت آنلاین هنوز تنظیم نشده است." };
  const r = await post("v1/request", {
    merchant: m,
    amount: Math.trunc(input.amountRials),
    callbackUrl: input.callbackUrl,
    orderId: input.orderId,
    mobile: input.mobile,
    description: input.description?.slice(0, 200),
  });
  if (!r.ok) return { ok: false as const, error: r.error };
  const result = Number(r.json.result);
  const trackId = r.json.trackId != null ? String(r.json.trackId) : null;
  if (result !== 100 || !trackId) return { ok: false as const, error: REQUEST_ERRORS[result] ?? `درگاه درخواست را نپذیرفت (کد ${result}).`, result };
  return { ok: true as const, trackId };
}

export type VerifyResult =
  | { kind: "paid"; amountRials: number; refNumber: string | null; cardNumber: string | null; result: number; paidAt: string | null }
  | { kind: "failed"; result: number; message: string }
  | { kind: "error"; message: string };

export async function zibalVerify(trackId: string): Promise<VerifyResult> {
  const m = merchant();
  if (!m) return { kind: "error", message: "merchant not configured" };
  const r = await post("v1/verify", { merchant: m, trackId: Number(trackId) || trackId });
  if (!r.ok) return { kind: "error", message: r.error };
  const result = Number(r.json.result);
  if (result === 100 || result === 201) {
    const amount = Number(r.json.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      // 201 sometimes omits details → ask inquiry for the amount.
      const q = await post("v1/inquiry", { merchant: m, trackId: Number(trackId) || trackId });
      const qa = q.ok ? Number(q.json.amount) : NaN;
      const st = q.ok ? Number(q.json.status) : NaN;
      if (!Number.isFinite(qa) || qa <= 0 || !(st === 1 || st === 2)) return { kind: "error", message: "مبلغ پرداخت از درگاه دریافت نشد." };
      return { kind: "paid", amountRials: qa, refNumber: q.ok && q.json.refNumber != null ? String(q.json.refNumber) : null, cardNumber: q.ok && q.json.cardNumber ? String(q.json.cardNumber) : null, result, paidAt: null };
    }
    return {
      kind: "paid",
      amountRials: amount,
      refNumber: r.json.refNumber != null ? String(r.json.refNumber) : null,
      cardNumber: r.json.cardNumber ? String(r.json.cardNumber) : null,
      result,
      paidAt: r.json.paidAt ? String(r.json.paidAt) : null,
    };
  }
  return { kind: "failed", result, message: String(r.json.message ?? "پرداخت تأیید نشد.") };
}
