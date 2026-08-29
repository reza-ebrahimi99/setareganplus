/**
 * High-level SMS send helpers (provider-neutral).
 */

import {
  getSmsProvider,
  normalizeProviderError,
  readSmsTimeoutMs,
  withSmsTimeout,
} from "@/lib/communication/sms-provider";
import type {
  SmsOtpTemplateRequest,
  SmsPatternTemplateRequest,
  SmsSendResult,
  SmsSendTemplateRequest,
  SmsSendTextRequest,
  SmsTemplateMessageRequest,
} from "@/lib/communication/types";

export async function sendText(
  request: SmsSendTextRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(
      timeoutMs,
      (signal) => provider.sendText({ ...request, signal }),
      request.signal,
    );
  } catch (error) {
    return normalizeProviderError(error);
  }
}

export async function sendOtpTemplate(
  request: SmsOtpTemplateRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(
      timeoutMs,
      (signal) => provider.sendOtpTemplate({ ...request, signal }),
      request.signal,
    );
  } catch (error) {
    return normalizeProviderError(error);
  }
}

export async function sendTemplateMessage(
  request: SmsTemplateMessageRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(
      timeoutMs,
      (signal) => provider.sendTemplateMessage({ ...request, signal }),
      request.signal,
    );
  } catch (error) {
    return normalizeProviderError(error);
  }
}

export async function sendPatternTemplate(
  request: SmsPatternTemplateRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(
      timeoutMs,
      (signal) => provider.sendPatternTemplate({ ...request, signal }),
      request.signal,
    );
  } catch (error) {
    return normalizeProviderError(error);
  }
}

/** @deprecated Migrate callers to `sendOtpTemplate`/`sendTemplateMessage`. */
export async function sendTemplate(
  request: SmsSendTemplateRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(
      timeoutMs,
      (signal) => provider.sendTemplate({ ...request, signal }),
      request.signal,
    );
  } catch (error) {
    return normalizeProviderError(error);
  }
}
