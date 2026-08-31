"use client";

import { useEffect } from "react";
import Link from "next/link";

export function GuidanceErrorFallback({
  error,
  retry,
  homeHref = "/ms",
  homeLabel = "بازگشت به دفتر",
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="office-error" dir="rtl" role="alert">
      <p>دفتر لحظه‌ای مکث کرد</p>
      <h1>این اتاق الان آرام نیست</h1>
      <p>
        پرونده‌تان سر جایش است. فقط این صفحه بار نشد. دوباره تلاش کنید، یا به
        دفتر برگردید — هیچ انتخابی از دست نرفته.
      </p>
      <div className="office-error__actions">
        {retry ? (
          <button type="button" onClick={retry}>
            تلاش دوباره
          </button>
        ) : null}
        <Link href={homeHref}>{homeLabel}</Link>
        <Link href="/guidance">صفحه دپارتمان</Link>
      </div>
    </div>
  );
}
