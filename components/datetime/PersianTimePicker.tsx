"use client";

import { useId, useMemo, useState } from "react";
import { parseLocalTimeHm } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_STEP = 5;
const BASE_MINUTES = Array.from(
  { length: Math.floor(60 / MINUTE_STEP) },
  (_, index) => index * MINUTE_STEP,
);

export type PersianTimePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  label?: string;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toCanonicalHm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function draftsFromValue(value: string | null): { hour: string; minute: string } {
  if (!value) return { hour: "", minute: "" };
  const parsed = parseLocalTimeHm(value);
  if (!parsed) return { hour: "", minute: "" };
  return { hour: pad2(parsed.hour), minute: pad2(parsed.minute) };
}

/**
 * Controlled Persian-friendly 24h time picker.
 * Canonical value is always ASCII `HH:mm` (or null). Persian digits are display-only.
 */
export function PersianTimePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  id,
  label = "ساعت",
  className = "",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: PersianTimePickerProps) {
  const autoId = useId();
  const hourId = `${id ?? autoId}-hour`;
  const minuteId = `${id ?? autoId}-minute`;

  const initialDrafts = draftsFromValue(value);
  const [hourDraft, setHourDraft] = useState(initialDrafts.hour);
  const [minuteDraft, setMinuteDraft] = useState(initialDrafts.minute);
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    const next = draftsFromValue(value);
    setSyncedValue(value);
    setHourDraft(next.hour);
    setMinuteDraft(next.minute);
  }

  const minuteOptions = useMemo(() => {
    const minutes = new Set(BASE_MINUTES);
    if (minuteDraft !== "") {
      minutes.add(Number(minuteDraft));
    }
    return [...minutes].sort((a, b) => a - b);
  }, [minuteDraft]);

  function commit(nextHour: string, nextMinute: string) {
    setHourDraft(nextHour);
    setMinuteDraft(nextMinute);
    if (!nextHour || !nextMinute) {
      onChange(null);
      return;
    }
    const hour = Number(nextHour);
    const minute = Number(nextMinute);
    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      onChange(null);
      return;
    }
    onChange(toCanonicalHm(hour, minute));
  }

  const selectClassName =
    "min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={className} dir="rtl">
      <p className="mb-1.5 text-sm font-medium text-primary">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={hourId} className="mb-1 block text-xs text-muted">
            ساعت
          </label>
          <select
            id={hourId}
            dir="rtl"
            disabled={disabled}
            required={required}
            value={hourDraft}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className={selectClassName}
            onChange={(event) => commit(event.target.value, minuteDraft)}
          >
            <option value="">—</option>
            {HOURS.map((hour) => (
              <option key={hour} value={pad2(hour)}>
                {toPersianDigits(pad2(hour))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={minuteId} className="mb-1 block text-xs text-muted">
            دقیقه
          </label>
          <select
            id={minuteId}
            dir="rtl"
            disabled={disabled}
            required={required}
            value={minuteDraft}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className={selectClassName}
            onChange={(event) => commit(hourDraft, event.target.value)}
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
      {value ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">{toPersianDigits(value)}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setHourDraft("");
              setMinuteDraft("");
              onChange(null);
            }}
            className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-background disabled:opacity-50"
          >
            پاک کردن ساعت
          </button>
        </div>
      ) : null}
    </div>
  );
}
