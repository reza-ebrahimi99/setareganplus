/**
 * Communication / OTP runtime config from environment (no secrets in responses).
 */

import { getSmsIrConfigurationStatus } from "@/lib/communication/providers/smsir-provider";
import {
  readSmsEnabled,
  readSmsProviderName,
  readSmsTimeoutMs,
} from "@/lib/communication/sms-provider";
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
  timeoutMs: number;
  baseUrlConfigured: boolean;
  baseUrlValid: boolean;
  apiUrlConfigured: boolean;
  senderConfigured: boolean;
  otpTemplateConfigured: boolean;
  bookingTemplateConfigured: boolean;
  formTemplateConfigured: boolean;
  otpParameterConfigured: boolean;
  bookingParametersConfigured: boolean;
  formParametersConfigured: boolean;
  providerConfigured: boolean;
} {
  const apiKey = process.env.SMSIR_API_KEY;
  const status = getSmsIrConfigurationStatus();
  return {
    apiKeyConfigured: status.apiKeyConfigured,
    apiKeyMasked: maskSecret(apiKey),
    timeoutMs: status.timeoutMs,
    baseUrlConfigured: status.baseUrlConfigured,
    baseUrlValid: status.baseUrlValid,
    // Compatibility fields for the existing admin loader/page.
    apiUrlConfigured: status.baseUrlConfigured,
    senderConfigured: false,
    otpTemplateConfigured: status.otpTemplateConfigured,
    bookingTemplateConfigured: status.bookingTemplateConfigured,
    formTemplateConfigured: status.formTemplateConfigured,
    otpParameterConfigured: status.otpParameterConfigured,
    bookingParametersConfigured: status.bookingParametersConfigured,
    formParametersConfigured: status.formParametersConfigured,
    providerConfigured: status.providerConfigured,
  };
}
