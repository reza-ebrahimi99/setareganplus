"use client";

import {
  Suspense,
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  submitPublicFormAction,
  type SubmitPublicFormState,
} from "@/app/forms/[slug]/actions";
import { FormBookingGate } from "@/components/forms/FormBookingGate";
import { PublicFormField } from "@/components/forms/PublicFormField";
import { FormFieldType } from "@/generated/prisma/enums";
import { buildRegistrationWizardPanels } from "@/lib/forms/build-registration-wizard-panels";
import {
  evaluateAllFieldVisibility,
  type VisibilityAnswerValue,
} from "@/lib/forms/field-visibility";
import type { PublicFormData } from "@/lib/forms/load-public-form";
import { toPersianDigits } from "@/lib/persian";
import { validatePublicStepFields } from "@/lib/forms/validate-public-step";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";

type PublicRegistrationWizardProps = {
  data: PublicFormData;
  instanceId?: string;
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

function preservedToHiddenValues(
  value: PreservedFieldValue | VisibilityAnswerValue | undefined,
): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "boolean") {
    return value ? ["yes"] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.length > 0);
  }
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return [];
}

function focusField(idPrefix: string, fieldKey: string) {
  const preferred = document.getElementById(
    `${idPrefix}-field-input-${fieldKey}`,
  );
  if (preferred instanceof HTMLElement) {
    preferred.focus();
    preferred.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const fallback = document.getElementsByName(fieldKey)[0];
  if (fallback instanceof HTMLElement) {
    fallback.focus();
    fallback.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Multi-step public registration wizard for FormMode.REGISTRATION.
 * Final submit reuses submitPublicFormAction unchanged.
 */
export function PublicRegistrationWizard({
  data,
  instanceId,
  displayMode = "full",
}: PublicRegistrationWizardProps) {
  const reactId = useId();
  const idPrefix = instanceId ?? `rw-${reactId.replace(/:/g, "")}`;
  const formRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const panels = useMemo(
    () => buildRegistrationWizardPanels(data.steps, data.fields),
    [data.steps, data.fields],
  );

  const [panelIndex, setPanelIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [stepFormError, setStepFormError] = useState<string | null>(null);
  const [ackedServerErrorKey, setAckedServerErrorKey] = useState("");

  const action = useMemo(
    () => submitPublicFormAction.bind(null, data.form.slug),
    [data.form.slug],
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const [loadedAt] = useState(() => String(Date.now()));

  const [answers, setAnswers] = useState<Record<string, VisibilityAnswerValue>>(
    {},
  );

  const effectiveAnswers = useMemo(() => {
    const fromServer = (state.values ?? {}) as Record<
      string,
      VisibilityAnswerValue
    >;
    return { ...fromServer, ...answers };
  }, [answers, state.values]);

  const serverErrorKey = state.fieldErrors
    ? Object.keys(state.fieldErrors).sort().join("|")
    : "";

  const serverErrorPanelIndex = useMemo(() => {
    if (!state.fieldErrors) {
      return null;
    }
    const firstKey = Object.keys(state.fieldErrors)[0];
    if (!firstKey) {
      return null;
    }
    const targetIndex = panels.findIndex((panel) =>
      panel.fields.some((field) => field.fieldKey === firstKey),
    );
    return targetIndex >= 0 ? targetIndex : null;
  }, [state.fieldErrors, panels]);

  const followServerErrorPanel =
    Boolean(serverErrorKey) &&
    serverErrorKey !== ackedServerErrorKey &&
    serverErrorPanelIndex != null;

  const safeIndex = Math.min(
    followServerErrorPanel ? serverErrorPanelIndex : panelIndex,
    Math.max(panels.length - 1, 0),
  );
  const currentPanel = panels[safeIndex] ?? panels[0];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex >= panels.length - 1;
  const progressPercent =
    panels.length <= 1
      ? 100
      : Math.round(((safeIndex + 1) / panels.length) * 100);

  const visibilityResult = useMemo(
    () =>
      evaluateAllFieldVisibility({
        fields: data.fields.map((field) => ({
          fieldKey: field.fieldKey,
          type: field.type,
          visibilityConditions: field.visibilityConditions,
          config: field.config,
        })),
        answers: effectiveAnswers,
      }),
    [effectiveAnswers, data.fields],
  );

  const visibleMap = visibilityResult.ok
    ? visibilityResult.visible
    : Object.fromEntries(data.fields.map((field) => [field.fieldKey, true]));

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [safeIndex]);

  useEffect(() => {
    if (!state.fieldErrors) {
      return;
    }
    const firstKey = Object.keys(state.fieldErrors)[0];
    if (!firstKey) {
      return;
    }
    const timer = window.setTimeout(() => {
      focusField(idPrefix, firstKey);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [state.fieldErrors, idPrefix, safeIndex]);

  const fieldErrorList = state.fieldErrors
    ? Object.entries(state.fieldErrors).filter(
        ([key]) => visibleMap[key] !== false,
      )
    : [];

  const showRemaining =
    data.availability.showRemainingCapacity &&
    data.availability.remainingCapacity != null;

  const compact = displayMode === "compact";
  const currentFieldKeys = useMemo(
    () => new Set(currentPanel.fields.map((field) => field.fieldKey)),
    [currentPanel.fields],
  );

  const mergedFieldErrors = {
    ...stepErrors,
    ...(state.fieldErrors ?? {}),
  };

  const reachedIndex = Math.max(maxReachedIndex, safeIndex);

  function syncAnswersFromForm() {
    const form = formRef.current;
    if (!form) {
      return;
    }
    setAnswers(readFormAnswers(form, data.fields));
  }

  function handleNext() {
    const form = formRef.current;
    if (!form || !currentPanel) {
      return;
    }

    const formData = new FormData(form);
    const result = validatePublicStepFields({
      allFields: data.fields,
      stepFieldKeys: currentFieldKeys,
      formData,
    });

    syncAnswersFromForm();

    if (!result.ok) {
      setStepErrors(result.fieldErrors);
      setStepFormError(result.formError);
      if (result.firstInvalidFieldKey) {
        focusField(idPrefix, result.firstInvalidFieldKey);
      }
      return;
    }

    setStepErrors({});
    setStepFormError(null);
    setAnswers((prev) => ({ ...prev, ...result.values }));

    const nextIndex = Math.min(safeIndex + 1, panels.length - 1);
    setAckedServerErrorKey(serverErrorKey);
    setPanelIndex(nextIndex);
    setMaxReachedIndex((prev) => Math.max(prev, nextIndex));
  }

  function handlePrevious() {
    setStepErrors({});
    setStepFormError(null);
    syncAnswersFromForm();
    setAckedServerErrorKey(serverErrorKey);
    setPanelIndex(Math.max(safeIndex - 1, 0));
  }

  function handleSubmitAttempt(event: FormEvent<HTMLFormElement>) {
    if (!isLast) {
      event.preventDefault();
      handleNext();
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = validatePublicStepFields({
      allFields: data.fields,
      stepFieldKeys: currentFieldKeys,
      formData,
    });

    if (!result.ok) {
      event.preventDefault();
      setStepErrors(result.fieldErrors);
      setStepFormError(result.formError);
      if (result.firstInvalidFieldKey) {
        focusField(idPrefix, result.firstInvalidFieldKey);
      }
    }
  }

  const otherFields = data.fields.filter(
    (field) => !currentFieldKeys.has(field.fieldKey),
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className={`relative ${compact ? "space-y-4" : "space-y-6"} pb-28 sm:pb-8`}
      noValidate
      onChange={(event) => {
        setAnswers(readFormAnswers(event.currentTarget, data.fields));
      }}
      onSubmit={handleSubmitAttempt}
    >
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
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

      <div
        className="space-y-3 rounded-xl border border-border bg-background px-4 py-4"
        aria-label="پیشرفت ثبت‌نام"
      >
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-primary">
            مرحله {toPersianDigits(safeIndex + 1)} از{" "}
            {toPersianDigits(panels.length)}
          </p>
          <p className="text-muted" aria-hidden="true">
            {toPersianDigits(progressPercent)}٪
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={panels.length}
          aria-valuenow={safeIndex + 1}
          aria-label={`پیشرفت ثبت‌نام: مرحله ${toPersianDigits(safeIndex + 1)} از ${toPersianDigits(panels.length)}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {panels.length > 1 ? (
          <ol className="flex flex-wrap gap-2" aria-hidden="true">
            {panels.map((panel, index) => {
              const reached = index <= reachedIndex;
              const active = index === safeIndex;
              return (
                <li
                  key={panel.id}
                  className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium ${
                    active
                      ? "bg-primary text-white"
                      : reached
                        ? "bg-secondary/20 text-primary"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {toPersianDigits(index + 1)}
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      <div className="space-y-2">
        <h2
          ref={stepHeadingRef}
          tabIndex={-1}
          id={`${idPrefix}-step-title`}
          className="text-lg font-semibold text-primary outline-none"
        >
          {currentPanel.title}
        </h2>
        {currentPanel.description ? (
          <p className="text-sm leading-7 text-muted">
            {currentPanel.description}
          </p>
        ) : null}
      </div>

      {!visibilityResult.ok ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {visibilityResult.error}
        </div>
      ) : null}

      {stepFormError || state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          <p>{stepFormError ?? state.formError}</p>
          {fieldErrorList.length > 0 ? (
            <ul className="mt-2 list-disc pr-5">
              {fieldErrorList.map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {otherFields.map((field) => {
        if (field.type === FormFieldType.INFORMATIONAL) {
          return null;
        }
        if (visibleMap[field.fieldKey] === false) {
          return null;
        }
        const raw = effectiveAnswers[field.fieldKey] as
          | PreservedFieldValue
          | VisibilityAnswerValue
          | undefined;
        const values = preservedToHiddenValues(raw);
        if (values.length === 0) {
          return null;
        }
        return values.map((value, index) => (
          <input
            key={`${field.id}-hidden-${index}`}
            type="hidden"
            name={field.fieldKey}
            value={value}
          />
        ));
      })}

      <div
        className={compact ? "space-y-4" : "space-y-5"}
        role="group"
        aria-labelledby={`${idPrefix}-step-title`}
      >
        {currentPanel.fields.map((field, index) => {
          const isVisible = visibleMap[field.fieldKey] !== false;
          if (!isVisible) {
            return null;
          }
          const preserved = effectiveAnswers[field.fieldKey] as
            | PreservedFieldValue
            | undefined;

          return (
            <div
              key={`${currentPanel.id}-${field.id}`}
              className="public-form-field transition-opacity duration-200 ease-out"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <PublicFormField
                field={field}
                error={mergedFieldErrors[field.fieldKey]}
                defaultValue={preserved ?? state.values?.[field.fieldKey]}
                disabled={pending}
                idPrefix={idPrefix}
              />
            </div>
          );
        })}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:z-auto sm:border-t sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
        role="navigation"
        aria-label="ناوبری مراحل ثبت‌نام"
      >
        <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirst || pending}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-medium text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            قبلی
          </button>

          {isLast ? (
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {pending ? (
                <>
                  <span className="public-form-spinner" aria-hidden="true" />
                  <span>در حال ثبت…</span>
                </>
              ) : (
                "ارسال ثبت‌نام"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              بعدی
            </button>
          )}
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs leading-6 text-muted sm:text-start">
          با ارسال فرم، اطلاعات شما مطابق قوانین مرکز آموزشی ثبت می‌شود.
        </p>
      </div>
    </form>
  );
}
