"use client";

import { useActionState } from "react";
import {
  addCommerceNotifyRecipientAction,
  removeCommerceNotifyRecipientAction,
  setCommerceNotifyEnabledAction,
  toggleCommerceNotifyRecipientAction,
} from "@/app/admin/(dashboard)/settings/commerce-notifications/actions";
import type { CommerceSmsRecipient } from "@/lib/commerce/notification-settings";
import { toPersianDigits } from "@/lib/persian";

export function CommerceNotificationSettingsForm({
  enabled,
  recipients,
}: {
  enabled: boolean;
  recipients: CommerceSmsRecipient[];
}) {
  const [addState, addAction, addPending] = useActionState(
    addCommerceNotifyRecipientAction,
    null,
  );

  return (
    <div className="space-y-6">
      <section className="admin-card space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-primary">اعلان پیامکی سفارش پرداخت‌شده</h2>
          <p className="mt-1 text-sm leading-7 text-muted">
            پس از پرداخت موفق هر سفارش فروشگاه، یک پیامک به همه شماره‌های فعال
            ارسال می‌شود (از طریق صف پیامک موجود).
          </p>
        </div>

        <form action={setCommerceNotifyEnabledAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
          <button
            type="submit"
            className={
              enabled
                ? "min-h-11 rounded-xl border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-900"
                : "min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-medium text-muted"
            }
          >
            {enabled ? "اعلان‌ها فعال است — کلیک برای غیرفعال" : "اعلان‌ها خاموش است — کلیک برای فعال"}
          </button>
        </form>
      </section>

      <section className="admin-card space-y-4 p-5">
        <h2 className="font-semibold text-primary">شماره مدیران</h2>
        <p className="text-sm text-muted">
          تعداد گیرندگان نامحدود است. هر شماره را می‌توانید جداگانه فعال یا حذف کنید.
        </p>

        <form action={addAction} className="flex flex-col gap-3 sm:flex-row">
          <label className="block flex-1 text-sm">
            <span className="mb-1.5 block text-muted">موبایل جدید</span>
            <input
              name="mobile"
              inputMode="tel"
              dir="ltr"
              placeholder="0912…"
              required
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={addPending}
              className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-medium text-white sm:w-auto"
            >
              {addPending ? "در حال افزودن…" : "افزودن شماره"}
            </button>
          </div>
        </form>
        {addState && !addState.ok ? (
          <p className="text-sm text-danger" role="alert">
            {addState.error}
          </p>
        ) : null}
        {addState?.ok ? (
          <p className="text-sm text-success">شماره افزوده شد.</p>
        ) : null}

        {recipients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            هنوز شماره‌ای ثبت نشده است.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {recipients.map((recipient) => (
              <li
                key={recipient.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-primary" dir="ltr">
                    {toPersianDigits(recipient.mobile)}
                  </p>
                  <p className="text-xs text-muted">
                    {recipient.enabled ? "فعال" : "غیرفعال"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleCommerceNotifyRecipientAction}>
                    <input type="hidden" name="recipientId" value={recipient.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={recipient.enabled ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                    >
                      {recipient.enabled ? "غیرفعال کردن" : "فعال کردن"}
                    </button>
                  </form>
                  <form action={removeCommerceNotifyRecipientAction}>
                    <input type="hidden" name="recipientId" value={recipient.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800"
                    >
                      حذف
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
