"use client";

import { useTransition } from "react";
import { retryPaymentAction } from "@/app/payments/actions";

export function RetryPaymentButton({
  registrationId,
}: {
  registrationId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await retryPaymentAction(registrationId);
          if (result.ok) {
            window.location.href = result.checkoutUrl;
            return;
          }
          window.alert(result.error);
        });
      }}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/92 disabled:opacity-60"
    >
      {pending ? "در حال آماده‌سازی…" : "تلاش مجدد پرداخت"}
    </button>
  );
}
