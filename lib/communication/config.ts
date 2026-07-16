/**
 * Communication / OTP runtime config from environment (no secrets in responses).
 */

import { readSmsEnabled, readSmsProviderName, readSmsTimeoutMs } from "@/lib/communication/sms-provider";
import type { CommunicationConfig } from "@/lib/communication/types";

function readPositiveInt(raw: string | undefined, fallback: number, max: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

export function getCommunicationConfig(): CommunicationConfig {
  return {
    smsEnabled: readSmsEnabled(),
    providerName: readSmsProviderName(),
    timeoutMs: readSmsTimeoutMs(),
    otpExpirySeconds: readPositiveInt(
      process.env.STAROS_OTP_EXPIRY_SECONDS,
      120,
      600,
    ),
    otpResendCooldownSeconds: readPositiveInt(
      process.env.STAROS_OTP_RESEND_COOLDOWN_SECONDS,
      60,
      300,
    ),
    otpMaxAttempts: readPositiveInt(process.env.STAROS_OTP_MAX_ATTEMPTS, 5, 20),
    smsMaxAttempts: readPositiveInt(process.env.STAROS_SMS_MAX_ATTEMPTS, 5, 20),
  };
}

/** Mask API key for admin display — never expose full secrets. */
export function maskSecret(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

export function getSmsSecretStatus(): {
  apiKeyConfigured: boolean;
  apiKeyMasked: string | null;
  apiUrlConfigured: boolean;
  senderConfigured: boolean;
} {
  const apiKey = process.env.STAROS_SMS_API_KEY;
  const apiUrl = process.env.STAROS_SMS_API_URL?.trim();
  const sender = process.env.STAROS_SMS_SENDER?.trim();
  return {
    apiKeyConfigured: Boolean(apiKey?.trim()),
    apiKeyMasked: maskSecret(apiKey),
    apiUrlConfigured: Boolean(apiUrl),
    senderConfigured: Boolean(sender),
  };
}
