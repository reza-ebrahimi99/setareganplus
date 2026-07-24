/**
 * Minimal FormVersion.settings JSON contract (v0.4.2+).
 * Unknown keys are ignored; defaults are secure/conservative.
 */

export type FormVersionSettings = {
  showRemainingCapacity: boolean;
  /** When true, enqueue confirmation SMS after successful submission (semantic MOBILE). */
  confirmationSmsEnabled: boolean;
  /** When true, enqueue admin alert SMS for configured recipients. */
  adminNotificationSmsEnabled: boolean;
  /** Normalized Iranian mobiles for admin alerts. */
  adminSmsRecipients: string[];
  /** Optional SMS.ir pattern / template code override. */
  smsTemplateCode: string | null;
};

const DEFAULT_SETTINGS: FormVersionSettings = {
  showRemainingCapacity: false,
  confirmationSmsEnabled: false,
  adminNotificationSmsEnabled: false,
  adminSmsRecipients: [],
  smsTemplateCode: null,
};

function parseAdminSmsRecipients(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const recipients: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!recipients.includes(trimmed)) {
      recipients.push(trimmed);
    }
  }
  return recipients;
}

export function parseFormVersionSettings(raw: unknown): FormVersionSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_SETTINGS };
  }

  const record = raw as Record<string, unknown>;
  const smsTemplateCodeRaw = record.smsTemplateCode;
  const smsTemplateCode =
    typeof smsTemplateCodeRaw === "string" && smsTemplateCodeRaw.trim()
      ? smsTemplateCodeRaw.trim()
      : null;

  return {
    showRemainingCapacity: record.showRemainingCapacity === true,
    confirmationSmsEnabled: record.confirmationSmsEnabled === true,
    adminNotificationSmsEnabled: record.adminNotificationSmsEnabled === true,
    adminSmsRecipients: parseAdminSmsRecipients(record.adminSmsRecipients),
    smsTemplateCode,
  };
}

export function serializeFormVersionSettings(
  settings: FormVersionSettings,
): Record<string, unknown> {
  return {
    showRemainingCapacity: settings.showRemainingCapacity === true,
    confirmationSmsEnabled: settings.confirmationSmsEnabled === true,
    adminNotificationSmsEnabled: settings.adminNotificationSmsEnabled === true,
    adminSmsRecipients: Array.isArray(settings.adminSmsRecipients)
      ? settings.adminSmsRecipients.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
      : [],
    smsTemplateCode:
      typeof settings.smsTemplateCode === "string" &&
      settings.smsTemplateCode.trim()
        ? settings.smsTemplateCode.trim()
        : null,
  };
}

export function validateFormVersionSettings(raw: unknown): string | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return "پیکربندی تنظیمات فرم معتبر نیست.";
  }
  const record = raw as Record<string, unknown>;
  if (
    "showRemainingCapacity" in record &&
    typeof record.showRemainingCapacity !== "boolean"
  ) {
    return "مقدار «نمایش ظرفیت باقی‌مانده» باید بلی/خیر باشد.";
  }
  if (
    "confirmationSmsEnabled" in record &&
    typeof record.confirmationSmsEnabled !== "boolean"
  ) {
    return "مقدار «ارسال پیامک تأیید» باید بلی/خیر باشد.";
  }
  if (
    "adminNotificationSmsEnabled" in record &&
    typeof record.adminNotificationSmsEnabled !== "boolean"
  ) {
    return "مقدار «پیامک اطلاع به مدیر» باید بلی/خیر باشد.";
  }
  if (
    "smsTemplateCode" in record &&
    record.smsTemplateCode != null &&
    typeof record.smsTemplateCode !== "string"
  ) {
    return "کد الگوی پیامک معتبر نیست.";
  }
  if ("adminSmsRecipients" in record && record.adminSmsRecipients != null) {
    if (!Array.isArray(record.adminSmsRecipients)) {
      return "فهرست شماره‌های مدیر معتبر نیست.";
    }
    for (const item of record.adminSmsRecipients) {
      if (typeof item !== "string") {
        return "فهرست شماره‌های مدیر معتبر نیست.";
      }
    }
  }
  return null;
}
