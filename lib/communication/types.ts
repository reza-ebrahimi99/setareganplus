/**
 * Provider-neutral SMS / OTP communication types (StarOS v0.6A).
 * No vendor SDKs; secrets stay in environment variables.
 */

export type SmsSendTextRequest = {
  toMobile: string;
  body: string;
  /** Optional correlation for provider logs (never include OTP plaintext). */
  correlationId?: string;
};

export type SmsSendTemplateRequest = {
  toMobile: string;
  templateCode: string;
  variables: Record<string, string>;
  correlationId?: string;
};

export type SmsSendSuccess = {
  ok: true;
  providerMessageId: string | null;
};

export type SmsSendFailure = {
  ok: false;
  code:
    | "disabled"
    | "timeout"
    | "unavailable"
    | "invalid"
    | "rejected"
    | "rate_limited";
  message: string;
  retryable: boolean;
};

export type SmsSendResult = SmsSendSuccess | SmsSendFailure;

export type SmsProvider = {
  readonly name: string;
  isEnabled(): boolean;
  sendText(request: SmsSendTextRequest): Promise<SmsSendResult>;
  sendTemplate(request: SmsSendTemplateRequest): Promise<SmsSendResult>;
};

export type OtpPurposeValue =
  | "LOGIN"
  | "STAFF_LOGIN"
  | "VERIFY_MOBILE"
  | "BOOKING"
  | "FORM"
  | "GENERIC";

export type CommunicationConfig = {
  smsEnabled: boolean;
  providerName: string;
  timeoutMs: number;
  otpExpirySeconds: number;
  otpResendCooldownSeconds: number;
  otpMaxAttempts: number;
  smsMaxAttempts: number;
};
