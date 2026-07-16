"use client";

import { Suspense, useActionState, useEffect, useId, useMemo, useState } from "react";
import {
  submitPublicFormAction,
  type SubmitPublicFormState,
} from "@/app/forms/[slug]/actions";
import { FormBookingGate } from "@/components/forms/FormBookingGate";
import { PublicFormField } from "@/components/forms/PublicFormField";
import {
  evaluateAllFieldVisibility,
  type VisibilityAnswerValue,
} from "@/lib/forms/field-visibility";
import type { PublicFormData } from "@/lib/forms/load-public-form";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";
import { toPersianDigits } from "@/lib/persian";
import { FormFieldType } from "@/generated/prisma/enums";

type PublicFormProps = {
  data: PublicFormData;
  /** Unique prefix for DOM ids when multiple forms render on one page. */
  instanceId?: string;
  /** Optional redirect override after successful submit (embedded flows). */
  successMode?: "redirect" | "inline";
  displayMode?: "full" | "embedded" | "compact";
};

const initialState: SubmitPublicFormState = {};

function readFormAnswers(
  form: HTMLFormElement,
  fields: PublicFormData["fields"],
): Record<string, VisibilityAnswerValue> {
  const formData = new FormData(form);
  const answers: Record<string, VisibilityAnswerValue> = {};

  for (const field of fields) {
    if (field.type === FormFieldType.INFORMATIONAL) {
      continue;
    }
    if (field.type === FormFieldType.MULTIPLE_CHOICE) {
      answers[field.fieldKey] = formData
        .getAll(field.fieldKey)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }
    if (field.type === FormFieldType.CONSENT) {
      const raw = formData.get(field.fieldKey);
      answers[field.fieldKey] =
        raw === "yes" || raw === "on" || raw === "true";
      continue;
    }
    const raw = formData.get(field.fieldKey);
    answers[field.fieldKey] = typeof raw === "string" ? raw.trim() : "";
  }

  return answers;
}

/**
 * Public published-form submit UI.
 * No Prisma imports — server action handles all writes.
 */
export function PublicForm({
  data,
  instanceId,
  displayMode = "full",
}: PublicFormProps) {
  const reactId = useId();
  const idPrefix = instanceId ?? `pf-${reactId.replace(/:/g, "")}`;

  const action = useMemo(
    () => submitPublicFormAction.bind(null, data.form.slug),
    [data.form.slug],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const loadedAt = useMemo(() => String(Date.now()), []);

  const [answers, setAnswers] = useState<Record<string, VisibilityAnswerValue>>(
    () => (state.values as Record<string, VisibilityAnswerValue> | undefined) ?? {},
  );

  useEffect(() => {
    if (state.values) {
      setAnswers(state.values as Record<string, VisibilityAnswerValue>);
    }
  }, [state.values]);

  const visibilityResult = useMemo(
    () =>
      evaluateAllFieldVisibility({
        fields: data.fields.map((field) => ({
          fieldKey: field.fieldKey,
          type: field.type,
          visibilityConditions: field.visibilityConditions,
          config: field.config,
        })),
        answers,
      }),
    [answers, data.fields],
  );

  const visibleMap =
    visibilityResult.ok
      ? visibilityResult.visible
      : Object.fromEntries(data.fields.map((field) => [field.fieldKey, true]));

  useEffect(() => {
    if (!visibilityResult.ok) {
      return;
    }
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const field of data.fields) {
        if (!visibilityResult.visible[field.fieldKey] && field.fieldKey in next) {
          delete next[field.fieldKey];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [visibilityResult, data.fields]);

  const fieldErrorList = state.fieldErrors
    ? Object.entries(state.fieldErrors).filter(([key]) => visibleMap[key] !== false)
    : [];

  const showRemaining =
    data.availability.showRemainingCapacity &&
    data.availability.remainingCapacity != null;

  const compact = displayMode === "compact";

  return (
    <form
      action={formAction}
      className={`relative ${compact ? "space-y-4" : "space-y-6"}`}
      noValidate
      onChange={(event) => {
        const form = event.currentTarget;
        setAnswers(readFormAnswers(form, data.fields));
      }}
    >
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor={`${idPrefix}-company_url`}>نام شرکت</label>
        <input
          id={`${idPrefix}-company_url`}
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

      {!visibilityResult.ok ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {visibilityResult.error}
        </div>
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

      <div className={compact ? "space-y-4" : "space-y-5"}>
        {data.fields.map((field, index) => {
          const isVisible = visibleMap[field.fieldKey] !== false;
          if (!isVisible) {
            return null;
          }

          const preserved = answers[field.fieldKey] as
            | PreservedFieldValue
            | undefined;

          return (
            <div
              key={field.id}
              className="public-form-field transition-opacity duration-200 ease-out"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <PublicFormField
                field={field}
                error={state.fieldErrors?.[field.fieldKey]}
                defaultValue={
                  preserved ?? state.values?.[field.fieldKey]
                }
                disabled={pending}
                idPrefix={idPrefix}
              />
            </div>
          );
        })}
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
