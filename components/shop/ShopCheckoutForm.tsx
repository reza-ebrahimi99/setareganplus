"use client";

import { useActionState } from "react";
import {
  startShopCheckoutAction,
  type ShopCheckoutState,
} from "@/app/shop/actions";

const empty: ShopCheckoutState = {};

type Props = {
  itemId: string;
  disabled?: boolean;
  finalPriceLabel: string;
};

export function ShopCheckoutForm({
  itemId,
  disabled = false,
  finalPriceLabel,
}: Props) {
  const [state, action, pending] = useActionState(startShopCheckoutAction, empty);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <input type="hidden" name="itemId" value={itemId} />
      <h2 className="text-base font-bold text-foreground">خرید و پرداخت آنلاین</h2>
      <p className="text-sm text-muted">مبلغ قابل پرداخت: {finalPriceLabel}</p>

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نام</span>
        <input
          name="buyerFirstName"
          required
          disabled={disabled || pending}
          maxLength={80}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">نام خانوادگی</span>
        <input
          name="buyerLastName"
          required
          disabled={disabled || pending}
          maxLength={80}
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">شماره موبایل</span>
        <input
          name="buyerMobile"
          required
          inputMode="tel"
          dir="ltr"
          disabled={disabled || pending}
          placeholder="09xxxxxxxxx"
          className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={disabled || pending}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled
          ? "ناموجود"
          : pending
            ? "در حال انتقال به درگاه…"
            : "خرید و پرداخت آنلاین"}
      </button>
    </form>
  );
}
