"use client";

import { useMemo, useRef } from "react";
import { PublicFormField } from "@/components/forms/PublicFormField";
import { FormFieldType } from "@/generated/prisma/enums";
import {
  evaluateAllFieldVisibility,
  type VisibilityAnswerValue,
} from "@/lib/forms/field-visibility";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";
import { validatePublicStepFields } from "@/lib/forms/validate-public-step";
import {
  buildCustomFormPanels,
  type RegistrationLinkedFormView,
} from "@/lib/registration/form-bridge";

type Props = {
  linkedForm: RegistrationLinkedFormView;
  answers: Record<string, PreservedFieldValue>;
  errors: Record<string, string>;
  formId?: string;
  onAnswersChange: (answers: Record<string, PreservedFieldValue>) => void;
};

function readAnswersFromFormData(
  formData: FormData,
  fieldKeys: string[],
  fieldsByKey: Map<string, { type: FormFieldType }>,
): Record<string, PreservedFieldValue> {
  const answers: Record<string, PreservedFieldValue> = {};
  for (const key of fieldKeys) {
    const field = fieldsByKey.get(key);
    if (!field) continue;
    if (field.type === FormFieldType.MULTIPLE_CHOICE) {
      answers[key] = formData
        .getAll(key)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }
    if (field.type === FormFieldType.CONSENT) {
      const raw = formData.get(key);
      answers[key] = raw === "yes" || raw === "on" || raw === "true";
      continue;
    }
    const raw = formData.get(key);
    answers[key] = typeof raw === "string" ? raw : "";
  }
  return answers;
}

export function RegistrationFormQuestionsStep({
  linkedForm,
  answers,
  errors,
  formId = "registration-linked-form",
  onAnswersChange,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const panels = useMemo(
    () => buildCustomFormPanels(linkedForm),
    [linkedForm],
  );
  const idPrefix = useMemo(
    () => `reg-form-${linkedForm.formId.slice(0, 8)}`,
    [linkedForm.formId],
  );

  const fieldsByKey = useMemo(() => {
    const map = new Map<string, { type: FormFieldType }>();
    for (const field of linkedForm.customFields) {
      map.set(field.fieldKey, { type: field.type });
    }
    return map;
  }, [linkedForm.customFields]);

  const visibility = useMemo(() => {
    const visibilityAnswers: Record<string, VisibilityAnswerValue> = {};
    for (const [key, value] of Object.entries(answers)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        visibilityAnswers[key] = JSON.stringify(value);
      } else {
        visibilityAnswers[key] = value as VisibilityAnswerValue;
      }
    }
    return evaluateAllFieldVisibility({
      fields: linkedForm.customFields.map((field) => ({
        fieldKey: field.fieldKey,
        sortOrder: field.sortOrder,
        type: field.type,
        label: field.label,
        config: field.config,
        visibilityConditions: field.visibilityConditions,
      })),
      answers: visibilityAnswers,
    });
  }, [answers, linkedForm.customFields]);

  function syncFromDom() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    onAnswersChange(
      readAnswersFromFormData(
        formData,
        linkedForm.customFields.map((field) => field.fieldKey),
        fieldsByKey,
      ),
    );
  }

  if (linkedForm.customFields.length === 0) {
    return (
      <section className="space-y-3 rounded-3xl border border-white/60 bg-white/80 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-primary">فرم تکمیلی</h2>
        <p className="text-sm text-muted">
          این جریان به فرم «{linkedForm.title}» متصل است؛ سؤال سفارشی فعالی برای
          نمایش وجود ندارد (سؤال‌های سیستمی در مراحل هویت جمع می‌شوند).
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-3xl border border-white/60 bg-white/80 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-primary">فرم تکمیلی</h2>
        <p className="mt-1 text-sm text-muted">
          سؤال‌ها از Form Builder («{linkedForm.title}») بارگذاری شده‌اند — ترتیب،
          الزامی بودن، راهنما و شرط نمایش از همانجا می‌آید.
        </p>
      </div>

      {!visibility.ok ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {visibility.error}
        </p>
      ) : null}

      <form
        id={formId}
        ref={formRef}
        className="space-y-5"
        onChange={syncFromDom}
        onInput={syncFromDom}
      >
        {panels.map((panel) => (
          <div key={panel.id} className="space-y-4">
            {panels.length > 1 ? (
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  {panel.title}
                </h3>
                {panel.description ? (
                  <p className="mt-1 text-xs text-muted">{panel.description}</p>
                ) : null}
              </div>
            ) : null}
            {panel.fields.map((field) => {
              if (visibility.ok && !visibility.visible[field.fieldKey]) {
                return (
                  <input
                    key={field.id}
                    type="hidden"
                    name={field.fieldKey}
                    value=""
                  />
                );
              }
              const publicField = linkedForm.customFields.find(
                (item) => item.fieldKey === field.fieldKey,
              );
              if (!publicField) return null;
              return (
                <PublicFormField
                  key={field.id}
                  field={publicField}
                  error={errors[field.fieldKey]}
                  idPrefix={idPrefix}
                  defaultValue={answers[field.fieldKey]}
                  formSlug={linkedForm.formSlug}
                />
              );
            })}
          </div>
        ))}
      </form>
    </section>
  );
}

export function validateRegistrationFormAnswers(
  linkedForm: RegistrationLinkedFormView,
  answers: Record<string, PreservedFieldValue>,
):
  | { ok: true; values: Record<string, PreservedFieldValue> }
  | { ok: false; fieldErrors: Record<string, string>; formError: string } {
  const formData = new FormData();
  for (const [key, value] of Object.entries(answers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, item);
      continue;
    }
    if (typeof value === "boolean") {
      if (value) formData.set(key, "yes");
      continue;
    }
    if (typeof value === "object") {
      formData.set(key, JSON.stringify(value));
      continue;
    }
    formData.set(key, String(value));
  }

  const allFields = linkedForm.customFields
    .filter((field) => field.type !== FormFieldType.INFORMATIONAL)
    .map((field) => ({
      id: field.id,
      fieldKey: field.fieldKey,
      type: field.type,
      label: field.label,
      required: field.required,
      config: field.config,
      visibilityConditions: field.visibilityConditions,
    }));

  const result = validatePublicStepFields({
    allFields,
    stepFieldKeys: new Set(allFields.map((field) => field.fieldKey)),
    formData,
  });

  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: result.fieldErrors,
      formError: result.formError,
    };
  }
  return { ok: true, values: result.values };
}
