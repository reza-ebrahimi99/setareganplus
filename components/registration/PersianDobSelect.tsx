"use client";

import {
  jalaliMonthLength,
  PERSIAN_MONTHS,
  type JalaliDate,
} from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import {
  RegistrationField,
  registrationControlClass,
} from "@/components/registration/Field";

type PersianDobSelectProps = {
  value: JalaliDate | null;
  onChange: (value: JalaliDate | null) => void;
  error?: string;
  minYear?: number;
  maxYear?: number;
};

export function PersianDobSelect({
  value,
  onChange,
  error,
  minYear = 1370,
  maxYear = 1405,
}: PersianDobSelectProps) {
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y -= 1) years.push(y);

  const jy = value?.jy ?? "";
  const jm = value?.jm ?? "";
  const jd = value?.jd ?? "";
  const dayCount =
    typeof jy === "number" && typeof jm === "number"
      ? jalaliMonthLength(jy, jm)
      : 31;

  function patch(next: Partial<JalaliDate>) {
    const merged = {
      jy: typeof next.jy === "number" ? next.jy : value?.jy,
      jm: typeof next.jm === "number" ? next.jm : value?.jm,
      jd: typeof next.jd === "number" ? next.jd : value?.jd,
    };
    if (
      typeof merged.jy === "number" &&
      typeof merged.jm === "number" &&
      typeof merged.jd === "number"
    ) {
      const maxDay = jalaliMonthLength(merged.jy, merged.jm);
      onChange({
        jy: merged.jy,
        jm: merged.jm,
        jd: Math.min(merged.jd, maxDay),
      });
      return;
    }
    onChange(null);
  }

  return (
    <RegistrationField
      id="birthDate"
      label="تاریخ تولد"
      required
      error={error}
      hint="روز / ماه / سال شمسی"
    >
      <div className="grid grid-cols-3 gap-2">
        <select
          id="birth-day"
          aria-label="روز تولد"
          className={registrationControlClass(Boolean(error))}
          value={jd}
          onChange={(e) =>
            patch({
              jd: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">روز</option>
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {toPersianDigits(String(day))}
            </option>
          ))}
        </select>
        <select
          id="birth-month"
          aria-label="ماه تولد"
          className={registrationControlClass(Boolean(error))}
          value={jm}
          onChange={(e) =>
            patch({
              jm: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">ماه</option>
          {PERSIAN_MONTHS.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
        <select
          id="birth-year"
          aria-label="سال تولد"
          className={registrationControlClass(Boolean(error))}
          value={jy}
          onChange={(e) =>
            patch({
              jy: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        >
          <option value="">سال</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {toPersianDigits(String(year))}
            </option>
          ))}
        </select>
      </div>
    </RegistrationField>
  );
}
