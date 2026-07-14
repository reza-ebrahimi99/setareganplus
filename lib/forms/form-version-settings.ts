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
};

export function parseFormVersionSettings(raw: unknown): FormVersionSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { showRemainingCapacity: false };
  }

  const record = raw as Record<string, unknown>;
  return {
    showRemainingCapacity: record.showRemainingCapacity === true,
  };
}

export function serializeFormVersionSettings(
  settings: FormVersionSettings,
): Record<string, boolean> {
  return {
    showRemainingCapacity: settings.showRemainingCapacity === true,
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
  return null;
}
