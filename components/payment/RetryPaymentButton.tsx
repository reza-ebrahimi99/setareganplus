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
          try {
            const result = await retryPaymentAction(registrationId);
            if (!result.ok) {
              window.alert(result.error);
              return;
            }
            const checkoutUrl = result.checkoutUrl?.trim() ?? "";
            if (!checkoutUrl) {
              console.error(
                "[payment] retry returned empty checkoutUrl",
                { registrationId },
              );
              window.alert(
                "لینک درگاه پرداخت دریافت نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
              );
              return;
            }
            window.location.assign(checkoutUrl);
          } catch (error) {
            console.error("[payment] retryPayment failed", error);
            window.alert(
              "آماده‌سازی پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
            );
          }
        });
      }}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/92 disabled:opacity-60"
    >
      {pending ? "در حال آماده‌سازی…" : "تلاش مجدد پرداخت"}
    </button>
  );
}
