import { DEFAULT_SMS } from "./constants";

export type ConsultSettings = {
  publicOpen: boolean;
  specialOpen: boolean;
  slotMinutes: number;
  horizonDays: number;
  minNoticeMinutes: number;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  otpTemplateId: number | null;
  createdTemplateId: number | null;
  cancelledTemplateId: number | null;
  movedTemplateId: number | null;
  reminderTemplateId: number | null;
  smsCreated: string;
  smsCancelled: string;
  smsMoved: string;
  smsReminder: string;
};

export const DEFAULT_CONSULT_SETTINGS: ConsultSettings = {
  publicOpen: true,
  specialOpen: true,
  slotMinutes: 30,
  horizonDays: 21,
  minNoticeMinutes: 120,
  reminderEnabled: false,
  reminderHoursBefore: 24,
  otpTemplateId: null,
  createdTemplateId: null,
  cancelledTemplateId: null,
  movedTemplateId: null,
  reminderTemplateId: null,
  smsCreated: DEFAULT_SMS.created,
  smsCancelled: DEFAULT_SMS.cancelled,
  smsMoved: DEFAULT_SMS.moved,
  smsReminder: DEFAULT_SMS.reminder,
};

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function intIn(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
function templateId(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function smsText(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t ? t.slice(0, 700) : fallback;
}

/**
 * Settings are only switches, lengths, and SMS copy.
 * A `windows` / `consultants` / `slots` blob in the JSON is ignored on purpose.
 */
export function parseConsultSettings(value: unknown): ConsultSettings {
  const v = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    publicOpen: bool(v.publicOpen, DEFAULT_CONSULT_SETTINGS.publicOpen),
    specialOpen: bool(v.specialOpen, DEFAULT_CONSULT_SETTINGS.specialOpen),
    slotMinutes: intIn(v.slotMinutes, 10, 120, DEFAULT_CONSULT_SETTINGS.slotMinutes),
    horizonDays: intIn(v.horizonDays, 1, 60, DEFAULT_CONSULT_SETTINGS.horizonDays),
    minNoticeMinutes: intIn(v.minNoticeMinutes, 0, 7 * 24 * 60, DEFAULT_CONSULT_SETTINGS.minNoticeMinutes),
    reminderEnabled: bool(v.reminderEnabled, false),
    reminderHoursBefore: intIn(v.reminderHoursBefore, 1, 72, DEFAULT_CONSULT_SETTINGS.reminderHoursBefore),
    otpTemplateId: templateId(v.otpTemplateId),
    createdTemplateId: templateId(v.createdTemplateId),
    cancelledTemplateId: templateId(v.cancelledTemplateId),
    movedTemplateId: templateId(v.movedTemplateId),
    reminderTemplateId: templateId(v.reminderTemplateId),
    smsCreated: smsText(v.smsCreated, DEFAULT_SMS.created),
    smsCancelled: smsText(v.smsCancelled, DEFAULT_SMS.cancelled),
    smsMoved: smsText(v.smsMoved, DEFAULT_SMS.moved),
    smsReminder: smsText(v.smsReminder, DEFAULT_SMS.reminder),
  };
}
