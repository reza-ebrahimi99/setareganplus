"use client";
import { useEffect } from "react";

/** Any unexpected admin error (or a stale page after an update) shows a clear Persian message instead of a blank / frozen screen. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-gc/30 bg-paper p-8 text-center shadow-sm" role="alert">
      <h1 className="text-2xl font-extrabold text-navy">کار انجام نشد</h1>
      <p className="mt-3 leading-8 text-muted">
        خطایی پیش آمد و تغییر ذخیره نشد. اگر سایت تازه به‌روزرسانی شده، صفحه را یک بار دوباره باز کنید و دوباره امتحان کنید.
        <br />اگر باز هم تکرار شد، به مدیر خبر دهید{error.digest ? <> (کد خطا: <span dir="ltr" className="font-mono">{error.digest}</span>)</> : null}.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={() => window.location.reload()} className="btn-gold px-6 py-2.5">بارگذاری دوبارهٔ صفحه</button>
        <button onClick={() => reset()} className="btn-ghost px-6 py-2.5">تلاش دوباره</button>
      </div>
    </div>
  );
}
