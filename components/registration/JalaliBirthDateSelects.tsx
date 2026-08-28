"use client";

import { useMemo } from "react";
import { registrationControlClass } from "@/components/registration/Field";
import {
  jalaliMonthLength,
  PERSIAN_MONTHS,
  todayJalaliInTehran,
} from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export type JalaliBirthDateParts = {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
};

type JalaliBirthDateSelectsProps = {
  id?: string;
  value: JalaliBirthDateParts;
  onChange: (value: JalaliBirthDateParts) => void;
  hasError?: boolean;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
};

function clampDay(year: string, month: string, day: string): string {
  if (!year || !month || !day) {
    return day;
  }
  const jy = Number(year);
  const jm = Number(month);
  const jd = Number(day);
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) {
    return day;
  }
  const maxDay = jalaliMonthLength(jy, jm);
  if (jd > maxDay) {
    return String(maxDay);
  }
  return day;
}

export function JalaliBirthDateSelects({
  id = "birthDate",
  value,
  onChange,
  hasError = false,
  disabled = false,
  minYear,
  maxYear,
}: JalaliBirthDateSelectsProps) {
  const today = todayJalaliInTehran();
  const resolvedMaxYear = maxYear ?? today.jy;
  const resolvedMinYear = minYear ?? resolvedMaxYear - 80;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = resolvedMaxYear; y >= resolvedMinYear; y -= 1) {
      list.push(y);
    }
    return list;
  }, [resolvedMaxYear, resolvedMinYear]);

  const dayCount = useMemo(() => {
    if (!value.birthYear || !value.birthMonth) {
      return 31;
    }
    return jalaliMonthLength(Number(value.birthYear), Number(value.birthMonth));
  }, [value.birthYear, value.birthMonth]);

  const days = useMemo(() => {
    return Array.from({ length: dayCount }, (_, index) => index + 1);
  }, [dayCount]);

  const controlClass = registrationControlClass(hasError);

  function emit(next: JalaliBirthDateParts) {
    const birthDay = clampDay(next.birthYear, next.birthMonth, next.birthDay);
    onChange({ ...next, birthDay });
  }

  return (
    <div
      className="grid grid-cols-3 gap-2"
      dir="rtl"
      role="group"
      aria-label="تاریخ تولد شمسی"
    >
      <div className="min-w-0">
        <label htmlFor={`${id}-day`} className="mb-1 block text-xs text-muted">
          روز
        </label>
        <select
          id={`${id}-day`}
          className={controlClass}
          value={value.birthDay}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onChange={(e) =>
            emit({ ...value, birthDay: e.target.value })
          }
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
        <label htmlFor={`${id}-month`} className="mb-1 block text-xs text-muted">
          ماه
        </label>
        <select
          id={`${id}-month`}
          className={controlClass}
          value={value.birthMonth}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onChange={(e) =>
            emit({ ...value, birthMonth: e.target.value })
          }
        >
          <option value="">ماه</option>
          {PERSIAN_MONTHS.map((name, index) => (
            <option key={name} value={String(index + 1)}>
              {name}
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
          className={controlClass}
          value={value.birthYear}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onChange={(e) =>
            emit({ ...value, birthYear: e.target.value })
          }
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
  );
}
