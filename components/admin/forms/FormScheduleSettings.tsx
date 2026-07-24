"use client";

import { useActionState } from "react";
import {
  updateDraftFormSettingsAction,
  type FormSettingsActionState,
} from "@/app/admin/(dashboard)/forms/settings-actions";
import type { EditorScheduleSettings } from "@/lib/forms/load-form-editor";
import { formatDateTimeLocalInTehran } from "@/lib/forms/tehran-datetime";
import { toPersianDigits } from "@/lib/persian";

const emptyState: FormSettingsActionState = {};

type FormScheduleSettingsProps = {
  formId: string;
  editable: boolean;
  schedule: EditorScheduleSettings;
};

function fieldClass(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError ? `${base} border-red-400` : `${base} border-border`;
}

function readOnlyValue(label: string, value: string) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-sm text-foreground" dir="ltr">
        {value}
      </p>
    </div>
  );
}

export function FormScheduleSettings({
  formId,
  editable,
  schedule,
}: FormScheduleSettingsProps) {
  const [state, formAction, pending] = useActionState(
    updateDraftFormSettingsAction,
    emptyState,
  );

  const opensAtDefault =
    state.values?.opensAt ??
    (schedule.opensAt ? formatDateTimeLocalInTehran(schedule.opensAt) : "");
  const deadlineDefault =
    state.values?.registrationDeadline ??
    (schedule.registrationDeadline
      ? formatDateTimeLocalInTehran(schedule.registrationDeadline)
      : "");
  const capacityDefault =
    state.values?.capacity ??
    (schedule.capacity != null ? String(schedule.capacity) : "");
  const showRemainingDefault =
    state.values?.showRemainingCapacity ??
    schedule.settings.showRemainingCapacity;
  const confirmationSmsDefault =
    state.values?.confirmationSmsEnabled ??
    schedule.settings.confirmationSmsEnabled;
  const adminSmsDefault =
    state.values?.adminNotificationSmsEnabled ??
    schedule.settings.adminNotificationSmsEnabled;
  const adminRecipientsDefault =
    state.values?.adminSmsRecipients ??
    schedule.settings.adminSmsRecipients.join("\n");
  const smsTemplateCodeDefault =
    state.values?.smsTemplateCode ?? schedule.settings.smsTemplateCode ?? "";

  return (
    <section
      aria-label="زمان‌بندی و ظرفیت"
      className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-primary">
          زمان‌بندی و ظرفیت ثبت‌نام
        </h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          {editable
            ? "این تنظیمات روی نسخه پیش‌نویس اعمال می‌شود و پس از انتشار روی فرم عمومی اثر دارد. زمان‌ها بر اساس تقویم تهران ذخیره می‌شوند."
            : "نسخه پیش‌نویس وجود ندارد؛ تنظیمات نسخه منتشرشده فقط برای مشاهده است."}
        </p>
      </div>

      {state.formError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      {state.successMessage && !state.formError ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {state.successMessage}
        </p>
      ) : null}

      {editable ? (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="formId" value={formId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="opensAt"
                className="text-sm font-medium text-primary"
              >
                تاریخ و ساعت شروع ثبت‌نام
              </label>
              <input
                id="opensAt"
                name="opensAt"
                type="datetime-local"
                dir="ltr"
                defaultValue={opensAtDefault}
                disabled={pending}
                aria-invalid={state.fieldErrors?.opensAt ? true : undefined}
                className={fieldClass(Boolean(state.fieldErrors?.opensAt))}
              />
              {state.fieldErrors?.opensAt ? (
                <p className="mt-1 text-sm text-red-700" role="alert">
                  {state.fieldErrors.opensAt}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="registrationDeadline"
                className="text-sm font-medium text-primary"
              >
                تاریخ و ساعت پایان ثبت‌نام
              </label>
              <input
                id="registrationDeadline"
                name="registrationDeadline"
                type="datetime-local"
                dir="ltr"
                defaultValue={deadlineDefault}
                disabled={pending}
                aria-invalid={
                  state.fieldErrors?.registrationDeadline ? true : undefined
                }
                className={fieldClass(
                  Boolean(state.fieldErrors?.registrationDeadline),
                )}
              />
              {state.fieldErrors?.registrationDeadline ? (
                <p className="mt-1 text-sm text-red-700" role="alert">
                  {state.fieldErrors.registrationDeadline}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="capacity"
              className="text-sm font-medium text-primary"
            >
              ظرفیت ثبت‌نام
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              inputMode="numeric"
              min={1}
              dir="ltr"
              placeholder="مثلاً ۱۰۰"
              defaultValue={capacityDefault}
              disabled={pending}
              aria-invalid={state.fieldErrors?.capacity ? true : undefined}
              className={fieldClass(Boolean(state.fieldErrors?.capacity))}
            />
            {state.fieldErrors?.capacity ? (
              <p className="mt-1 text-sm text-red-700" role="alert">
                {state.fieldErrors.capacity}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                خالی بگذارید تا ظرفیت محدود نباشد.
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm leading-7 text-foreground">
            <input
              type="checkbox"
              name="showRemainingCapacity"
              value="true"
              defaultChecked={showRemainingDefault}
              disabled={pending}
              className="mt-1 size-4 shrink-0 rounded border-border text-primary"
            />
            <span>نمایش ظرفیت باقی‌مانده در فرم عمومی</span>
          </label>

          <div className="space-y-3 rounded-xl border border-border bg-background px-3 py-3">
            <p className="text-sm font-medium text-primary">پیامک</p>
            <label className="flex items-start gap-3 text-sm leading-7 text-foreground">
              <input
                type="checkbox"
                name="confirmationSmsEnabled"
                value="true"
                defaultChecked={confirmationSmsDefault}
                disabled={pending}
                className="mt-1 size-4 shrink-0 rounded border-border text-primary"
              />
              <span>پیامک تأیید برای کاربر پس از ثبت فرم</span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-7 text-foreground">
              <input
                type="checkbox"
                name="adminNotificationSmsEnabled"
                value="true"
                defaultChecked={adminSmsDefault}
                disabled={pending}
                className="mt-1 size-4 shrink-0 rounded border-border text-primary"
              />
              <span>پیامک اطلاع به مدیر</span>
            </label>
            <div>
              <label
                htmlFor="smsTemplateCode"
                className="text-sm font-medium text-primary"
              >
                کد الگوی SMS.ir / قالب (اختیاری)
              </label>
              <input
                id="smsTemplateCode"
                name="smsTemplateCode"
                type="text"
                dir="ltr"
                defaultValue={smsTemplateCodeDefault}
                disabled={pending}
                aria-invalid={
                  state.fieldErrors?.smsTemplateCode ? true : undefined
                }
                className={fieldClass(Boolean(state.fieldErrors?.smsTemplateCode))}
              />
              {state.fieldErrors?.smsTemplateCode ? (
                <p className="mt-1 text-sm text-red-700" role="alert">
                  {state.fieldErrors.smsTemplateCode}
                </p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="adminSmsRecipients"
                className="text-sm font-medium text-primary"
              >
                شماره‌های مدیر (هر خط یا با ویرگول)
              </label>
              <textarea
                id="adminSmsRecipients"
                name="adminSmsRecipients"
                rows={3}
                dir="ltr"
                defaultValue={adminRecipientsDefault}
                disabled={pending}
                aria-invalid={
                  state.fieldErrors?.adminSmsRecipients ? true : undefined
                }
                className={fieldClass(
                  Boolean(state.fieldErrors?.adminSmsRecipients),
                )}
              />
              {state.fieldErrors?.adminSmsRecipients ? (
                <p className="mt-1 text-sm text-red-700" role="alert">
                  {state.fieldErrors.adminSmsRecipients}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  فقط وقتی پیامک مدیر فعال باشد استفاده می‌شود.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
          </button>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {readOnlyValue(
            "شروع ثبت‌نام",
            schedule.opensAt
              ? formatDateTimeLocalInTehran(schedule.opensAt)
              : "—",
          )}
          {readOnlyValue(
            "پایان ثبت‌نام",
            schedule.registrationDeadline
              ? formatDateTimeLocalInTehran(schedule.registrationDeadline)
              : "—",
          )}
          {readOnlyValue(
            "ظرفیت",
            schedule.capacity != null
              ? toPersianDigits(schedule.capacity)
              : "نامحدود",
          )}
          {readOnlyValue(
            "نمایش ظرفیت باقی‌مانده",
            schedule.settings.showRemainingCapacity ? "فعال" : "غیرفعال",
          )}
          {readOnlyValue(
            "پیامک تأیید کاربر",
            schedule.settings.confirmationSmsEnabled ? "فعال" : "غیرفعال",
          )}
          {readOnlyValue(
            "پیامک اطلاع مدیر",
            schedule.settings.adminNotificationSmsEnabled
              ? "فعال"
              : "غیرفعال",
          )}
          {readOnlyValue(
            "کد الگوی پیامک",
            schedule.settings.smsTemplateCode ?? "—",
          )}
          {readOnlyValue(
            "شماره‌های مدیر",
            schedule.settings.adminSmsRecipients.length > 0
              ? schedule.settings.adminSmsRecipients.join("، ")
              : "—",
          )}
        </div>
      )}
    </section>
  );
}
