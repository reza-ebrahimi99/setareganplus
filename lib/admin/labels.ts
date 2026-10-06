import { LeadScoreBand, LeadSourceType } from "@/generated/prisma/enums";
import { SCORE_BAND_LABELS } from "@/lib/crm/scoring";

export const OPS_PRIORITY_LABELS: Record<string, string> = {
  LOW: "کم",
  NORMAL: "عادی",
  HIGH: "بالا",
  URGENT: "فوری",
};

export const OPS_SLA_LABELS: Record<string, string> = {
  OK: "در محدوده",
  AT_RISK: "در آستانه",
  BREACHED: "عقب‌افتاده",
};

export const OPS_ENTITY_LABELS: Record<string, string> = {
  LEAD: "متقاضی",
  CRM_TASK: "وظیفه",
  REGISTRATION: "ثبت‌نام",
};

export const LEAD_SOURCE_TYPE_LABELS: Record<LeadSourceType, string> = {
  FORM: "فرم",
  BOOKING: "رزرو نوبت",
  MANUAL: "ثبت دستی",
  IMPORT: "ورود فایل",
  REGISTRATION: "ثبت‌نام",
  OTHER: "سایر",
};

const LEAD_SOURCE_LABELS: Record<string, string> = {
  WEB_PRE_REGISTRATION: "پیش‌ثبت‌نام وب",
  PRE_REGISTRATION: "پیش‌ثبت‌نام",
  FORM_SUBMISSION: "فرم",
  MANUAL: "ثبت دستی",
  BOOKING: "رزرو نوبت",
  IMPORT: "ورود فایل",
  REGISTRATION: "ثبت‌نام",
  SHOP: "فروشگاه",
  AUTOMATION: "اتوماسیون",
  AI_ASSISTANT: "دستیار هوشمند",
  "AI Assistant": "دستیار هوشمند",
};

export function scoreBandLabel(band: string): string {
  if ((Object.values(LeadScoreBand) as string[]).includes(band)) {
    return SCORE_BAND_LABELS[band as LeadScoreBand];
  }
  return "نامشخص";
}

export function leadSourceTypeLabel(sourceType: string): string {
  if ((Object.values(LeadSourceType) as string[]).includes(sourceType)) {
    return LEAD_SOURCE_TYPE_LABELS[sourceType as LeadSourceType];
  }
  return "سایر";
}

export function leadSourceLabel(source: string): string {
  const known = LEAD_SOURCE_LABELS[source];
  if (known) return known;
  if ((Object.values(LeadSourceType) as string[]).includes(source)) {
    return LEAD_SOURCE_TYPE_LABELS[source as LeadSourceType];
  }
  return source;
}

export function opsPriorityLabel(priority: string): string {
  return OPS_PRIORITY_LABELS[priority] ?? "عادی";
}

export function opsSlaLabel(slaState: string): string {
  return OPS_SLA_LABELS[slaState] ?? "در محدوده";
}

export function opsEntityLabel(entityType: string): string {
  return OPS_ENTITY_LABELS[entityType] ?? "مورد";
}
