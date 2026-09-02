"use client";

import { useEffect } from "react";
import Link from "next/link";
import { GUIDANCE_PLATFORM_HOME } from "@/lib/guidance/portal-nav";
import { UnfinishedMark } from "@/components/guidance/office/illustrations";

export function GuidanceErrorFallback({
  error,
  retry,
  homeHref = GUIDANCE_PLATFORM_HOME,
  homeLabel = "بازگشت به داشبورد",
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
    <div className="chamber-error" dir="rtl" role="alert">
      <UnfinishedMark />
      <p className="chamber-kicker">دفتر لحظه‌ای مکث کرد</p>
      <h1>این اتاق الان آرام نیست</h1>
      <p>
        پرونده‌تان سر جایش است. دوباره تلاش کنید — هیچ انتخابی از دست نرفته.
      </p>
      <div className="chamber-error__actions">
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
