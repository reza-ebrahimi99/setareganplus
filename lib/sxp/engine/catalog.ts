import { DomainEventType } from "@/generated/prisma/enums";
import { SMS_SENT_EVENT_TYPE } from "@/lib/sxp/constants";

export const SXP_OUTBOX_EVENT_TYPES: DomainEventType[] = [
  DomainEventType.FORM_SUBMISSION_RECEIVED,
  DomainEventType.FORM_DUPLICATE_DETECTED,
  DomainEventType.FORM_LEAD_CREATED,
  DomainEventType.FORM_CAPACITY_REACHED,
  DomainEventType.BOOKING_CREATED,
  DomainEventType.BOOKING_CONFIRMED,
  DomainEventType.BOOKING_CANCELLED,
  DomainEventType.BOOKING_RESCHEDULED,
  DomainEventType.BOOKING_WAITLISTED,
  DomainEventType.BOOKING_CHECKED_IN,
  DomainEventType.BOOKING_COMPLETED,
  DomainEventType.BOOKING_NO_SHOW,
];

const BOOKING_EVENT_TYPES = new Set<string>([
  DomainEventType.BOOKING_CREATED,
  DomainEventType.BOOKING_CONFIRMED,
  DomainEventType.BOOKING_CANCELLED,
  DomainEventType.BOOKING_RESCHEDULED,
  DomainEventType.BOOKING_WAITLISTED,
  DomainEventType.BOOKING_CHECKED_IN,
  DomainEventType.BOOKING_COMPLETED,
  DomainEventType.BOOKING_NO_SHOW,
]);

const ACTIVE_BOOKING_EVENT_TYPES = new Set<string>([
  DomainEventType.BOOKING_CREATED,
  DomainEventType.BOOKING_CONFIRMED,
  DomainEventType.BOOKING_RESCHEDULED,
  DomainEventType.BOOKING_WAITLISTED,
  DomainEventType.BOOKING_CHECKED_IN,
]);

const TIMELINE_TITLES: Record<string, string> = {
  [DomainEventType.BOOKING_CREATED]: "رزرو ثبت شد",
  [DomainEventType.BOOKING_CONFIRMED]: "رزرو تأیید شد",
  [DomainEventType.BOOKING_CANCELLED]: "رزرو لغو شد",
  [DomainEventType.BOOKING_RESCHEDULED]: "رزرو جابه‌جا شد",
  [DomainEventType.BOOKING_WAITLISTED]: "در فهرست انتظار قرار گرفت",
  [DomainEventType.BOOKING_CHECKED_IN]: "حضور ثبت شد",
  [DomainEventType.BOOKING_COMPLETED]: "رزرو انجام شد",
  [DomainEventType.BOOKING_NO_SHOW]: "عدم حضور ثبت شد",
  [DomainEventType.FORM_SUBMISSION_RECEIVED]: "فرم ارسال شد",
  [DomainEventType.FORM_DUPLICATE_DETECTED]: "ارسال تکراری فرم",
  [SMS_SENT_EVENT_TYPE]: "پیامک ارسال شد",
};

/** Higher rank surfaces first on the Home feed. */
const FEED_RANKS: Record<string, number> = {
  [DomainEventType.BOOKING_CANCELLED]: 80,
  [DomainEventType.BOOKING_WAITLISTED]: 70,
  [DomainEventType.BOOKING_CREATED]: 60,
  [DomainEventType.BOOKING_CONFIRMED]: 60,
  [DomainEventType.BOOKING_RESCHEDULED]: 55,
  [DomainEventType.BOOKING_CHECKED_IN]: 40,
  [DomainEventType.BOOKING_COMPLETED]: 30,
  [DomainEventType.BOOKING_NO_SHOW]: 25,
  [DomainEventType.FORM_SUBMISSION_RECEIVED]: 20,
};

export type CatalogSkipReason = "not_personal" | "otp_skipped" | "unknown_type";

export function isBookingEventType(eventType: string): boolean {
  return BOOKING_EVENT_TYPES.has(eventType);
}

export function isActiveBookingEventType(eventType: string): boolean {
  return ACTIVE_BOOKING_EVENT_TYPES.has(eventType);
}

export function isOtpSmsPurpose(purpose: string | null | undefined): boolean {
  if (!purpose) return false;
  return purpose.trim().toLowerCase() === "otp";
}

export function catalogSkipReason(input: {
  eventType: string;
  smsPurpose?: string | null;
}): CatalogSkipReason | null {
  if (input.eventType === SMS_SENT_EVENT_TYPE && isOtpSmsPurpose(input.smsPurpose)) {
    return "otp_skipped";
  }
  if (
    input.eventType === DomainEventType.FORM_LEAD_CREATED ||
    input.eventType === DomainEventType.FORM_CAPACITY_REACHED
  ) {
    return "not_personal";
  }
  if (!TIMELINE_TITLES[input.eventType]) {
    return "unknown_type";
  }
  return null;
}

export function timelineTitleFor(eventType: string): string {
  return TIMELINE_TITLES[eventType] ?? "رویداد";
}

export function isFeedEligibleEventType(eventType: string): boolean {
  return FEED_RANKS[eventType] != null;
}

export function feedRankFor(eventType: string): number {
  return FEED_RANKS[eventType] ?? 0;
}

export function timelineSummaryFor(input: {
  eventType: string;
  trackingCode?: string | null;
  smsPurpose?: string | null;
}): string | null {
  if (input.trackingCode) {
    return `کد پیگیری ${input.trackingCode}`;
  }
  if (input.eventType === SMS_SENT_EVENT_TYPE && input.smsPurpose) {
    return "پیامک اطلاع‌رسانی";
  }
  return null;
}
