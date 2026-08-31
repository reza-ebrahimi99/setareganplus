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
      <p>خطا در بارگذاری</p>
      <h1>این صفحه الان در دسترس نیست</h1>
      <p>
        مسیر خراب نیست؛ بارگذاری این صفحه با خطا روبه‌رو شد. دوباره تلاش کنید یا
        به دفتر برگردید. هیچ داده‌ای از پرونده پاک نشده است.
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
