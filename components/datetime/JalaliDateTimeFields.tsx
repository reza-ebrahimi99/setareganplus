"use client";

import { useMemo, useState } from "react";
import {
  buildJalaliDateFromParts,
  jalaliMonthLength,
  PERSIAN_MONTHS,
  todayJalaliInTehran,
} from "@/lib/datetime/jalali";
import {
  resolveTehranJalaliParts,
  tehranJalaliPartsToDateTimeLocal,
} from "@/lib/datetime/jalali-form";
import { toPersianDigits } from "@/lib/persian";

export type JalaliDateTimeFieldsProps = {
  id: string;
  /** Hidden input name for form posts (`YYYY-MM-DDTHH:mm` Tehran). */
  name: string;
  /** Tehran wall-time `YYYY-MM-DDTHH:mm`, or an ISO instant string. */
  defaultValueIso?: string | null;
  defaultDate?: Date | null;
  disabled?: boolean;
  hasError?: boolean;
  /** When true, missing time defaults to 00:00 once a date is chosen. */
  timeOptional?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
};

type Draft = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function draftFromDefaults(props: {
  defaultValueIso?: string | null;
  defaultDate?: Date | null;
}): Draft {
  const parts = resolveTehranJalaliParts(props);
  if (!parts) {
    return { year: "", month: "", day: "", hour: "", minute: "" };
  }
  return {
    year: String(parts.jy),
    month: String(parts.jm),
    day: String(parts.jd),
    hour: pad2(parts.hour),
    minute: pad2(parts.minute),
  };
}

function clampDay(year: string, month: string, day: string): string {
  if (!year || !month || !day) return day;
  const jy = Number(year);
  const jm = Number(month);
  const jd = Number(day);
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
    return day;
  }
  const maxDay = jalaliMonthLength(jy, jm);
  return jd > maxDay ? String(maxDay) : day;
}

function composeHiddenValue(
  draft: Draft,
  timeOptional: boolean,
): string {
  const date = buildJalaliDateFromParts(draft.year, draft.month, draft.day);
  if (!date) {
    return "";
  }

  let hour = draft.hour;
  let minute = draft.minute;
  if (timeOptional && (!hour || !minute)) {
    hour = "00";
    minute = "00";
  }
  if (!hour || !minute) {
    return "";
  }

  const h = Number(hour);
  const m = Number(minute);
  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return "";
  }

  return tehranJalaliPartsToDateTimeLocal(date.jy, date.jm, date.jd, h, m);
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

function selectClass(hasError: boolean): string {
  const base =
    "min-h-11 w-full rounded-xl border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60";
  return hasError ? `${base} border-red-400` : `${base} border-border`;
}

/**
 * Compact admin Date+Time field (three Jalali selects + hour/minute).
 * Writes a hidden `YYYY-MM-DDTHH:mm` Tehran value for parseTehranDateTimeLocal.
 */
export function JalaliDateTimeFields({
  id,
  name,
  defaultValueIso = null,
  defaultDate = null,
  disabled = false,
  hasError = false,
  timeOptional = false,
  className = "",
  minYear,
  maxYear,
}: JalaliDateTimeFieldsProps) {
  const today = todayJalaliInTehran();
  const resolvedMaxYear = maxYear ?? today.jy + 5;
  const resolvedMinYear = minYear ?? today.jy - 5;

  const initial = draftFromDefaults({ defaultValueIso, defaultDate });
  const [draft, setDraft] = useState(initial);
  const [syncedKey, setSyncedKey] = useState(
    `${defaultValueIso ?? ""}|${defaultDate?.getTime() ?? ""}`,
  );
  const syncKey = `${defaultValueIso ?? ""}|${defaultDate?.getTime() ?? ""}`;
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setDraft(draftFromDefaults({ defaultValueIso, defaultDate }));
  }

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = resolvedMaxYear; y >= resolvedMinYear; y -= 1) {
      list.push(y);
    }
    return list;
  }, [resolvedMaxYear, resolvedMinYear]);

  const dayCount = useMemo(() => {
    if (!draft.year || !draft.month) return 31;
    return jalaliMonthLength(Number(draft.year), Number(draft.month));
  }, [draft.year, draft.month]);

  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => index + 1),
    [dayCount],
  );

  const minuteOptions = useMemo(() => {
    const set = new Set(MINUTES);
    if (draft.minute !== "") {
      set.add(Number(draft.minute));
    }
    return [...set].sort((a, b) => a - b);
  }, [draft.minute]);

  const hiddenValue = composeHiddenValue(draft, timeOptional);

  function update(partial: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      next.day = clampDay(next.year, next.month, next.day);
      return next;
    });
  }

  function clearAll() {
    setDraft({ year: "", month: "", day: "", hour: "", minute: "" });
  }

  const controlClass = selectClass(hasError);

  return (
    <div className={`mt-1.5 space-y-2 ${className}`} dir="rtl">
      <input type="hidden" name={name} value={hiddenValue} />

      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="تاریخ شمسی"
      >
        <div className="min-w-0">
          <label htmlFor={`${id}-day`} className="mb-1 block text-xs text-muted">
            روز
          </label>
          <select
            id={`${id}-day`}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={controlClass}
            value={draft.day}
            onChange={(e) => update({ day: e.target.value })}
          >
            <option value="">روز</option>
            {days.map((day) => (
              <option key={day} value={String(day)}>
                {toPersianDigits(day)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor={`${id}-month`}
            className="mb-1 block text-xs text-muted"
          >
            ماه
          </label>
          <select
            id={`${id}-month`}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={controlClass}
            value={draft.month}
            onChange={(e) => update({ month: e.target.value })}
          >
            <option value="">ماه</option>
            {PERSIAN_MONTHS.map((monthName, index) => (
              <option key={monthName} value={String(index + 1)}>
                {monthName}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor={id} className="mb-1 block text-xs text-muted">
            سال
          </label>
          <select
            id={id}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={controlClass}
            value={draft.year}
            onChange={(e) => update({ year: e.target.value })}
          >
            <option value="">سال</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {toPersianDigits(year)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-2"
        role="group"
        aria-label="ساعت"
      >
        <div className="min-w-0">
          <label
            htmlFor={`${id}-hour`}
            className="mb-1 block text-xs text-muted"
          >
            ساعت
          </label>
          <select
            id={`${id}-hour`}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={controlClass}
            value={draft.hour}
            onChange={(e) => update({ hour: e.target.value })}
          >
            <option value="">—</option>
            {HOURS.map((hour) => (
              <option key={hour} value={pad2(hour)}>
                {toPersianDigits(pad2(hour))}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label
            htmlFor={`${id}-minute`}
            className="mb-1 block text-xs text-muted"
          >
            دقیقه
          </label>
          <select
            id={`${id}-minute`}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            className={controlClass}
            value={draft.minute}
            onChange={(e) => update({ minute: e.target.value })}
          >
            <option value="">—</option>
            {minuteOptions.map((minute) => (
              <option key={minute} value={pad2(minute)}>
                {toPersianDigits(pad2(minute))}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hiddenValue || draft.year || draft.month || draft.day ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hiddenValue ? (
            <p className="text-xs text-muted" dir="ltr">
              {toPersianDigits(
                `${draft.year}/${pad2(Number(draft.month) || 0)}/${pad2(Number(draft.day) || 0)} ${draft.hour || "00"}:${draft.minute || "00"}`,
              )}
            </p>
          ) : (
            <p className="text-xs text-muted">تاریخ و ساعت را کامل کنید</p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={clearAll}
            className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-background disabled:opacity-50"
          >
            پاک کردن
          </button>
        </div>
      ) : null}
    </div>
  );
}
