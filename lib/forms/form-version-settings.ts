/**
 * Minimal FormVersion.settings JSON contract (v0.4.2).
 * Unknown keys are ignored; defaults are secure/conservative.
 *
 * {
 *   "showRemainingCapacity": true
 * }
 */
export type FormVersionSettings = {
  showRemainingCapacity: boolean;
  /** When true, enqueue confirmation SMS after successful submission (semantic MOBILE). */
  confirmationSmsEnabled: boolean;
};

export function parseFormVersionSettings(raw: unknown): FormVersionSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { showRemainingCapacity: false, confirmationSmsEnabled: false };
  }

  const record = raw as Record<string, unknown>;
  return {
    showRemainingCapacity: record.showRemainingCapacity === true,
    confirmationSmsEnabled: record.confirmationSmsEnabled === true,
  };
}

export function serializeFormVersionSettings(
  settings: FormVersionSettings,
): Record<string, boolean> {
  return {
    showRemainingCapacity: settings.showRemainingCapacity === true,
    confirmationSmsEnabled: settings.confirmationSmsEnabled === true,
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
  return null;
}
