import { clipParam } from "./text";

/**
 * SMS.ir sender for consultation messages.
 * Same rules as lib/shop/sms.ts: STAROS_SMS_ENABLED / SHOP_SMS_ENABLED, SMSIR_API_KEY,
 * and the host must stay on sms.ir. No key is stored in the repo.
 * Verify templates win. Plain text is used only when SMSIR_LINE_NUMBER is set and no template id is.
 */

export type SmsEnv = {
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string;
  lineNumber: string | null;
  why: string | null;
};

export function resolveSmsEnv(env: Record<string, string | undefined> = process.env): SmsEnv {
  const enabled = (env.SHOP_SMS_ENABLED ?? env.STAROS_SMS_ENABLED) === "true";
  const apiKey = env.SMSIR_API_KEY?.trim() || null;
  let baseUrl = "https://api.sms.ir";
  try {
    const u = new URL(env.SMSIR_API_BASE_URL?.trim() || baseUrl);
    if (u.protocol === "https:" && (u.hostname === "sms.ir" || u.hostname.endsWith(".sms.ir"))) baseUrl = u.origin;
  } catch {
    /* keep the default host */
  }
  if (env.NODE_ENV !== "production" && env.SMSIR_TEST_BASE_URL) baseUrl = env.SMSIR_TEST_BASE_URL;
  const lineRaw = env.SMSIR_LINE_NUMBER?.trim() || "";
  const lineNumber = /^[0-9]{4,20}$/.test(lineRaw) ? lineRaw : null;
  if (!enabled) return { enabled, apiKey, baseUrl, lineNumber, why: "SMS غیرفعال است" };
  if (!apiKey) return { enabled, apiKey, baseUrl, lineNumber, why: "کلید SMS.ir تنظیم نشده" };
  return { enabled, apiKey, baseUrl, lineNumber, why: null };
}

export type DispatchInput = {
  mobile: string;
  body: string;
  templateId: number | null;
  params: Record<string, string>;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

export type DispatchResult = { status: "SENT" | "FAILED" | "SKIPPED"; detail: string | null };

export async function dispatchConsultMessage(input: DispatchInput): Promise<DispatchResult> {
  const env = resolveSmsEnv(input.env);
  if (env.why || !env.apiKey) return { status: "SKIPPED", detail: env.why };
  const fetchImpl = input.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    if (input.templateId && Number.isSafeInteger(input.templateId) && input.templateId > 0) {
      const res = await fetchImpl(`${env.baseUrl}/v1/send/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": env.apiKey },
        body: JSON.stringify({
          mobile: input.mobile,
          templateId: input.templateId,
          parameters: Object.entries(input.params).map(([name, value]) => ({ name, value: clipParam(value) })),
        }),
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => null)) as { status?: number; message?: string } | null;
      const ok = res.ok && json?.status === 1;
      return ok ? { status: "SENT", detail: null } : { status: "FAILED", detail: `HTTP ${res.status} ${json?.status ?? ""} ${json?.message ?? ""}`.slice(0, 300) };
    }
    if (!env.lineNumber) return { status: "SKIPPED", detail: "قالب پیامک یا شماره خط تنظیم نشده" };
    const res = await fetchImpl(`${env.baseUrl}/v1/send/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": env.apiKey },
      body: JSON.stringify({ lineNumber: Number(env.lineNumber), messageText: input.body.slice(0, 700), mobiles: [input.mobile] }),
      signal: ctrl.signal,
    });
    const json = (await res.json().catch(() => null)) as { status?: number; message?: string } | null;
    const ok = res.ok && json?.status === 1;
    return ok ? { status: "SENT", detail: null } : { status: "FAILED", detail: `HTTP ${res.status} ${json?.status ?? ""} ${json?.message ?? ""}`.slice(0, 300) };
  } catch (e) {
    return { status: "FAILED", detail: e instanceof Error ? e.message.slice(0, 200) : "error" };
  } finally {
    clearTimeout(timer);
  }
}
