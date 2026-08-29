"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorDisplayStatus } from "@/lib/forms/load-form-editor";
import { getPublicFormPath, getPublicFormUrl } from "@/lib/forms/public-form-url";
import { toPersianDigits } from "@/lib/persian";

const STATUS_LABELS: Record<EditorDisplayStatus, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشرشده",
  PAUSED: "متوقف‌شده",
};

const STATUS_STYLES: Record<EditorDisplayStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/70",
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70",
  PAUSED: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/70",
};

type FormShareCardProps = {
  formId: string;
  slug: string;
  title: string;
  displayStatus: EditorDisplayStatus;
  isPublished: boolean;
  posterUrl: string | null;
  posterAlt: string | null;
  capacity: number | null;
  /** ISO string or null — Dates are not safe as client props. */
  registrationDeadline: string | Date | null;
  qrPreviewDataUrl: string | null;
};

function formatDeadline(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return toPersianDigits(
    date.toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

function copyText(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}

export function FormShareCard({
  formId,
  slug,
  title,
  displayStatus,
  isPublished,
  posterUrl,
  posterAlt,
  capacity,
  registrationDeadline,
  qrPreviewDataUrl,
}: FormShareCardProps) {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicUrl = getPublicFormUrl(slug);
  const publicPath = getPublicFormPath(slug);
  const qrDownloadHref = `/admin/forms/${formId}/qr`;

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  async function handleCopy() {
    const ok = await copyText(publicUrl);
    if (ok) {
      showToast("لینک فرم کپی شد.");
    } else {
      showToast("کپی پشتیبانی نشد. لینک را دستی کپی کنید.");
      window.prompt("لینک فرم را کپی کنید:", publicUrl);
    }
  }

  return (
    <section
      aria-label="اشتراک‌گذاری فرم"
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_16px_40px_rgb(15_23_42_/_0.05)]"
    >
      <div className="border-b border-border bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#0f172a_100%)] px-5 py-4 text-white">
        <p className="text-xs font-medium text-secondary">اشتراک‌گذاری حرفه‌ای</p>
        <h2 className="mt-1 text-base font-semibold">کارت اشتراک فرم</h2>
        <p className="mt-1 text-xs leading-6 text-slate-300">
          لینک عمومی، پیش‌نمایش QR و دسترسی سریع برای انتشار
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-background sm:h-28 sm:w-40">
              {posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin media preview
                <img
                  src={posterUrl}
                  alt={posterAlt?.trim() || title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted">
                  پوستر تنظیم نشده
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[displayStatus]}`}
                >
                  {STATUS_LABELS[displayStatus]}
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-8 text-primary">
                {title}
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">ظرفیت</dt>
                  <dd className="mt-0.5 text-foreground">
                    {capacity != null
                      ? `${toPersianDigits(capacity)} نفر`
                      : "بدون محدودیت"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">مهلت ثبت‌نام</dt>
                  <dd className="mt-0.5 text-foreground">
                    {registrationDeadline
                      ? formatDeadline(registrationDeadline)
                      : "بدون مهلت"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <p className="text-sm font-medium text-primary">🔗 لینک فرم</p>
            <code
              dir="ltr"
              className="mt-2 block overflow-x-auto rounded-lg bg-white px-3 py-2.5 font-mono text-xs text-foreground ring-1 ring-border"
            >
              {publicUrl}
            </code>
            <p className="mt-2 text-[11px] text-muted" dir="ltr">
              مسیر نسبی: {publicPath}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!isPublished}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-50"
            >
              📋 کپی لینک
            </button>
            {isPublished ? (
              <a
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background"
              >
                🌍 باز کردن فرم
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground opacity-50"
              >
                🌍 باز کردن فرم
              </button>
            )}
            {isPublished ? (
              <a
                href={qrDownloadHref}
                className="inline-flex items-center justify-center rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-secondary/20"
              >
                ⬇ دانلود QR
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium opacity-50"
              >
                ⬇ دانلود QR
              </button>
            )}
          </div>

          {!isPublished ? (
            <p className="text-xs leading-6 text-amber-800">
              پس از انتشار فرم، لینک عمومی و QR فعال می‌شوند.
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col items-center justify-center gap-3 border-t border-border bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-6 lg:border-t-0 lg:border-s">
          <p className="text-xs font-medium text-muted">پیش‌نمایش QR</p>
          <div className="rounded-2xl border border-border bg-white p-3 shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
            {qrPreviewDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL preview
              <img
                src={qrPreviewDataUrl}
                alt={`کد QR فرم ${title}`}
                width={220}
                height={220}
                className="size-[180px] sm:size-[200px]"
              />
            ) : (
              <div className="flex size-[180px] items-center justify-center bg-slate-50 text-center text-xs leading-6 text-muted sm:size-[200px]">
                QR پس از انتشار
                <br />
                ساخته می‌شود
              </div>
            )}
          </div>
          <p className="max-w-[14rem] text-center text-[11px] leading-5 text-muted">
            اندازه دانلود: ۱۰۲۴×۱۰۲۴ · پس‌زمینه سفید · بدون واترمارک
          </p>
        </aside>
      </div>

      {toast ? (
        <div
          role="status"
          className="border-t border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900"
        >
          {toast}
        </div>
      ) : null}
    </section>
  );
}
