"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <html lang="fa" dir="rtl">
      <body>
        <main style={{ maxWidth: "32rem", margin: "3rem auto", padding: "1.5rem" }}>
          <p>خطا در بارگذاری</p>
          <h1>سامانه الان در دسترس نیست</h1>
          <p>لطفاً دوباره تلاش کنید. پرونده شما پاک نشده است.</p>
          {retry ? (
            <button type="button" onClick={retry}>
              تلاش دوباره
            </button>
          ) : null}
          <p>
            <a href="/guidance">بازگشت به دپارتمان انتخاب رشته</a>
          </p>
        </main>
      </body>
    </html>
  );
}
