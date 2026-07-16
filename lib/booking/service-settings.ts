/**
 * BookingService.settings JSON contract.
 */

export type BookingDuplicateKey =
  | "normalizedMobile"
  | "normalizedNationalId"
  | "service"
  | "advisor"
  | "bookingDate";

export type BookingServiceSettings = {
  allowWaitingList: boolean;
  allowAdvisorSelection: boolean;
  allowBranchSelection: boolean;
  showRemainingCapacity: boolean;
  autoConfirm: boolean;
  /** When true, enqueue confirmation SMS after successful reservation (outside capacity tx). */
  confirmationSmsEnabled: boolean;
  duplicateKeys: BookingDuplicateKey[];
  onlineMeetingInfo: string | null;
  addressInfo: string | null;
};

const DEFAULTS: BookingServiceSettings = {
  allowWaitingList: true,
  allowAdvisorSelection: true,
  allowBranchSelection: false,
  showRemainingCapacity: true,
  autoConfirm: true,
  confirmationSmsEnabled: false,
  duplicateKeys: ["normalizedMobile", "service", "bookingDate"],
  onlineMeetingInfo: null,
  addressInfo: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBookingServiceSettings(
  raw: unknown,
): BookingServiceSettings {
  if (!isRecord(raw)) {
    return { ...DEFAULTS };
  }

  const keys = Array.isArray(raw.duplicateKeys)
    ? raw.duplicateKeys.filter(
        (key): key is BookingDuplicateKey =>
          key === "normalizedMobile" ||
          key === "normalizedNationalId" ||
          key === "service" ||
          key === "advisor" ||
          key === "bookingDate",
      )
    : DEFAULTS.duplicateKeys;

  return {
    allowWaitingList: raw.allowWaitingList === true,
    allowAdvisorSelection: raw.allowAdvisorSelection !== false,
    allowBranchSelection: raw.allowBranchSelection === true,
    showRemainingCapacity: raw.showRemainingCapacity !== false,
    autoConfirm: raw.autoConfirm !== false,
    confirmationSmsEnabled: raw.confirmationSmsEnabled === true,
    duplicateKeys: keys.length > 0 ? keys : DEFAULTS.duplicateKeys,
    onlineMeetingInfo:
      typeof raw.onlineMeetingInfo === "string" && raw.onlineMeetingInfo.trim()
        ? raw.onlineMeetingInfo.trim()
        : null,
    addressInfo:
      typeof raw.addressInfo === "string" && raw.addressInfo.trim()
        ? raw.addressInfo.trim()
        : null,
  };
}

export function parseMeetingTypes(raw: unknown): Array<"IN_PERSON" | "ONLINE" | "PHONE"> {
  if (!Array.isArray(raw)) {
    return ["IN_PERSON"];
  }
  const allowed = new Set(["IN_PERSON", "ONLINE", "PHONE"]);
  const values = raw.filter(
    (item): item is "IN_PERSON" | "ONLINE" | "PHONE" =>
      typeof item === "string" && allowed.has(item),
  );
  return values.length > 0 ? values : ["IN_PERSON"];
}
