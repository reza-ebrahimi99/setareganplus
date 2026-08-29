/**
 * SMS provider abstraction.
 * Disabled/default path: NullSmsProvider.
 *
 * Env (optional, never commit secrets):
 *   STAROS_SMS_ENABLED=true
 *   STAROS_SMS_PROVIDER=null
 *   STAROS_SMS_TIMEOUT_MS=8000
 */

import { SmsIrProvider, readSmsIrTimeoutMs } from "@/lib/communication/providers/smsir-provider";
import type {
  SmsOtpTemplateRequest,
  SmsPatternTemplateRequest,
  SmsProvider,
  SmsSendFailure,
  SmsSendResult,
  SmsSendTemplateRequest,
  SmsSendTextRequest,
  SmsTemplateMessageRequest,
} from "@/lib/communication/types";

export function readSmsEnabled(): boolean {
  return process.env.STAROS_SMS_ENABLED === "true";
}

export function readSmsTimeoutMs(fallback = 8000): number {
  if (readSmsProviderName() === "smsir") {
    return readSmsIrTimeoutMs(fallback);
  }
  const raw = Number(process.env.STAROS_SMS_TIMEOUT_MS ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 30_000) : fallback;
}

export function readSmsProviderName(): string {
  const raw = process.env.STAROS_SMS_PROVIDER?.trim().toLowerCase();
  if (!raw) return "null";
  return raw === "null" || raw === "smsir" ? raw : "unsupported";
}

/**
 * No-op provider — records success without contacting any vendor when
 * explicitly selected. When SMS is globally disabled it returns `disabled`.
 */
export class NullSmsProvider implements SmsProvider {
  readonly name = "null";

  isEnabled(): boolean {
    return readSmsEnabled() && readSmsProviderName() === "null";
  }

  async sendText(request: SmsSendTextRequest): Promise<SmsSendResult> {
    void request;
    if (!readSmsEnabled()) {
      return disabledFailure();
    }
    return nullSuccess();
  }

  async sendOtpTemplate(
    request: SmsOtpTemplateRequest,
  ): Promise<SmsSendResult> {
    void request;
    if (!readSmsEnabled()) return disabledFailure();
    return nullSuccess();
  }

  async sendTemplateMessage(
    request: SmsTemplateMessageRequest,
  ): Promise<SmsSendResult> {
    void request;
    if (!readSmsEnabled()) return disabledFailure();
    return nullSuccess();
  }

  async sendPatternTemplate(
    request: SmsPatternTemplateRequest,
  ): Promise<SmsSendResult> {
    if (!readSmsEnabled()) return disabledFailure();
    if (!request.templateCode.trim()) {
      return providerFailure(
        "invalid",
        "مشخصات قالب پیامک معتبر نیست.",
        false,
      );
    }
    return nullSuccess();
  }

  async sendTemplate(
    request: SmsSendTemplateRequest,
  ): Promise<SmsSendResult> {
    if (!readSmsEnabled()) return disabledFailure();
    if (!request.templateCode.trim()) {
      return providerFailure(
        "invalid",
        "کد قالب پیامک نامعتبر است.",
        false,
      );
    }
    return nullSuccess();
  }
}

function nullSuccess(): SmsSendResult {
  return {
    ok: true,
    providerMessageId: null,
    providerStatusCode: null,
    retryable: false,
    errorCode: null,
    safeMessage: null,
  };
}

function providerFailure(
  errorCode: SmsSendFailure["errorCode"],
  safeMessage: string,
  retryable: boolean,
): SmsSendFailure {
  return {
    ok: false,
    providerMessageId: null,
    providerStatusCode: null,
    errorCode,
    safeMessage,
    retryable,
    code: errorCode,
    message: safeMessage,
  };
}

function disabledFailure(): SmsSendFailure {
  return providerFailure(
    "disabled",
    "ارسال پیامک غیرفعال است.",
    false,
  );
}

class UnsupportedSmsProvider implements SmsProvider {
  readonly name = "unsupported";

  isEnabled(): boolean {
    return false;
  }

  sendText(request: SmsSendTextRequest): Promise<SmsSendResult> {
    void request;
    return Promise.resolve(this.configurationFailure());
  }

  sendOtpTemplate(
    request: SmsOtpTemplateRequest,
  ): Promise<SmsSendResult> {
    void request;
    return Promise.resolve(this.configurationFailure());
  }

  sendTemplateMessage(
    request: SmsTemplateMessageRequest,
  ): Promise<SmsSendResult> {
    void request;
    return Promise.resolve(this.configurationFailure());
  }

  sendPatternTemplate(
    request: SmsPatternTemplateRequest,
  ): Promise<SmsSendResult> {
    void request;
    return Promise.resolve(this.configurationFailure());
  }

  sendTemplate(
    request: SmsSendTemplateRequest,
  ): Promise<SmsSendResult> {
    void request;
    return Promise.resolve(this.configurationFailure());
  }

  private configurationFailure(): SmsSendFailure {
    return providerFailure(
      "configuration",
      "ارائه‌دهنده پیامک پیکربندی‌شده پشتیبانی نمی‌شود.",
      false,
    );
  }
}

let cached: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (cached) return cached;
  if (!readSmsEnabled()) {
    cached = new NullSmsProvider();
    return cached;
  }

  const providerName = readSmsProviderName();
  switch (providerName) {
    case "null":
      cached = new NullSmsProvider();
      break;
    case "smsir":
      cached = new SmsIrProvider();
      break;
    default:
      cached = new UnsupportedSmsProvider();
  }
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
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function normalizeProviderError(error: unknown): SmsSendResult {
  if (error instanceof Error && error.name === "AbortError") {
    return providerFailure(
      "timeout",
      "زمان ارسال پیامک به پایان رسید.",
      true,
    );
  }
  return providerFailure(
    "unavailable",
    "سرویس پیامک در دسترس نیست.",
    true,
  );
}
