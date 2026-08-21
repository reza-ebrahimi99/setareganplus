"use client";

import { useActionState } from "react";
import {
  resendOrderSmsAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import {
  commerceOrderAdminPickupPath,
  commerceOrderQrPath,
  commerceOrderQrUrl,
  commerceOrderReceiptUrl,
} from "@/lib/commerce/orders/qr";

const empty: CommerceOrderActionState = {};

export function OrderOpsQuickLinks({
  orderId,
  qrToken,
  canManage,
}: {
  orderId: string;
  qrToken: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(resendOrderSmsAction, empty);
  const qrUrl = commerceOrderQrUrl(qrToken);
  const receiptUrl = commerceOrderReceiptUrl(qrToken);
  const qrPath = commerceOrderQrPath(qrToken);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* ignore */
    }
  }

  const linkClass =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-medium";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a href={qrPath} target="_blank" rel="noreferrer" className={linkClass}>
          باز کردن رسید / QR
        </a>
        <a href={qrPath} target="_blank" rel="noreferrer" className={linkClass}>
          باز کردن QR
        </a>
        <a href={`${qrPath}/delivery`} target="_blank" rel="noreferrer" className={linkClass}>
          چاپ رسید
        </a>
        <a
          href={`/admin/commerce/orders/labels?ids=${encodeURIComponent(orderId)}`}
          className={linkClass}
        >
          چاپ برچسب
        </a>
        <a href={commerceOrderAdminPickupPath(qrToken)} className={linkClass}>
          میز دریافت
        </a>
        <button type="button" className={linkClass} onClick={() => void copy(qrUrl)}>
          کپی لینک دریافت
        </button>
        <button type="button" className={linkClass} onClick={() => void copy(receiptUrl)}>
          کپی لینک رسید
        </button>
      </div>
      {canManage ? (
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full rounded-xl border border-border px-3 text-xs font-medium disabled:opacity-60"
          >
            {pending ? "در حال ارسال…" : "ارسال دوباره پیامک"}
          </button>
          {state.formError ? <p className="mt-1 text-xs text-danger">{state.formError}</p> : null}
          {state.successMessage ? (
            <p className="mt-1 text-xs text-success">{state.successMessage}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
