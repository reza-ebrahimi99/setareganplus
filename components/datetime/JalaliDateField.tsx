"use client";

import { useMemo, useState } from "react";
import {
  buildJalaliDateFromParts,
  jalaliMonthLength,
  PERSIAN_MONTHS,
  todayJalaliInTehran,
} from "@/lib/datetime/jalali";
import {
  gregorianDateOnlyToJalaliParts,
  jalaliPartsToGregorianDateOnly,
} from "@/lib/datetime/jalali-form";
import { toPersianDigits } from "@/lib/persian";

export type JalaliDateFieldProps = {
  id: string;
  /** Hidden input name; value is Gregorian date-only `YYYY-MM-DD`. */
  name: string;
  /** Gregorian `YYYY-MM-DD` (ASCII), matching FormFieldType.DATE validation. */
  defaultValue?: string | null;
  disabled?: boolean;
  hasError?: boolean;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
  "aria-describedby"?: string;
};

type Draft = {
  year: string;
  month: string;
  day: string;
};

function draftFromDefault(defaultValue?: string | null): Draft {
  if (!defaultValue?.trim()) {
    return { year: "", month: "", day: "" };
  }
  const parts = gregorianDateOnlyToJalaliParts(defaultValue);
  if (!parts) {
    return { year: "", month: "", day: "" };
  }
  return {
    year: String(parts.jy),
    month: String(parts.jm),
    day: String(parts.jd),
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

function composeHiddenValue(draft: Draft): string {
  const date = buildJalaliDateFromParts(draft.year, draft.month, draft.day);
  if (!date) return "";
  return jalaliPartsToGregorianDateOnly(date.jy, date.jm, date.jd);
}

function selectClass(hasError: boolean): string {
  const base =
    "min-h-11 w-full rounded-xl border bg-white px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60";
  return hasError ? `${base} border-red-400` : `${base} border-border`;
}

/**
 * Date-only Jalali selects for public forms and admin filters.
 * Hidden value is Gregorian `YYYY-MM-DD` (ASCII) for server DATE validation.
 */
export function JalaliDateField({
  id,
  name,
  defaultValue = null,
  disabled = false,
  hasError = false,
  required = false,
  className = "",
  minYear,
  maxYear,
  "aria-describedby": ariaDescribedBy,
}: JalaliDateFieldProps) {  const today = todayJalaliInTehran();
  const resolvedMaxYear = maxYear ?? today.jy + 10;
  const resolvedMinYear = minYear ?? today.jy - 100;

  const initial = draftFromDefault(defaultValue);
  const [draft, setDraft] = useState(initial);
  const [syncedDefault, setSyncedDefault] = useState(defaultValue ?? "");
  const nextDefault = defaultValue ?? "";
  if (nextDefault !== syncedDefault) {
    setSyncedDefault(nextDefault);
    setDraft(draftFromDefault(defaultValue));
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

  const hiddenValue = composeHiddenValue(draft);
  const controlClass = selectClass(hasError);

  function update(partial: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      next.day = clampDay(next.year, next.month, next.day);
      return next;
    });
  }

  function clearAll() {
    setDraft({ year: "", month: "", day: "" });
  }

  return (
    <div className={`mt-1.5 space-y-2 ${className}`} dir="rtl">
      <input type="hidden" name={name} value={hiddenValue} />

      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="تاریخ شمسی"
        aria-describedby={ariaDescribedBy}
        aria-required={required || undefined}
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

      {draft.year || draft.month || draft.day ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hiddenValue ? (
            <p className="text-xs text-muted">
              {toPersianDigits(
                `${draft.year}/${String(Number(draft.month) || 0).padStart(2, "0")}/${String(Number(draft.day) || 0).padStart(2, "0")}`,
              )}
            </p>
          ) : (
            <p className="text-xs text-muted">تاریخ را کامل کنید</p>
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
