/**
 * Optional FormVersion.settings.booking connection (forms ↔ booking).
 */

export type FormBookingRequireTiming = "before_submit" | "after_submit" | "optional";

export type FormBookingSettings = {
  enabled: boolean;
  serviceId: string | null;
  requireTiming: FormBookingRequireTiming;
  allowWaitingList: boolean;
  allowAdvisorSelection: boolean;
  allowBranchSelection: boolean;
  showRemainingCapacity: boolean;
};

const DEFAULTS: FormBookingSettings = {
  enabled: false,
  serviceId: null,
  requireTiming: "optional",
  allowWaitingList: true,
  allowAdvisorSelection: true,
  allowBranchSelection: false,
  showRemainingCapacity: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFormBookingSettings(raw: unknown): FormBookingSettings {
  if (!isRecord(raw)) {
    return { ...DEFAULTS };
  }
  const booking = isRecord(raw.booking) ? raw.booking : null;
  if (!booking) {
    return { ...DEFAULTS };
  }

  const timing = booking.requireTiming;
  const requireTiming: FormBookingRequireTiming =
    timing === "before_submit" || timing === "after_submit" || timing === "optional"
      ? timing
      : "optional";

  return {
    enabled: booking.enabled === true,
    serviceId:
      typeof booking.serviceId === "string" && booking.serviceId.trim()
        ? booking.serviceId.trim()
        : null,
    requireTiming,
    allowWaitingList: booking.allowWaitingList === true,
    allowAdvisorSelection: booking.allowAdvisorSelection !== false,
    allowBranchSelection: booking.allowBranchSelection === true,
    showRemainingCapacity: booking.showRemainingCapacity !== false,
  };
}

export function mergeFormSettingsWithBooking(
  existing: unknown,
  booking: FormBookingSettings,
): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {};
  base.booking = {
    enabled: booking.enabled,
    serviceId: booking.serviceId,
    requireTiming: booking.requireTiming,
    allowWaitingList: booking.allowWaitingList,
    allowAdvisorSelection: booking.allowAdvisorSelection,
    allowBranchSelection: booking.allowBranchSelection,
    showRemainingCapacity: booking.showRemainingCapacity,
  };
  return base;
}
