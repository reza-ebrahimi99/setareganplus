"use client";

import { useActionState } from "react";
import {
  updateRegistrationFlowAction,
  type RegistrationFlowActionState,
} from "@/app/admin/(dashboard)/registrations/actions";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import { formatDateTimeLocalInTehran } from "@/lib/forms/tehran-datetime";
import type { RegistrationFlowConfig } from "@/lib/registration/flow-config-shared";

const emptyState: RegistrationFlowActionState = {};

function fieldClass(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError ? `${base} border-red-400` : `${base} border-border`;
}

type Props = {
  flow: RegistrationFlowConfig;
};

export function RegistrationFlowSettingsForm({ flow }: Props) {
  const [state, formAction, pending] = useActionState(
    updateRegistrationFlowAction,
    emptyState,
  );

  function value(key: string, fallback: string): string {
    return state.values?.[key] ?? fallback;
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="flowKey" value={flow.flowKey} />

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {state.successMessage}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-primary">اطلاعات پایه</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="text-sm font-medium">
              عنوان
            </label>
            <input
              id="title"
              name="title"
              className={fieldClass(false)}
              defaultValue={value("title", flow.title)}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor="pricingBadge" className="text-sm font-medium">
              بج قیمت
            </label>
            <input
              id="pricingBadge"
              name="pricingBadge"
              className={fieldClass(false)}
              defaultValue={value("pricingBadge", flow.pricingBadge ?? "")}
              disabled={pending}
              placeholder="مثلاً فقط تا ۳۰ تیر"
            />
          </div>
        </div>
        <div>
          <label htmlFor="subtitle" className="text-sm font-medium">
            توضیح
          </label>
          <textarea
            id="subtitle"
            name="subtitle"
            rows={2}
            className={fieldClass(false)}
            defaultValue={value("subtitle", flow.subtitle ?? "")}
            disabled={pending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={flow.isActive}
            disabled={pending}
          />
          جریان فعال است
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-primary">
          قیمت (ریال)
        </h2>
        <p className="text-xs text-muted">
          در UI عمومی مبلغ به تومان نمایش داده می‌شود. قیمت فروش نباید از قیمت
          اصلی بیشتر باشد.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="baseAmountRials" className="text-sm font-medium">
              قیمت اصلی (ریال)
            </label>
            <input
              id="baseAmountRials"
              name="baseAmountRials"
              inputMode="numeric"
              className={fieldClass(Boolean(state.fieldErrors?.baseAmountRials))}
              defaultValue={value(
                "baseAmountRials",
                flow.baseAmountRials != null ? String(flow.baseAmountRials) : "",
              )}
              disabled={pending}
            />
            {state.fieldErrors?.baseAmountRials ? (
              <p className="mt-1 text-sm text-red-700">
                {state.fieldErrors.baseAmountRials}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="saleAmountRials" className="text-sm font-medium">
              قیمت فروش / تخفیف‌خورده (ریال)
            </label>
            <input
              id="saleAmountRials"
              name="saleAmountRials"
              inputMode="numeric"
              className={fieldClass(Boolean(state.fieldErrors?.saleAmountRials))}
              defaultValue={value(
                "saleAmountRials",
                flow.saleAmountRials != null ? String(flow.saleAmountRials) : "",
              )}
              disabled={pending}
            />
            {state.fieldErrors?.saleAmountRials ? (
              <p className="mt-1 text-sm text-red-700">
                {state.fieldErrors.saleAmountRials}
              </p>
            ) : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isFree"
            defaultChecked={flow.isFree}
            disabled={pending}
          />
          رایگان
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="discountStartsAt" className="text-sm font-medium">
              شروع تخفیف
            </label>
            <JalaliDateTimeFields
              id="discountStartsAt"
              name="discountStartsAt"
              defaultValueIso={value(
                "discountStartsAt",
                flow.discountStartsAt
                  ? formatDateTimeLocalInTehran(flow.discountStartsAt)
                  : "",
              )}
              disabled={pending}
              hasError={Boolean(state.fieldErrors?.discountStartsAt)}
              timeOptional
            />
            {state.fieldErrors?.discountStartsAt ? (
              <p className="mt-1 text-sm text-red-700">
                {state.fieldErrors.discountStartsAt}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="discountEndsAt" className="text-sm font-medium">
              پایان تخفیف
            </label>
            <JalaliDateTimeFields
              id="discountEndsAt"
              name="discountEndsAt"
              defaultValueIso={value(
                "discountEndsAt",
                flow.discountEndsAt
                  ? formatDateTimeLocalInTehran(flow.discountEndsAt)
                  : "",
              )}
              disabled={pending}
              hasError={Boolean(state.fieldErrors?.discountEndsAt)}
              timeOptional
            />
            {state.fieldErrors?.discountEndsAt ? (
              <p className="mt-1 text-sm text-red-700">
                {state.fieldErrors.discountEndsAt}
              </p>
            ) : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showDiscountCountdown"
            defaultChecked={flow.showDiscountCountdown}
            disabled={pending}
          />
          نمایش شمارش معکوس تخفیف
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-primary">
          بازه ثبت‌نام و ظرفیت
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="registrationStartsAt"
              className="text-sm font-medium"
            >
              شروع ثبت‌نام
            </label>
            <JalaliDateTimeFields
              id="registrationStartsAt"
              name="registrationStartsAt"
              defaultValueIso={value(
                "registrationStartsAt",
                flow.registrationStartsAt
                  ? formatDateTimeLocalInTehran(flow.registrationStartsAt)
                  : "",
              )}
              disabled={pending}
              hasError={Boolean(state.fieldErrors?.registrationStartsAt)}
              timeOptional
            />
            {state.fieldErrors?.registrationStartsAt ? (
              <p className="mt-1 text-sm text-red-700">
                {state.fieldErrors.registrationStartsAt}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="registrationEndsAt" className="text-sm font-medium">
              پایان ثبت‌نام
            </label>
            <JalaliDateTimeFields
              id="registrationEndsAt"
              name="registrationEndsAt"
              defaultValueIso={value(
                "registrationEndsAt",
                flow.registrationEndsAt
                  ? formatDateTimeLocalInTehran(flow.registrationEndsAt)
                  : "",
              )}
              disabled={pending}
              hasError={Boolean(state.fieldErrors?.registrationEndsAt)}
              timeOptional
            />
            {state.fieldErrors?.registrationEndsAt ? (
              <p className="mt-1 text-sm text-red-700">
                {state.fieldErrors.registrationEndsAt}
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="capacity" className="text-sm font-medium">
            ظرفیت (خالی = نامحدود)
          </label>
          <input
            id="capacity"
            name="capacity"
            inputMode="numeric"
            className={fieldClass(Boolean(state.fieldErrors?.capacity))}
            defaultValue={value(
              "capacity",
              flow.capacity != null ? String(flow.capacity) : "",
            )}
            disabled={pending}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showRemainingCapacity"
            defaultChecked={flow.showRemainingCapacity}
            disabled={pending}
          />
          نمایش ظرفیت باقی‌مانده
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-primary">پیامک</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="confirmationSmsEnabled"
            defaultChecked={flow.confirmationSmsEnabled}
            disabled={pending}
          />
          پیامک تأیید برای کاربر
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="adminNotificationSmsEnabled"
            defaultChecked={flow.adminNotificationSmsEnabled}
            disabled={pending}
          />
          پیامک اطلاع به مدیر
        </label>
        <div>
          <label htmlFor="smsTemplateCode" className="text-sm font-medium">
            کد الگوی SMS.ir / قالب
          </label>
          <input
            id="smsTemplateCode"
            name="smsTemplateCode"
            className={fieldClass(false)}
            defaultValue={value("smsTemplateCode", flow.smsTemplateCode ?? "")}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="adminSmsRecipients" className="text-sm font-medium">
            شماره‌های مدیر (هر خط یا با ویرگول)
          </label>
          <textarea
            id="adminSmsRecipients"
            name="adminSmsRecipients"
            rows={3}
            className={fieldClass(
              Boolean(state.fieldErrors?.adminSmsRecipients),
            )}
            defaultValue={value(
              "adminSmsRecipients",
              flow.adminSmsRecipients.join("\n"),
            )}
            disabled={pending}
            dir="ltr"
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
      >
        {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
      </button>
    </form>
  );
}
