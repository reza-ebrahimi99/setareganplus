/**
 * SMS provider abstraction.
 * Default: NullSmsProvider (safe no-op until a real Iranian adapter is wired).
 *
 * Env (optional, never commit secrets):
 *   STAROS_SMS_ENABLED=true
 *   STAROS_SMS_PROVIDER=null
 *   STAROS_SMS_TIMEOUT_MS=8000
 *   STAROS_SMS_API_KEY=
 *   STAROS_SMS_API_URL=
 *   STAROS_SMS_SENDER=
 */

import type {
  SmsProvider,
  SmsSendResult,
  SmsSendTemplateRequest,
  SmsSendTextRequest,
} from "@/lib/communication/types";

export function readSmsEnabled(): boolean {
  return process.env.STAROS_SMS_ENABLED === "true";
}

export function readSmsTimeoutMs(fallback = 8000): number {
  const raw = Number(process.env.STAROS_SMS_TIMEOUT_MS ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 30_000) : fallback;
}

export function readSmsProviderName(): string {
  const raw = process.env.STAROS_SMS_PROVIDER?.trim().toLowerCase();
  return raw && raw.length > 0 ? raw : "null";
}

/**
 * No-op provider — records success without contacting any vendor.
 * Used until a real adapter is registered.
 */
export class NullSmsProvider implements SmsProvider {
  readonly name = "null";

  isEnabled(): boolean {
    return readSmsEnabled() && readSmsProviderName() === "null";
  }

  async sendText(_request: SmsSendTextRequest): Promise<SmsSendResult> {
    if (!readSmsEnabled()) {
      return {
        ok: false,
        code: "disabled",
        message: "ارسال پیامک غیرفعال است.",
        retryable: false,
      };
    }
    return { ok: true, providerMessageId: null };
  }

  async sendTemplate(
    request: SmsSendTemplateRequest,
  ): Promise<SmsSendResult> {
    // Null provider cannot resolve vendor templates; treat as text-unavailable.
    if (!this.isEnabled() && !readSmsEnabled()) {
      return {
        ok: false,
        code: "disabled",
        message: "ارسال پیامک غیرفعال است.",
        retryable: false,
      };
    }
    if (!request.templateCode.trim()) {
      return {
        ok: false,
        code: "invalid",
        message: "کد قالب پیامک نامعتبر است.",
        retryable: false,
      };
    }
    return { ok: true, providerMessageId: null };
  }
}

let cached: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (cached) return cached;
  // Future: switch on STAROS_SMS_PROVIDER for real Iranian adapters.
  cached = new NullSmsProvider();
  return cached;
}

/** Test helper */
export function resetSmsProviderCache(): void {
  cached = null;
}

/**
 * Run an async send with AbortController timeout and normalized errors.
 */
export async function withSmsTimeout<T>(
  timeoutMs: number,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeProviderError(error: unknown): SmsSendResult {
  if (error instanceof Error && error.name === "AbortError") {
    return {
      ok: false,
      code: "timeout",
      message: "زمان ارسال پیامک به پایان رسید.",
      retryable: true,
    };
  }
  return {
    ok: false,
    code: "unavailable",
    message: "سرویس پیامک در دسترس نیست.",
    retryable: true,
  };
}
