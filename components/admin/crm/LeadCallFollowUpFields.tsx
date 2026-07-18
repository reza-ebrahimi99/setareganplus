"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JalaliDatePicker } from "@/components/booking/JalaliDatePicker";
import { PersianTimePicker } from "@/components/datetime/PersianTimePicker";
import {
  formatJalaliDateAscii,
  type JalaliDate,
} from "@/lib/datetime/jalali";

const INCOMPLETE_PAIR_MESSAGE =
  "تاریخ و ساعت پیگیری باید هر دو انتخاب شوند یا هر دو خالی بمانند.";

/**
 * Log-call follow-up inputs for lead detail.
 * Submits ASCII Jalali date + HH:mm to preserve logLeadCallAction contract.
 */
export function LeadCallFollowUpFields() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState<JalaliDate | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [showPairError, setShowPairError] = useState(false);

  const incomplete = Boolean(date) !== Boolean(time);

  const dateAscii = useMemo(
    () => (date ? formatJalaliDateAscii(date.jy, date.jm, date.jd) : ""),
    [date],
  );

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onSubmit = (event: Event) => {
      const dateSelected = Boolean(
        (form.elements.namedItem("followUpDateGate") as HTMLInputElement | null)
          ?.value,
      );
      // Read live incomplete from hidden gates written below.
      const timeSelected = Boolean(
        (form.elements.namedItem("followUpTimeGate") as HTMLInputElement | null)
          ?.value,
      );
      if (dateSelected === timeSelected) return;
      event.preventDefault();
      setShowPairError(true);
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  return (
    <div ref={rootRef} className="space-y-3 sm:col-span-2">
      <input type="hidden" name="followUpDateGate" value={date ? "1" : ""} />
      <input type="hidden" name="followUpTimeGate" value={time ? "1" : ""} />
      <input
        type="hidden"
        name="nextFollowUpDate"
        value={incomplete ? "" : dateAscii}
      />
      <input
        type="hidden"
        name="nextFollowUpTime"
        value={incomplete ? "" : (time ?? "")}
      />

      <JalaliDatePicker
        label="تاریخ پیگیری (شمسی)"
        value={date}
        onChange={(next) => {
          setDate(next);
          setShowPairError(false);
        }}
        onClear={() => {
          setDate(null);
          setShowPairError(false);
        }}
      />
      <PersianTimePicker
        id="lead-call-follow-up-time"
        label="ساعت پیگیری"
        value={time}
        onChange={(next) => {
          setTime(next);
          setShowPairError(false);
        }}
        aria-invalid={showPairError || undefined}
        aria-describedby={
          showPairError
            ? "lead-call-follow-up-pair-error"
            : "lead-call-follow-up-hint"
        }
      />
      {showPairError ? (
        <p
          id="lead-call-follow-up-pair-error"
          role="alert"
          className="text-sm leading-6 text-red-700"
        >
          {INCOMPLETE_PAIR_MESSAGE}
        </p>
      ) : (
        <p id="lead-call-follow-up-hint" className="text-xs leading-6 text-muted">
          {incomplete
            ? INCOMPLETE_PAIR_MESSAGE
            : "اختیاری؛ زمان بر اساس تقویم تهران ذخیره می‌شود."}
        </p>
      )}
    </div>
  );
}
