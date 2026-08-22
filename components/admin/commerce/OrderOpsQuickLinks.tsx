"use client";

import { useActionState } from "react";
import {
  resendOrderSmsAction,
  retryOrderSmsAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import {
  commerceOrderAdminPickupPath,
  commerceOrderQrPath,
  commerceOrderQrUrl,
  commerceOrderReceiptUrl,
} from "@/lib/commerce/orders/qr";
import type { OrderOpsDetailView } from "@/components/admin/commerce/order-ops-types";

const empty: CommerceOrderActionState = {};

export function OrderOpsQuickLinks({
  orderId,
  qrToken,
  canManage,
  smsHistory,
}: {
  orderId: string;
  qrToken: string;
  canManage: boolean;
  smsHistory: OrderOpsDetailView["smsHistory"];
}) {
  const [resendState, resendAction, resendPending] = useActionState(
    resendOrderSmsAction,
    empty,
  );
  const [retryState, retryAction, retryPending] = useActionState(
    retryOrderSmsAction,
    empty,
  );
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
    <div className="space-y-3">
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
        <div className="grid grid-cols-1 gap-2">
          <form action={resendAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="stage" value="PAID" />
            <button
              type="submit"
              disabled={resendPending}
              className="min-h-11 w-full rounded-xl border border-border px-3 text-xs font-medium disabled:opacity-60"
            >
              ارسال دوباره پیامک خرید
            </button>
          </form>
          <form action={resendAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="stage" value="READY_FOR_PICKUP" />
            <button
              type="submit"
              disabled={resendPending}
              className="min-h-11 w-full rounded-xl border border-border px-3 text-xs font-medium disabled:opacity-60"
            >
              ارسال دوباره پیامک آماده تحویل
            </button>
          </form>
          <form action={resendAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="stage" value="DELIVERED_TO_STUDENT" />
            <button
              type="submit"
              disabled={resendPending}
              className="min-h-11 w-full rounded-xl border border-border px-3 text-xs font-medium disabled:opacity-60"
            >
              ارسال دوباره پیامک تحویل
            </button>
          </form>
          {resendState.formError ? (
            <p className="text-xs text-danger">{resendState.formError}</p>
          ) : null}
          {resendState.successMessage ? (
            <p className="text-xs text-success">{resendState.successMessage}</p>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-primary">تاریخچه پیامک</h4>
        {smsHistory.length === 0 ? (
          <p className="text-xs text-muted">پیامکی برای این سفارش ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {smsHistory.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-background px-3 py-2 text-xs leading-6">
                <p className="font-medium">{item.templateLabel} · {item.stageLabel}</p>
                <p className="text-muted">{item.sentAtLabel}</p>
                <p>وضعیت: {item.statusLabel}</p>
                <p className="break-all text-muted">پاسخ سرویس: {item.providerResponse}</p>
                {canManage && item.canRetry ? (
                  <form action={retryAction} className="mt-1">
                    <input type="hidden" name="messageId" value={item.id} />
                    <button
                      type="submit"
                      disabled={retryPending}
                      className="min-h-9 rounded-lg border border-border px-2 disabled:opacity-60"
                    >
                      تلاش مجدد
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {retryState.formError ? <p className="text-xs text-danger">{retryState.formError}</p> : null}
        {retryState.successMessage ? (
          <p className="text-xs text-success">{retryState.successMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
