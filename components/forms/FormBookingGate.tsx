"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormBookingSettings } from "@/lib/booking/form-booking-settings";

type FormBookingGateProps = {
  formSlug: string;
  settings: FormBookingSettings;
  serviceSlug: string | null;
  serviceTitle: string | null;
};

/**
 * before_submit: requires opaque booking proof in a hidden field.
 * after_submit / optional: informational only (redirect handled after submit).
 */
export function FormBookingGate({
  formSlug,
  settings,
  serviceSlug,
  serviceTitle,
}: FormBookingGateProps) {
  const searchParams = useSearchParams();
  const [proof, setProof] = useState("");

  useEffect(() => {
    const fromQuery = searchParams.get("bookingProof")?.trim() ?? "";
    if (fromQuery) {
      setProof(fromQuery);
      try {
        sessionStorage.setItem(`bookingProof:${formSlug}`, fromQuery);
      } catch {
        // ignore
      }
      return;
    }
    try {
      const stored = sessionStorage.getItem(`bookingProof:${formSlug}`) ?? "";
      if (stored) setProof(stored);
    } catch {
      // ignore
    }
  }, [formSlug, searchParams]);

  if (!settings.enabled || !serviceSlug) {
    return null;
  }

  const bookHref = `/book/${serviceSlug}?returnTo=${encodeURIComponent(`/forms/${formSlug}`)}&form=${encodeURIComponent(formSlug)}`;

  if (settings.requireTiming === "after_submit") {
    return (
      <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm leading-7 text-primary">
        پس از ثبت فرم می‌توانید نوبت «{serviceTitle ?? "خدمت"}» را رزرو کنید.
      </div>
    );
  }

  if (settings.requireTiming === "optional") {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm leading-7">
        <p>
          رزرو نوبت «{serviceTitle ?? "خدمت"}» اختیاری است.
        </p>
        <Link href={bookHref} className="text-primary underline-offset-2 hover:underline">
          رزرو نوبت (اختیاری)
        </Link>
        {proof ? (
          <input type="hidden" name="bookingProof" value={proof} />
        ) : null}
      </div>
    );
  }

  // before_submit
  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
      <p className="font-medium">رزرو نوبت پیش از ارسال فرم الزامی است.</p>
      {proof ? (
        <p className="text-emerald-800">
          رزرو مرتبط دریافت شد. می‌توانید فرم را ارسال کنید.
        </p>
      ) : (
        <Link
          href={bookHref}
          className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          رزرو نوبت «{serviceTitle ?? "خدمت"}»
        </Link>
      )}
      <input type="hidden" name="bookingProof" value={proof} />
      {!proof ? (
        <p className="text-xs text-amber-900/80">
          پس از تکمیل رزرو به همین صفحه بازمی‌گردید.
        </p>
      ) : null}
    </div>
  );
}
