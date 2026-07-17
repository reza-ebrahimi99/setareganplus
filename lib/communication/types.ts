/**
 * Provider-neutral SMS / OTP communication types (StarOS v0.6A).
 * No vendor SDKs; secrets stay in environment variables.
 */

export type SmsSendTextRequest = {
  toMobile: string;
  body: string;
  /** Optional correlation for provider logs (never include OTP plaintext). */
  correlationId?: string;
  /** Cancellation must be propagated to the provider's network request. */
  signal?: AbortSignal;
};

/**
 * Legacy bridge for the existing v0.6A caller. New domain code must use the
 * logical OTP/booking/form requests below rather than vendor template codes.
 */
export type SmsSendTemplateRequest = {
  toMobile: string;
  templateCode: string;
  variables: Record<string, string>;
  correlationId?: string;
  signal?: AbortSignal;
};

export type SmsTemplateKind = "otp" | "booking" | "form";

export type SmsOtpTemplateRequest = {
  toMobile: string;
  code: string;
  correlationId?: string;
  signal?: AbortSignal;
};

export type SmsTemplateMessageRequest =
  | {
      kind: "booking";
      toMobile: string;
      variables: {
        name: string;
        date: string;
        time: string;
        tracking: string;
      };
      correlationId?: string;
      signal?: AbortSignal;
    }
  | {
      kind: "form";
      toMobile: string;
      variables: {
        name: string;
        tracking: string;
      };
      correlationId?: string;
      signal?: AbortSignal;
    };

export type SmsPatternTemplateRequest = {
  toMobile: string;
  /** Provider pattern identifier read from the organization's SmsTemplate.code. */
  templateCode: string;
  parameters: Record<string, string>;
  correlationId?: string;
  signal?: AbortSignal;
};

export type SmsProviderErrorCode =
  | "disabled"
  | "configuration"
  | "timeout"
  | "unavailable"
  | "invalid"
  | "rejected"
  | "rate_limited"
  | "malformed_response";

export type SmsSendSuccess = {
  ok: true;
  providerMessageId: string | null;
  providerStatusCode: number | null;
  retryable: false;
  errorCode: null;
  safeMessage: null;
};

export type SmsSendFailure = {
  ok: false;
  providerMessageId: null;
  providerStatusCode: number | null;
  errorCode: SmsProviderErrorCode;
  safeMessage: string;
  retryable: boolean;
  /** @deprecated Use `errorCode`; retained until queue/OTP migration. */
  code: SmsProviderErrorCode;
  /** @deprecated Use `safeMessage`; retained until queue/OTP migration. */
  message: string;
};

export type SmsSendResult = SmsSendSuccess | SmsSendFailure;

export type SmsProvider = {
  readonly name: string;
  isEnabled(): boolean;
  sendText(request: SmsSendTextRequest): Promise<SmsSendResult>;
  sendOtpTemplate(request: SmsOtpTemplateRequest): Promise<SmsSendResult>;
  sendTemplateMessage(
    request: SmsTemplateMessageRequest,
  ): Promise<SmsSendResult>;
  sendPatternTemplate(
    request: SmsPatternTemplateRequest,
  ): Promise<SmsSendResult>;
  /** @deprecated Compatibility bridge for the existing OTP caller. */
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
