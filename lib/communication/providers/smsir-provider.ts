import type {
  SmsOtpTemplateRequest,
  SmsPatternTemplateRequest,
  SmsProvider,
  SmsProviderErrorCode,
  SmsSendFailure,
  SmsSendResult,
  SmsSendTemplateRequest,
  SmsSendTextRequest,
  SmsTemplateMessageRequest,
} from "@/lib/communication/types";

const DEFAULT_BASE_URL = "https://api.sms.ir";
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_PARAMETER_VALUE_LENGTH = 25;

type SmsIrTemplateKind = "otp" | "booking" | "form" | "commerce";

type SmsIrRuntimeConfig = {
  apiKey: string | null;
  baseUrl: string | null;
  timeoutMs: number;
  lineNumber: number | null;
  templateIds: Record<SmsIrTemplateKind, number | null>;
  parameterNames: {
    otpCode: string | null;
    bookingName: string | null;
    bookingDate: string | null;
    bookingTime: string | null;
    bookingTracking: string | null;
    formName: string | null;
    formTracking: string | null;
    commerceFullName: string | null;
    commerceProduct: string | null;
    commerceAmount: string | null;
  };
};

export type SmsIrConfigurationStatus = {
  apiKeyConfigured: boolean;
  baseUrlConfigured: boolean;
  baseUrlValid: boolean;
  timeoutMs: number;
  otpTemplateConfigured: boolean;
  bookingTemplateConfigured: boolean;
  formTemplateConfigured: boolean;
  commerceTemplateConfigured: boolean;
  otpParameterConfigured: boolean;
  bookingParametersConfigured: boolean;
  formParametersConfigured: boolean;
  commerceParametersConfigured: boolean;
  providerConfigured: boolean;
};

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readPositiveInteger(value: string | undefined): number | null {
  const trimmed = trimToNull(value);
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function hasSmsIrLineNumber(): boolean {
  return readPositiveInteger(process.env.SMSIR_LINE_NUMBER) !== null;
}

function readParameterName(
  value: string | undefined,
  fallback: string,
): string | null {
  const resolved = trimToNull(value) ?? fallback;
  return /^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(resolved)
    ? resolved
    : null;
}

function readBaseUrl(value: string | undefined): string | null {
  try {
    const url = new URL(trimToNull(value) ?? DEFAULT_BASE_URL);
    const hostname = url.hostname.toLowerCase();
    const isSmsIrHost = hostname === "sms.ir" || hostname.endsWith(".sms.ir");
    if (
      url.protocol !== "https:" ||
      !isSmsIrHost ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function readSmsIrTimeoutMs(fallback = DEFAULT_TIMEOUT_MS): number {
  const parsed = Number(process.env.SMSIR_TIMEOUT_MS ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), MAX_TIMEOUT_MS);
}

function readSmsIrRuntimeConfig(): SmsIrRuntimeConfig {
  console.info("[smsir-config] SMSIR_LINE_NUMBER raw", {
    SMSIR_LINE_NUMBER: process.env.SMSIR_LINE_NUMBER,
    typeof: typeof process.env.SMSIR_LINE_NUMBER,
    json: JSON.stringify(process.env.SMSIR_LINE_NUMBER),
  });
  const parsedLineNumber = readPositiveInteger(process.env.SMSIR_LINE_NUMBER);
  console.info("[smsir-config] SMSIR_LINE_NUMBER parsed", {
    parsedLineNumber,
  });
  return {
    apiKey: trimToNull(process.env.SMSIR_API_KEY),
    baseUrl: readBaseUrl(process.env.SMSIR_API_BASE_URL),
    timeoutMs: readSmsIrTimeoutMs(),
    lineNumber: parsedLineNumber,
    templateIds: {
      otp: readPositiveInteger(process.env.SMSIR_OTP_TEMPLATE_ID),
      booking: readPositiveInteger(process.env.SMSIR_BOOKING_TEMPLATE_ID),
      form: readPositiveInteger(process.env.SMSIR_FORM_TEMPLATE_ID),
      commerce: readPositiveInteger(process.env.SMSIR_COMMERCE_TEMPLATE_ID),
    },
    parameterNames: {
      otpCode: readParameterName(
        process.env.SMSIR_OTP_PARAMETER_NAME,
        "CODE",
      ),
      bookingName: readParameterName(
        process.env.SMSIR_BOOKING_PARAM_NAME,
        "NAME",
      ),
      bookingDate: readParameterName(
        process.env.SMSIR_BOOKING_PARAM_DATE,
        "DATE",
      ),
      bookingTime: readParameterName(
        process.env.SMSIR_BOOKING_PARAM_TIME,
        "TIME",
      ),
      bookingTracking: readParameterName(
        process.env.SMSIR_BOOKING_PARAM_TRACKING,
        "TRACKING",
      ),
      formName: readParameterName(process.env.SMSIR_FORM_PARAM_NAME, "NAME"),
      formTracking: readParameterName(
        process.env.SMSIR_FORM_PARAM_TRACKING,
        "TRACKING",
      ),
      commerceFullName: readParameterName(
        process.env.SMSIR_COMMERCE_PARAM_FULLNAME,
        "FULLNAME",
      ),
      commerceProduct: readParameterName(
        process.env.SMSIR_COMMERCE_PARAM_PRODUCT,
        "PRODUCT",
      ),
      commerceAmount: readParameterName(
        process.env.SMSIR_COMMERCE_PARAM_AMOUNT,
        "AMOUNT",
      ),
    },
  };
}

export function getSmsIrConfigurationStatus(): SmsIrConfigurationStatus {
  const config = readSmsIrRuntimeConfig();
  const otpParameterConfigured = config.parameterNames.otpCode !== null;
  const bookingParametersConfigured =
    config.parameterNames.bookingName !== null &&
    config.parameterNames.bookingDate !== null &&
    config.parameterNames.bookingTime !== null &&
    config.parameterNames.bookingTracking !== null;
  const formParametersConfigured =
    config.parameterNames.formName !== null &&
    config.parameterNames.formTracking !== null;
  const commerceParametersConfigured =
    config.parameterNames.commerceFullName !== null &&
    config.parameterNames.commerceProduct !== null &&
    config.parameterNames.commerceAmount !== null;

  return {
    apiKeyConfigured: config.apiKey !== null,
    baseUrlConfigured: trimToNull(process.env.SMSIR_API_BASE_URL) !== null,
    baseUrlValid: config.baseUrl !== null,
    timeoutMs: config.timeoutMs,
    otpTemplateConfigured: config.templateIds.otp !== null,
    bookingTemplateConfigured: config.templateIds.booking !== null,
    formTemplateConfigured: config.templateIds.form !== null,
    commerceTemplateConfigured: config.templateIds.commerce !== null,
    otpParameterConfigured,
    bookingParametersConfigured,
    formParametersConfigured,
    commerceParametersConfigured,
    // Commerce template is optional — does not gate existing OTP/booking/form readiness.
    providerConfigured:
      config.apiKey !== null &&
      config.baseUrl !== null &&
      config.templateIds.otp !== null &&
      config.templateIds.booking !== null &&
      config.templateIds.form !== null &&
      otpParameterConfigured &&
      bookingParametersConfigured &&
      formParametersConfigured,
  };
}

function failure(
  errorCode: SmsProviderErrorCode,
  safeMessage: string,
  retryable: boolean,
  providerStatusCode: number | null = null,
): SmsSendFailure {
  return {
    ok: false,
    providerMessageId: null,
    providerStatusCode,
    errorCode,
    safeMessage,
    retryable,
    code: errorCode,
    message: safeMessage,
  };
}

function success(
  providerMessageId: string | null,
  providerStatusCode: number | null,
): SmsSendResult {
  return {
    ok: true,
    providerMessageId,
    providerStatusCode,
    retryable: false,
    errorCode: null,
    safeMessage: null,
  };
}

function configurationFailure(): SmsSendFailure {
  return failure(
    "configuration",
    "تنظیمات سرویس پیامک کامل یا معتبر نیست.",
    false,
  );
}

function sendTextConfigurationReason(
  enabled: boolean,
  config: SmsIrRuntimeConfig,
): string {
  if (process.env.STAROS_SMS_ENABLED !== "true") return "provider_disabled";
  if (process.env.STAROS_SMS_PROVIDER?.trim().toLowerCase() !== "smsir") {
    return "provider_disabled";
  }
  if (config.apiKey === null) return "apiKey_missing";
  if (config.baseUrl === null) return "baseUrl_invalid";
  if (!enabled) return "provider_disabled";
  if (config.lineNumber === null) return "lineNumber_null";
  return "unknown";
}

function logSmsIrConfigFailure(params: {
  enabled: boolean;
  config: SmsIrRuntimeConfig;
  reason: string;
}): void {
  console.info("[smsir-config]", {
    enabled: params.enabled,
    apiKeyPresent: params.config.apiKey !== null,
    baseUrl: params.config.baseUrl,
    lineNumber: params.config.lineNumber,
    templateIds: params.config.templateIds,
    reason: params.reason,
  });
}

function validateMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(mobile);
}

function validateParameters(
  parameters: Array<{ name: string | null; value: string }>,
): parameters is Array<{ name: string; value: string }> {
  return parameters.every(
    (parameter) =>
      parameter.name !== null &&
      parameter.value.length > 0 &&
      parameter.value.length <= MAX_PARAMETER_VALUE_LENGTH,
  );
}

function readBusinessStatus(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const status = Reflect.get(value, "status");
  return typeof status === "number" && Number.isInteger(status) ? status : null;
}

function readAcceptedMessageId(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const data = Reflect.get(value, "data");
  if (typeof data !== "object" || data === null) return null;
  const messageId = Reflect.get(data, "messageId");
  return typeof messageId === "number" &&
    Number.isSafeInteger(messageId) &&
    messageId > 0
    ? String(messageId)
    : null;
}

function readProviderMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const message = Reflect.get(value, "message");
  return typeof message === "string" ? message : null;
}

const SENSITIVE_LOG_KEY =
  /^(mobile|mobiles|toMobile|phone|apiKey|api_key|authorization|token|messageText)$/i;

function sanitizeSmsIrLogJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSmsIrLogJson(item));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_LOG_KEY.test(key)) continue;
    out[key] = sanitizeSmsIrLogJson(item);
  }
  return out;
}

function logSendTextDiagnostics(params: {
  httpStatus: number | null;
  rawJson: unknown;
  result: SmsSendResult;
  lineNumber: number | null;
}): SmsSendResult {
  console.info("[smsir] sendText", {
    httpStatus: params.httpStatus,
    rawJson:
      params.rawJson === null || params.rawJson === undefined
        ? null
        : sanitizeSmsIrLogJson(params.rawJson),
    normalizedSmsSendResult: params.result,
    providerStatus: params.result.providerStatusCode,
    providerMessage: readProviderMessage(params.rawJson),
    lineNumber: params.lineNumber,
  });
  return params.result;
}

function mapHttpFailure(
  status: number,
  providerStatusCode: number | null,
): SmsSendFailure {
  if (status === 400) {
    return failure(
      "invalid",
      "درخواست پیامک توسط سرویس رد شد.",
      false,
      providerStatusCode,
    );
  }
  if (status === 401) {
    return failure(
      "configuration",
      "احراز هویت سرویس پیامک ناموفق بود.",
      false,
      providerStatusCode,
    );
  }
  if (status === 429) {
    return failure(
      "rate_limited",
      "محدودیت موقت ارسال پیامک اعمال شده است.",
      true,
      providerStatusCode,
    );
  }
  if (status === 408 || status >= 500) {
    return failure(
      "unavailable",
      "سرویس پیامک موقتاً در دسترس نیست.",
      true,
      providerStatusCode,
    );
  }
  return failure(
    "rejected",
    "درخواست پیامک توسط سرویس رد شد.",
    false,
    providerStatusCode,
  );
}

function mapBusinessFailure(status: number): SmsSendFailure {
  if (status === 20) {
    return failure(
      "rate_limited",
      "محدودیت موقت ارسال پیامک اعمال شده است.",
      true,
      status,
    );
  }
  if (status === 0) {
    return failure(
      "unavailable",
      "سرویس پیامک موقتاً در دسترس نیست.",
      true,
      status,
    );
  }
  if (
    [10, 11, 12, 13, 14, 113, 119, 123].includes(status)
  ) {
    return failure(
      "configuration",
      "تنظیمات سرویس یا قالب پیامک معتبر نیست.",
      false,
      status,
    );
  }
  return failure(
    "rejected",
    "درخواست پیامک توسط سرویس رد شد.",
    false,
    status,
  );
}

export class SmsIrProvider implements SmsProvider {
  readonly name = "smsir";

  isEnabled(): boolean {
    const status = getSmsIrConfigurationStatus();
    return (
      process.env.STAROS_SMS_ENABLED === "true" &&
      process.env.STAROS_SMS_PROVIDER?.trim().toLowerCase() === this.name &&
      status.apiKeyConfigured &&
      status.baseUrlValid
    );
  }

  async sendText(request: SmsSendTextRequest): Promise<SmsSendResult> {
    const config = readSmsIrRuntimeConfig();
    const body = request.body.trim();
    const lineNumber = config.lineNumber;
    const enabled = this.isEnabled();
    if (
      !enabled ||
      config.apiKey === null ||
      config.baseUrl === null ||
      config.lineNumber === null
    ) {
      logSmsIrConfigFailure({
        enabled,
        config,
        reason: sendTextConfigurationReason(enabled, config),
      });
      return logSendTextDiagnostics({
        httpStatus: null,
        rawJson: null,
        result: configurationFailure(),
        lineNumber,
      });
    }
    if (!validateMobile(request.toMobile) || body.length === 0 || body.length > 900) {
      return logSendTextDiagnostics({
        httpStatus: null,
        rawJson: null,
        result: failure("invalid", "متن یا شماره پیامک معتبر نیست.", false),
        lineNumber,
      });
    }

    try {
      const response = await fetch(`${config.baseUrl}/v1/send`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-KEY": config.apiKey,
        },
        body: JSON.stringify({
          lineNumber: config.lineNumber,
          messageText: body,
          mobiles: [request.toMobile],
        }),
        signal: request.signal,
      });

      if (!response.ok) {
        let rawJson: unknown = null;
        let providerStatusCode: number | null = null;
        try {
          rawJson = await response.json();
          providerStatusCode = readBusinessStatus(rawJson);
        } catch {
          // HTTP status remains sufficient.
        }
        if (providerStatusCode === 20) {
          return logSendTextDiagnostics({
            httpStatus: response.status,
            rawJson,
            result: mapBusinessFailure(providerStatusCode),
            lineNumber,
          });
        }
        return logSendTextDiagnostics({
          httpStatus: response.status,
          rawJson,
          result: mapHttpFailure(response.status, providerStatusCode),
          lineNumber,
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return logSendTextDiagnostics({
          httpStatus: response.status,
          rawJson: null,
          result: failure("malformed_response", "پاسخ سرویس پیامک قابل تأیید نبود.", true),
          lineNumber,
        });
      }

      const providerStatusCode = readBusinessStatus(payload);
      if (providerStatusCode === null) {
        return logSendTextDiagnostics({
          httpStatus: response.status,
          rawJson: payload,
          result: failure("malformed_response", "پاسخ سرویس پیامک قابل تأیید نبود.", true),
          lineNumber,
        });
      }
      if (providerStatusCode !== 1) {
        return logSendTextDiagnostics({
          httpStatus: response.status,
          rawJson: payload,
          result: mapBusinessFailure(providerStatusCode),
          lineNumber,
        });
      }

      const providerMessageId = readAcceptedMessageId(payload);
      return logSendTextDiagnostics({
        httpStatus: response.status,
        rawJson: payload,
        result: success(providerMessageId, providerStatusCode),
        lineNumber,
      });
    } catch (error) {
      if (
        (error instanceof Error && error.name === "AbortError") ||
        request.signal?.aborted
      ) {
        return logSendTextDiagnostics({
          httpStatus: null,
          rawJson: null,
          result: failure("timeout", "زمان ارسال پیامک به پایان رسید.", true),
          lineNumber,
        });
      }
      return logSendTextDiagnostics({
        httpStatus: null,
        rawJson: null,
        result: failure("unavailable", "سرویس پیامک در دسترس نیست.", true),
        lineNumber,
      });
    }
  }

  async sendOtpTemplate(
    request: SmsOtpTemplateRequest,
  ): Promise<SmsSendResult> {
    if (!/^\d{6}$/.test(request.code)) {
      return failure("invalid", "پارامترهای پیامک معتبر نیست.", false);
    }
    const config = readSmsIrRuntimeConfig();
    return this.sendVerify(
      request.toMobile,
      config.templateIds.otp,
      [{ name: config.parameterNames.otpCode, value: request.code }],
      request.signal,
      config,
      /* isOtp */ true,
    );
  }

  async sendTemplateMessage(
    request: SmsTemplateMessageRequest,
  ): Promise<SmsSendResult> {
    const config = readSmsIrRuntimeConfig();
    if (request.kind === "booking") {
      return this.sendVerify(
        request.toMobile,
        config.templateIds.booking,
        [
          {
            name: config.parameterNames.bookingName,
            value: request.variables.name,
          },
          {
            name: config.parameterNames.bookingDate,
            value: request.variables.date,
          },
          {
            name: config.parameterNames.bookingTime,
            value: request.variables.time,
          },
          {
            name: config.parameterNames.bookingTracking,
            value: request.variables.tracking,
          },
        ],
        request.signal,
        config,
        /* isOtp */ false,
      );
    }
    if (request.kind === "commerce") {
      return this.sendVerify(
        request.toMobile,
        config.templateIds.commerce,
        [
          {
            name: config.parameterNames.commerceFullName,
            value: request.variables.fullName,
          },
          {
            name: config.parameterNames.commerceProduct,
            value: request.variables.product,
          },
          {
            name: config.parameterNames.commerceAmount,
            value: request.variables.amount,
          },
        ],
        request.signal,
        config,
        /* isOtp */ false,
      );
    }
    return this.sendVerify(
      request.toMobile,
      config.templateIds.form,
      [
        { name: config.parameterNames.formName, value: request.variables.name },
        {
          name: config.parameterNames.formTracking,
          value: request.variables.tracking,
        },
      ],
      request.signal,
      config,
      /* isOtp */ false,
    );
  }

  async sendPatternTemplate(
    request: SmsPatternTemplateRequest,
  ): Promise<SmsSendResult> {
    const config = readSmsIrRuntimeConfig();
    const templateId = readPositiveInteger(request.templateCode);
    const parameters = Object.entries(request.parameters).map(([name, value]) => ({
      name: readParameterName(name, name),
      value: value.trim(),
    }));
    if (parameters.length > 10) {
      return failure("invalid", "پارامترهای قالب پیامک معتبر نیست.", false);
    }
    return this.sendVerify(
      request.toMobile,
      templateId,
      parameters,
      request.signal,
      config,
      /* isOtp */ false,
    );
  }

  async sendTemplate(
    request: SmsSendTemplateRequest,
  ): Promise<SmsSendResult> {
    const code = request.variables.code;
    if (typeof code === "string") {
      return this.sendOtpTemplate({
        toMobile: request.toMobile,
        code,
        correlationId: request.correlationId,
        signal: request.signal,
      });
    }
    return failure(
      "invalid",
      "نوع قالب پیامک پشتیبانی نمی‌شود.",
      false,
    );
  }

  private async sendVerify(
    mobile: string,
    templateId: number | null,
    parameters: Array<{ name: string | null; value: string }>,
    signal: AbortSignal | undefined,
    config: SmsIrRuntimeConfig,
    isOtp: boolean,
  ): Promise<SmsSendResult> {
    if (
      !this.isEnabled() ||
      config.apiKey === null ||
      config.baseUrl === null ||
      templateId === null
    ) {
      return configurationFailure();
    }
    if (!validateMobile(mobile) || !validateParameters(parameters)) {
      return failure("invalid", "پارامترهای پیامک معتبر نیست.", false);
    }

    // ─── TEMPORARY DEBUG — SMS.ir Verify delivery investigation ───────────
    // Remove this whole block once the non-delivery issue is diagnosed.
    // Logs the recipient mobile number and, for non-OTP calls, full
    // parameter values (product/price/tracking — not secrets). OTP calls
    // never log the actual code, only its parameter name.
    const debugUrl = `${config.baseUrl}/v1/send/verify`;
    const debugRequestBody = { mobile, templateId, parameters };
    console.info("[smsir-verify-debug] REQUEST", {
      isOtp,
      url: debugUrl,
      templateId,
      mobile,
      parameters: isOtp
        ? parameters.map((p) => ({ name: p.name, value: "[REDACTED:OTP]" }))
        : parameters,
      requestBody: isOtp
        ? { ...debugRequestBody, parameters: "[REDACTED:OTP]" }
        : debugRequestBody,
    });
    // ────────────────────────────────────────────────────────────────────

    try {
      const response = await fetch(debugUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-KEY": config.apiKey,
        },
        body: JSON.stringify(debugRequestBody),
        signal,
      });

      // Read the body exactly once (as text, then parsed) so both the
      // !response.ok and response.ok branches below can use the identical
      // parsed payload the original code computed independently in each
      // branch — behavior is unchanged, only where the read happens moved.
      const rawResponseText = await response.text();
      let payload: unknown = null;
      try {
        payload = rawResponseText ? JSON.parse(rawResponseText) : null;
      } catch {
        payload = null;
      }

      // ─── TEMPORARY DEBUG — SMS.ir Verify delivery investigation ─────────
      console.info("[smsir-verify-debug] RESPONSE", {
        isOtp,
        url: debugUrl,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        rawBody: rawResponseText,
        parsedBody: payload,
      });
      // ────────────────────────────────────────────────────────────────────

      if (!response.ok) {
        const providerStatusCode = readBusinessStatus(payload);
        if (providerStatusCode === 20) {
          return mapBusinessFailure(providerStatusCode);
        }
        return mapHttpFailure(response.status, providerStatusCode);
      }

      if (payload === null) {
        return failure(
          "malformed_response",
          "پاسخ سرویس پیامک قابل تأیید نبود.",
          true,
        );
      }

      const providerStatusCode = readBusinessStatus(payload);
      if (providerStatusCode === null) {
        return failure(
          "malformed_response",
          "پاسخ سرویس پیامک قابل تأیید نبود.",
          true,
        );
      }
      if (providerStatusCode !== 1) {
        return mapBusinessFailure(providerStatusCode);
      }

      const providerMessageId = readAcceptedMessageId(payload);
      if (providerMessageId === null) {
        return failure(
          "malformed_response",
          "پاسخ سرویس پیامک قابل تأیید نبود.",
          true,
          providerStatusCode,
        );
      }
      return success(providerMessageId, providerStatusCode);
    } catch (error) {
      // ─── TEMPORARY DEBUG — SMS.ir Verify delivery investigation ─────────
      console.error("[smsir-verify-debug] FETCH_ERROR", {
        isOtp,
        url: debugUrl,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : error,
      });
      // ────────────────────────────────────────────────────────────────────
      if (
        (error instanceof Error && error.name === "AbortError") ||
        signal?.aborted
      ) {
        return failure(
          "timeout",
          "زمان ارسال پیامک به پایان رسید.",
          true,
        );
      }
      return failure(
        "unavailable",
        "سرویس پیامک در دسترس نیست.",
        true,
      );
    }
  }
}
