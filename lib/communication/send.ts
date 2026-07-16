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
  SmsSendResult,
  SmsSendTemplateRequest,
  SmsSendTextRequest,
} from "@/lib/communication/types";

export async function sendText(
  request: SmsSendTextRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(timeoutMs, async (signal) => {
      if (signal.aborted) {
        return normalizeProviderError(
          Object.assign(new Error("aborted"), { name: "AbortError" }),
        );
      }
      return provider.sendText(request);
    });
  } catch (error) {
    return normalizeProviderError(error);
  }
}

export async function sendTemplate(
  request: SmsSendTemplateRequest,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const timeoutMs = readSmsTimeoutMs();
  try {
    return await withSmsTimeout(timeoutMs, async (signal) => {
      if (signal.aborted) {
        return normalizeProviderError(
          Object.assign(new Error("aborted"), { name: "AbortError" }),
        );
      }
      return provider.sendTemplate(request);
    });
  } catch (error) {
    return normalizeProviderError(error);
  }
}
