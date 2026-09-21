"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  queryString: string;
};

export function CounselorStudentsExcelExport({ queryString }: Props) {
  const [loading, setLoading] = useState<"filtered" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const download = useCallback(
    async (scope: "filtered" | "all") => {
      if (busyRef.current) return;
      busyRef.current = true;
      setLoading(scope);
      setError(null);

      try {
        const params = new URLSearchParams(queryString);
        params.set("scope", scope);
        const res = await fetch(`/admin/counselor/students/export.xlsx?${params.toString()}`, {
          method: "GET",
          credentials: "same-origin",
        });

        if (!res.ok) {
          let message = "خطا در دریافت فایل اکسل.";
          try {
            const body = (await res.json()) as { error?: string };
            if (body.error) message = body.error;
          } catch {
            /* non-json */
          }
          setError(message);
          return;
        }

        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        const filename = match ? decodeURIComponent(match[1]!) : "students-export.xlsx";

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch {
        setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
      } finally {
        setLoading(null);
        busyRef.current = false;
      }
    },
    [queryString],
  );

  return (
    <div className="cos-export">
      <details className="cos-export__menu">
        <summary className="cos-btn cos-btn--secondary" aria-busy={loading != null}>
          {loading ? "در حال آماده‌سازی اکسل…" : "خروجی اکسل"}
        </summary>
        <div className="cos-export__dropdown" role="menu">
          <button
            type="button"
            className="cos-export__item"
            disabled={loading != null}
            onClick={() => download("filtered")}
          >
            خروجی نتایج فعلی
          </button>
          <button
            type="button"
            className="cos-export__item"
            disabled={loading != null}
            onClick={() => download("all")}
          >
            خروجی همه دانش‌آموزان مجاز
          </button>
        </div>
      </details>
      {error ? (
        <p className="cos-export__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
