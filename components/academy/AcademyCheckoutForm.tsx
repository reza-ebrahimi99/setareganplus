"use client";

import { useState, useTransition } from "react";
import { startAcademyCheckoutAction } from "@/app/academy/checkout/actions";

export function AcademyCheckoutForm(props: {
  courseId?: string;
  lessonId?: string;
  discountCode?: string;
  mobile: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 space-y-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await startAcademyCheckoutAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          window.location.href = result.checkoutUrl;
        });
      }}
    >
      {props.courseId ? (
        <input type="hidden" name="courseId" value={props.courseId} />
      ) : null}
      {props.lessonId ? (
        <input type="hidden" name="lessonId" value={props.lessonId} />
      ) : null}
      {props.discountCode ? (
        <input type="hidden" name="discountCode" value={props.discountCode} />
      ) : null}
      <label className="block text-sm">
        شماره موبایل
        <input
          readOnly
          value={props.mobile ?? ""}
          dir="ltr"
          className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="academy-btn-primary w-full disabled:opacity-60"
      >
        {pending ? "در حال انتقال…" : "پرداخت امن"}
      </button>
    </form>
  );
}
