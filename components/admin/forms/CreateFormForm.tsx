"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  createFormAction,
  type CreateFormState,
} from "@/app/admin/(dashboard)/forms/actions";
import { FORM_MODE_OPTIONS } from "@/lib/forms/form-mode-labels";
import { FORM_PURPOSE_OPTIONS } from "@/lib/forms/form-purpose-labels";
import { FormMode } from "@/generated/prisma/enums";

const initialState: CreateFormState = {};

function fieldClassName(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border hover:border-secondary/40`;
}

export function CreateFormForm() {
  const [state, formAction, pending] = useActionState(
    createFormAction,
    initialState,
  );

  const values = state.values;
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="admin-card space-y-5 p-5 sm:p-6" noValidate>
      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      <div>
        <label htmlFor="form-title" className="text-sm font-medium text-primary">
          عنوان فرم
        </label>
        <input
          id="form-title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={values?.title ?? ""}
          aria-invalid={errors?.title ? true : undefined}
          aria-describedby={errors?.title ? "form-title-error" : undefined}
          className={fieldClassName(Boolean(errors?.title))}
          placeholder="مثال: ثبت‌نام کلاس رایگان ریاضی"
          autoComplete="off"
        />
        {errors?.title ? (
          <p id="form-title-error" className="mt-1.5 text-sm text-red-700">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="form-slug" className="text-sm font-medium text-primary">
          نامک (slug)
        </label>
        <input
          id="form-slug"
          name="slug"
          type="text"
          required
          maxLength={80}
          dir="ltr"
          defaultValue={values?.slug ?? ""}
          aria-invalid={errors?.slug ? true : undefined}
          aria-describedby={
            errors?.slug ? "form-slug-error form-slug-hint" : "form-slug-hint"
          }
          className={`${fieldClassName(Boolean(errors?.slug))} font-mono`}
          placeholder="free-class-math"
          autoComplete="off"
        />
        <p id="form-slug-hint" className="mt-1.5 text-xs leading-6 text-muted">
          فقط حروف لاتین کوچک، عدد و خط تیره. در آدرس عمومی فرم استفاده می‌شود.
        </p>
        {errors?.slug ? (
          <p id="form-slug-error" className="mt-1.5 text-sm text-red-700">
            {errors.slug}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="form-purpose"
          className="text-sm font-medium text-primary"
        >
          هدف فرم
        </label>
        <select
          id="form-purpose"
          name="purpose"
          required
          defaultValue={values?.purpose ?? ""}
          aria-invalid={errors?.purpose ? true : undefined}
          aria-describedby={errors?.purpose ? "form-purpose-error" : undefined}
          className={fieldClassName(Boolean(errors?.purpose))}
        >
          <option value="" disabled>
            انتخاب کنید
          </option>
          {FORM_PURPOSE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors?.purpose ? (
          <p id="form-purpose-error" className="mt-1.5 text-sm text-red-700">
            {errors.purpose}
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-primary">حالت فرم</legend>
        <p id="form-mode-hint" className="mt-1.5 text-xs leading-6 text-muted">
          حالت ثبت‌نام زیرساخت چندمرحله‌ای را روی همین فرم‌ساز فعال می‌کند؛ رفتار
          عمومی فرم‌های استاندارد تغییر نمی‌کند.
        </p>
        <div
          className="mt-3 space-y-2"
          role="radiogroup"
          aria-describedby={
            errors?.mode ? "form-mode-error form-mode-hint" : "form-mode-hint"
          }
        >
          {FORM_MODE_OPTIONS.map((option) => {
            const inputId = `form-mode-${option.value.toLowerCase()}`;
            return (
              <label
                key={option.value}
                htmlFor={inputId}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3 hover:border-secondary/40"
              >
                <input
                  id={inputId}
                  type="radio"
                  name="mode"
                  value={option.value}
                  defaultChecked={
                    (values?.mode ?? FormMode.STANDARD) === option.value
                  }
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-6 text-muted">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors?.mode ? (
          <p id="form-mode-error" className="mt-1.5 text-sm text-red-700">
            {errors.mode}
          </p>
        ) : null}
      </fieldset>

      <div>
        <label
          htmlFor="form-confirmation"
          className="text-sm font-medium text-primary"
        >
          پیام تأیید پس از ثبت
        </label>
        <textarea
          id="form-confirmation"
          name="confirmationMessage"
          required
          rows={4}
          maxLength={2000}
          defaultValue={values?.confirmationMessage ?? ""}
          aria-invalid={errors?.confirmationMessage ? true : undefined}
          aria-describedby={
            errors?.confirmationMessage
              ? "form-confirmation-error"
              : undefined
          }
          className={fieldClassName(Boolean(errors?.confirmationMessage))}
          placeholder="ثبت‌نام شما با موفقیت دریافت شد."
        />
        {errors?.confirmationMessage ? (
          <p
            id="form-confirmation-error"
            className="mt-1.5 text-sm text-red-700"
          >
            {errors.confirmationMessage}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/forms"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-secondary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          بازگشت به فرم‌ها
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "در حال ساخت..." : "ساخت فرم"}
        </button>
      </div>
    </form>
  );
}
