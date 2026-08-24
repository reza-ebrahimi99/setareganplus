"use client";

import { useState } from "react";

/**
 * Downloads the existing /admin/bookings/export.xlsx GET route via fetch so
 * the button can show a real, accurate loading state and stay disabled for
 * the exact duration the workbook takes to generate — no new endpoint, no
 * new query, same route the plain download link always used.
 */
export function ExportExcelButton({
  href,
  label = "📥 خروجی اکسل",
}: {
  href: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  function extractFilename(disposition: string | null): string {
    if (!disposition) return "bookings-export.xlsx";
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return "bookings-export.xlsx";
      }
    }
    const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
    return plainMatch?.[1] ?? "bookings-export.xlsx";
  }

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(href, { method: "GET" });
      if (!response.ok) {
        let message = "دریافت خروجی اکسل با خطا مواجه شد.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          /* non-JSON error body — keep default message */
        }
        window.alert(message);
        return;
      }
      const filename = extractFilename(response.headers.get("Content-Disposition"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("دریافت خروجی اکسل با خطا مواجه شد. اتصال اینترنت را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(15_23_42_/_0.18)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
          در حال آماده‌سازی…
        </>
      ) : (
        label
      )}
    </button>
  );
}
