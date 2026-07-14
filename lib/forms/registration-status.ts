/**
 * Persian registration-state badges for public forms (RTL).
 */

import type { FormAvailabilityStatus } from "@/lib/forms/evaluate-form-availability";

export type RegistrationBadgeTone =
  | "active"
  | "pending"
  | "full"
  | "closed"
  | "paused";

export type RegistrationBadge = {
  tone: RegistrationBadgeTone;
  label: string;
  /** Leading status mark for display (emoji / symbol). */
  mark: string;
};

const BADGES: Record<FormAvailabilityStatus, RegistrationBadge> = {
  AVAILABLE: {
    tone: "active",
    mark: "🟢",
    label: "ثبت‌نام فعال",
  },
  NOT_OPEN_YET: {
    tone: "pending",
    mark: "🟡",
    label: "هنوز آغاز نشده",
  },
  CAPACITY_FULL: {
    tone: "full",
    mark: "🔴",
    label: "ظرفیت تکمیل",
  },
  CLOSED_BY_DEADLINE: {
    tone: "closed",
    mark: "⚫",
    label: "پایان ثبت‌نام",
  },
  UNPUBLISHED_OR_PAUSED: {
    tone: "paused",
    mark: "⚫",
    label: "پایان ثبت‌نام",
  },
};

export function getRegistrationBadge(
  status: FormAvailabilityStatus,
): RegistrationBadge {
  return BADGES[status];
}

export const REGISTRATION_BADGE_STYLES: Record<RegistrationBadgeTone, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  pending: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
  full: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  closed: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
  paused: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
};
