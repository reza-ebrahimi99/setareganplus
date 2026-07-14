"use client";

import { useMemo, useState } from "react";
import {
  formatJalaliDate,
  jalaliMonthLength,
  jalaliTehranLocalToUtc,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  todayJalaliInTehran,
  type JalaliDate,
} from "@/lib/datetime/jalali";
import { getPersianWeekdayIndex } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

type JalaliDatePickerProps = {
  value: JalaliDate | null;
  onChange: (value: JalaliDate) => void;
  min?: JalaliDate;
  max?: JalaliDate;
  label?: string;
};

function compare(a: JalaliDate, b: JalaliDate): number {
  if (a.jy !== b.jy) return a.jy - b.jy;
  if (a.jm !== b.jm) return a.jm - b.jm;
  return a.jd - b.jd;
}

export function JalaliDatePicker({
  value,
  onChange,
  min,
  max,
  label = "انتخاب تاریخ",
}: JalaliDatePickerProps) {
  const today = todayJalaliInTehran();
  const [cursor, setCursor] = useState<JalaliDate>(value ?? today);

  const cells = useMemo(() => {
    const length = jalaliMonthLength(cursor.jy, cursor.jm);
    const first = jalaliTehranLocalToUtc(cursor.jy, cursor.jm, 1, 12, 0);
    const offset = getPersianWeekdayIndex(first);
    const items: Array<JalaliDate | null> = [];
    for (let i = 0; i < offset; i += 1) items.push(null);
    for (let d = 1; d <= length; d += 1) {
      items.push({ jy: cursor.jy, jm: cursor.jm, jd: d });
    }
    return items;
  }, [cursor.jy, cursor.jm]);

  function shiftMonth(delta: number) {
    let jy = cursor.jy;
    let jm = cursor.jm + delta;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    } else if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setCursor({ jy, jm, jd: 1 });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4" dir="rtl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          onClick={() => shiftMonth(1)}
          aria-label="ماه بعد"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs text-muted">{label}</p>
          <p className="text-sm font-semibold text-primary">
            {PERSIAN_MONTHS[cursor.jm - 1]} {toPersianDigits(cursor.jy)}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          onClick={() => shiftMonth(-1)}
          aria-label="ماه قبل"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {PERSIAN_WEEKDAYS.map((day) => (
          <div key={day} className="py-1 font-medium">
            {day.slice(0, 1)}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`e-${index}`} />;
          }
          const selected =
            value &&
            value.jy === day.jy &&
            value.jm === day.jm &&
            value.jd === day.jd;
          const disabled =
            (min != null && compare(day, min) < 0) ||
            (max != null && compare(day, max) > 0);

          return (
            <button
              key={`${day.jy}-${day.jm}-${day.jd}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(day)}
              className={`rounded-xl py-2 text-sm transition-colors ${
                selected
                  ? "bg-primary text-white"
                  : disabled
                    ? "cursor-not-allowed text-slate-300"
                    : "text-foreground hover:bg-secondary/15"
              }`}
              aria-label={formatJalaliDate(day.jy, day.jm, day.jd)}
            >
              {toPersianDigits(day.jd)}
            </button>
          );
        })}
      </div>

      {value ? (
        <p className="mt-3 text-center text-xs text-muted">
          انتخاب‌شده: {formatJalaliDate(value.jy, value.jm, value.jd)}
        </p>
      ) : null}
    </div>
  );
}
