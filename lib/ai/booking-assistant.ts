/**
 * Advisory booking AI helpers + deterministic fallbacks.
 * Never mutates DB. Never auto-rejects bookings.
 */

import { getAiProvider } from "@/lib/ai/ai-provider";
import type { ProposedScheduleDraft } from "@/lib/ai/types";
import {
  buildPersianRecommendationMessage,
  recommendSlots,
  type SlotSuggestion,
} from "@/lib/booking/recommendations";
import { parseLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { PERSIAN_WEEKDAYS } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export async function suggestBookingTimes(params: {
  organizationId: string;
  serviceId: string;
  advisorId?: string | null;
}): Promise<{ suggestions: SlotSuggestion[]; message: string; source: "rules" | "ai" }> {
  const suggestions = await recommendSlots(params);
  const fallback = buildPersianRecommendationMessage(suggestions);

  const provider = getAiProvider();
  if (!provider.isEnabled() || suggestions.length === 0) {
    return { suggestions, message: fallback, source: "rules" };
  }

  const ai = await provider.complete({
    feature: "booking_recommendations",
    locale: "fa",
    context: {
      // Non-sensitive only
      suggestions: suggestions.map((s) => ({
        label: s.label,
        advisorName: s.advisorName,
        remaining: s.remaining,
        reason: s.reason,
      })),
    },
  });

  if (!ai.ok) {
    return { suggestions, message: fallback, source: "rules" };
  }

  return { suggestions, message: ai.text, source: "ai" };
}

export type AnomalyHint = {
  level: "low" | "medium" | "high";
  code: string;
  message: string;
};

/**
 * Rule-based anomaly hints. AI may rephrase for admins only.
 */
export function detectBookingAnomalies(input: {
  submissionDurationMs?: number | null;
  recentReservationsSameMobile?: number;
  recentCancellationsSameMobile?: number;
  gradeHintConflict?: boolean;
}): AnomalyHint[] {
  const hints: AnomalyHint[] = [];

  if (input.submissionDurationMs != null && input.submissionDurationMs < 1500) {
    hints.push({
      level: "medium",
      code: "FAST_SUBMIT",
      message: "ثبت بسیار سریع — بررسی دستی پیشنهاد می‌شود.",
    });
  }

  if ((input.recentReservationsSameMobile ?? 0) >= 3) {
    hints.push({
      level: "high",
      code: "MOBILE_BURST",
      message: "رزروهای پرتکرار از یک موبایل در بازه کوتاه.",
    });
  }

  if ((input.recentCancellationsSameMobile ?? 0) >= 2) {
    hints.push({
      level: "medium",
      code: "CANCEL_PATTERN",
      message: "الگوی لغو مکرر برای این موبایل.",
    });
  }

  if (input.gradeHintConflict) {
    hints.push({
      level: "low",
      code: "GRADE_HINT",
      message: "ناسازگاری احتمالی پایه/سن (فقط راهنما).",
    });
  }

  return hints;
}

export async function buildAdminDailySummary(params: {
  todayReservations: number;
  remainingCapacity: number | null;
  cancellations: number;
  waitingList: number;
  needsFollowUp: number;
  busyHours: string[];
}): Promise<{ text: string; source: "rules" | "ai" }> {
  const lines = [
    `خلاصه رزرو امروز: ${toPersianDigits(params.todayReservations)} رزرو`,
    params.remainingCapacity == null
      ? "ظرفیت باقی‌مانده: نامحدود/نامشخص"
      : `ظرفیت باقی‌مانده تقریبی: ${toPersianDigits(params.remainingCapacity)}`,
    `لغوها: ${toPersianDigits(params.cancellations)}`,
    `لیست انتظار: ${toPersianDigits(params.waitingList)}`,
    `نیازمند پیگیری: ${toPersianDigits(params.needsFollowUp)}`,
    params.busyHours.length
      ? `ساعات پرتراکم: ${params.busyHours.join("، ")}`
      : "ساعت پرتراکم مشخصی ثبت نشده است.",
    "پیشنهاد: در صورت تکمیل ظرفیت، بازه جدید باز کنید.",
  ];
  const fallback = lines.join("\n");

  const provider = getAiProvider();
  if (!provider.isEnabled()) {
    return { text: fallback, source: "rules" };
  }

  const ai = await provider.complete({
    feature: "admin_daily_summary",
    locale: "fa",
    context: { ...params },
  });

  if (!ai.ok) {
    return { text: fallback, source: "rules" };
  }
  return { text: ai.text, source: "ai" };
}

/**
 * Validate AI/NL proposed schedule before any admin save.
 */
export function validateProposedSchedule(
  draft: unknown,
): { ok: true; draft: ProposedScheduleDraft } | { ok: false; error: string } {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return { ok: false, error: "ساختار برنامه پیشنهادی نامعتبر است." };
  }
  const record = draft as Record<string, unknown>;
  if (!Array.isArray(record.blocks) || record.blocks.length === 0) {
    return { ok: false, error: "حداقل یک بازه کاری لازم است." };
  }

  const blocks: ProposedScheduleDraft["blocks"] = [];
  for (const block of record.blocks) {
    if (!block || typeof block !== "object") {
      return { ok: false, error: "یکی از بازه‌ها نامعتبر است." };
    }
    const b = block as Record<string, unknown>;
    if (!Array.isArray(b.weekdays) || b.weekdays.length === 0) {
      return { ok: false, error: "روزهای هفته برای بازه مشخص نیست." };
    }
    const weekdays = b.weekdays.filter(
      (d): d is number => typeof d === "number" && d >= 0 && d <= 6,
    );
    if (weekdays.length === 0) {
      return { ok: false, error: "روز هفته نامعتبر است." };
    }
    if (typeof b.startLocalTime !== "string" || !parseLocalTimeHm(b.startLocalTime)) {
      return { ok: false, error: "ساعت شروع نامعتبر است." };
    }
    if (typeof b.endLocalTime !== "string" || !parseLocalTimeHm(b.endLocalTime)) {
      return { ok: false, error: "ساعت پایان نامعتبر است." };
    }
    const duration =
      typeof b.durationMinutes === "number" ? b.durationMinutes : Number(b.durationMinutes);
    const capacity =
      typeof b.slotCapacity === "number" ? b.slotCapacity : Number(b.slotCapacity);
    if (!Number.isInteger(duration) || duration < 5 || duration > 240) {
      return { ok: false, error: "مدت نوبت باید بین ۵ تا ۲۴۰ دقیقه باشد." };
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      return { ok: false, error: "ظرفیت هر نوبت نامعتبر است." };
    }
    blocks.push({
      weekdays,
      startLocalTime: b.startLocalTime,
      endLocalTime: b.endLocalTime,
      durationMinutes: duration,
      slotCapacity: capacity,
    });
  }

  const closedWeekdays = Array.isArray(record.closedWeekdays)
    ? record.closedWeekdays.filter(
        (d): d is number => typeof d === "number" && d >= 0 && d <= 6,
      )
    : [];

  return {
    ok: true,
    draft: {
      blocks,
      closedWeekdays,
      notes: Array.isArray(record.notes)
        ? record.notes.filter((n): n is string => typeof n === "string")
        : [],
    },
  };
}

/**
 * Deterministic NL → schedule draft for common Persian patterns.
 * AI may refine later; this always works offline.
 */
export function parsePersianScheduleHint(text: string): ProposedScheduleDraft | null {
  const raw = text.trim();
  if (!raw) return null;

  const durationMatch = raw.match(/هر\s*نوبت\s*(\d+|[\d۰-۹]+)\s*دقیقه/);
  const capacityMatch = raw.match(/ظرفیت[^\d۰-۹]*(\d+|[\d۰-۹]+)/);
  const timeMatch = raw.match(
    /از\s*ساعت\s*(\d{1,2}|[\d۰-۹]{1,2})\s*تا\s*(\d{1,2}|[\d۰-۹]{1,2})/,
  );

  const toLatin = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const durationMinutes = durationMatch
    ? Number(toLatin(durationMatch[1]))
    : 30;
  const slotCapacity = capacityMatch ? Number(toLatin(capacityMatch[1])) : 1;
  const startH = timeMatch ? Number(toLatin(timeMatch[1])) : 9;
  const endH = timeMatch ? Number(toLatin(timeMatch[2])) : 14;

  if (
    !Number.isFinite(durationMinutes) ||
    !Number.isFinite(slotCapacity) ||
    !Number.isFinite(startH) ||
    !Number.isFinite(endH)
  ) {
    return null;
  }

  // Default Sat–Wed if "شنبه تا چهارشنبه"
  let weekdays = [0, 1, 2, 3, 4];
  if (raw.includes("شنبه تا چهارشنبه")) {
    weekdays = [0, 1, 2, 3, 4];
  }

  const closedWeekdays: number[] = [];
  if (raw.includes("پنجشنبه تعطیل") || raw.includes("پنج‌شنبه تعطیل")) {
    closedWeekdays.push(5);
  }
  if (raw.includes("جمعه")) {
    closedWeekdays.push(6);
  }

  const draft: ProposedScheduleDraft = {
    blocks: [
      {
        weekdays,
        startLocalTime: `${String(startH).padStart(2, "0")}:00`,
        endLocalTime: `${String(endH).padStart(2, "0")}:00`,
        durationMinutes,
        slotCapacity,
      },
    ],
    closedWeekdays,
    notes: [
      `روزهای فعال: ${weekdays.map((d) => PERSIAN_WEEKDAYS[d]).join("، ")}`,
    ],
  };

  const validated = validateProposedSchedule(draft);
  return validated.ok ? validated.draft : null;
}
