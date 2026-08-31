/**
 * First counseling session experience — copy + pure helpers.
 * Booking itself stays in lib/guidance/journey/booking + createReservation.
 */

import { toPersianDigits } from "@/lib/persian";
import { INTEREST_CONSULTATION } from "@/lib/guidance/office/interest-report";

export const FIRST_SESSION_DURATION = INTEREST_CONSULTATION.duration;
export const FIRST_SESSION_FORMATS = INTEREST_CONSULTATION.formats;
export const FIRST_SESSION_BOOK_HREF = "/book/guidance-first-session";

export const FIRST_SESSION_WHY = {
  title: "چرا جلسه اول مهم است",
  lead: "این اولین جلسهٔ استراتژیک مسیر انتخاب رشته است — نه یک نوبت اداری. پرونده از روی کاغذ به میز مهندس رضا ابراهیمی می‌رسد.",
  items: INTEREST_CONSULTATION.items,
} as const;

export const FIRST_SESSION_PREPARE = [
  "سؤال‌های خودتان را بنویسید؛ جلسه با سؤال خالی می‌ماند.",
  "اگر آزمون رغبت را تمام کرده‌اید، نتیجه را مرور کنید — تفسیر نهایی در جلسه است.",
  "شهر، هزینه و خط قرمز خانواده را از قبل با هم حرف بزنید.",
  "رتبه اگر آمده، کارنامه سنجش را در دسترس بگذارید؛ اگر نیامده، با همان سوابق جلو می‌رویم.",
] as const;

export const FIRST_SESSION_DOCUMENTS = [
  { label: "کارنامه نهایی دبیرستان", hint: "اگر بارگذاری شده، همان نسخه کافی است." },
  { label: "نتیجه آزمون رغبت", hint: "خروجی دفتر؛ تفسیر با مهندس است." },
  { label: "اطلاعات سهمیه و سوابق", hint: "همان چیزی که در شناسنامه پرونده ثبت شده." },
  { label: "کارنامه یا تراز سنجش", hint: "فقط اگر اعلام شده؛ جعل عدد نکنید." },
] as const;

export const FIRST_SESSION_PARENTS = [
  "حضور خانواده مفید است؛ تصمیم را از دانش‌آموز جدا نکنید.",
  "جلسه قول قبولی نمی‌دهد. کار، رتبه و ظرفیت روی میز می‌آید.",
  "۹۰ دقیقه برای فهمیدن مسیر است، نه برای بستن فهرست ۱۵۰ در یک نشست.",
] as const;

export type SessionCountdown = {
  upcoming: boolean;
  past: boolean;
  label: string;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function deriveSessionCountdown(
  startsAtIso: string,
  now: Date = new Date(),
): SessionCountdown {
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { upcoming: false, past: false, label: "زمان جلسه مشخص نیست" };
  }
  const delta = startsAt.getTime() - now.getTime();
  if (delta <= 0) {
    return { upcoming: false, past: true, label: "زمان جلسه گذشته است" };
  }
  const days = Math.floor(delta / DAY_MS);
  const hours = Math.floor((delta % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((delta % HOUR_MS) / MINUTE_MS);
  const parts: string[] = [];
  if (days > 0) parts.push(`${toPersianDigits(days)} روز`);
  if (hours > 0) parts.push(`${toPersianDigits(hours)} ساعت`);
  if (days === 0 && minutes > 0) parts.push(`${toPersianDigits(minutes)} دقیقه`);
  if (parts.length === 0) parts.push("کمتر از یک دقیقه");
  return {
    upcoming: true,
    past: false,
    label: `${parts.join(" و ")} تا جلسه`,
  };
}

function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildFirstSessionIcs(input: {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
  location: string;
}): string {
  const stamp = icsUtc(new Date(input.startsAt));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SetareganPlus//Guidance First Session//FA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(input.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUtc(input.startsAt)}`,
    `DTEND:${icsUtc(input.endsAt)}`,
    `SUMMARY:${icsEscape(input.summary)}`,
    `DESCRIPTION:${icsEscape(input.description)}`,
    `LOCATION:${icsEscape(input.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  return lines.join("\r\n");
}

export function firstSessionIcsDescription(): string {
  return [
    "جلسه اول مشاوره انتخاب رشته — مهندس رضا ابراهیمی",
    "مدت: ۹۰ دقیقه",
    "مدارک: کارنامه نهایی، نتیجه آزمون رغبت، سهمیه و سوابق، کارنامه سنجش اگر اعلام شده.",
  ].join("\n");
}
