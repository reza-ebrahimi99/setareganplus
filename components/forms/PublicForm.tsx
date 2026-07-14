"use client";

import { Suspense, useActionState, useMemo } from "react";
import {
  submitPublicFormAction,
  type SubmitPublicFormState,
} from "@/app/forms/[slug]/actions";
import { FormBookingGate } from "@/components/forms/FormBookingGate";
import { PublicFormField } from "@/components/forms/PublicFormField";
import type { PublicFormData } from "@/lib/forms/load-public-form";
import { toPersianDigits } from "@/lib/persian";

type PublicFormProps = {
  data: PublicFormData;
};

const initialState: SubmitPublicFormState = {};

/**
 * Public published-form submit UI.
 * No Prisma imports — server action handles all writes.
 */
export function PublicForm({ data }: PublicFormProps) {
  const action = useMemo(
    () => submitPublicFormAction.bind(null, data.form.slug),
    [data.form.slug],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const loadedAt = useMemo(() => String(Date.now()), []);

  const fieldErrorList = state.fieldErrors
    ? Object.entries(state.fieldErrors)
    : [];

  const showRemaining =
    data.availability.showRemainingCapacity &&
    data.availability.remainingCapacity != null;

  return (
    <form action={formAction} className="relative space-y-6" noValidate>
      {/* Honeypot — leave empty. TODO(abuse): production rate limiting. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="company_url">نام شرکت</label>
        <input
          id="company_url"
          name="company_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input type="hidden" name="_formLoadedAt" value={loadedAt} />

      <Suspense fallback={null}>
        <FormBookingGate
          formSlug={data.form.slug}
          settings={data.booking.settings}
          serviceSlug={data.booking.serviceSlug}
          serviceTitle={data.booking.serviceTitle}
        />
      </Suspense>

      {showRemaining ? (
        <p
          className="rounded-xl border border-secondary/25 bg-secondary/10 px-4 py-3 text-sm font-medium text-primary"
          role="status"
        >
          ظرفیت باقی‌مانده:{" "}
          {toPersianDigits(data.availability.remainingCapacity ?? 0)} نفر
        </p>
      ) : null}

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          <p>{state.formError}</p>
          {fieldErrorList.length > 0 ? (
            <ul className="mt-2 list-disc pr-5">
              {fieldErrorList.map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-5">
        {data.fields.map((field, index) => (
          <div
            key={field.id}
            className="public-form-field"
            style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
          >
            <PublicFormField
              field={field}
              error={state.fieldErrors?.[field.fieldKey]}
              defaultValue={state.values?.[field.fieldKey]}
              disabled={pending}
            />
          </div>
        ))}
      </div>

      <div className="public-form-submit-bar border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-3"
        >
          {pending ? (
            <>
              <span className="public-form-spinner" aria-hidden="true" />
              <span>در حال ثبت…</span>
            </>
          ) : (
            "ثبت پاسخ"
          )}
        </button>
        <p className="mt-3 text-xs leading-6 text-muted">
          با ارسال فرم، اطلاعات شما مطابق قوانین مرکز آموزشی ثبت می‌شود.
        </p>
      </div>
    </form>
  );
}
