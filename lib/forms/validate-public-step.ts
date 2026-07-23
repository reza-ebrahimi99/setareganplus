import {
  FormFieldType,
  type FormFieldType as FormFieldTypeValue,
} from "@/generated/prisma/enums";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import {
  evaluateAllFieldVisibility,
  type VisibilityAnswerValue,
} from "@/lib/forms/field-visibility";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";

/**
 * Client-safe step validation (no Prisma).
 * Final submit still uses validatePublicSubmission on the server.
 */

export type StepFieldDefinition = {
  id: string;
  fieldKey: string;
  type: FormFieldTypeValue;
  label: string;
  required: boolean;
  config: unknown;
  visibilityConditions?: unknown;
};

export type ValidatePublicStepResult =
  | { ok: true; values: Record<string, PreservedFieldValue> }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      formError: string;
      values: Record<string, PreservedFieldValue>;
      firstInvalidFieldKey: string | null;
    };

const LIMITS = {
  SHORT_TEXT: 300,
  SCHOOL_NAME: 300,
  LONG_TEXT: 5000,
  MOBILE: 20,
  CHOICE_VALUE: 80,
} as const;

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function readSingle(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readMany(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function optionValues(config: unknown): Set<string> | null {
  const parsed = readChoiceConfig(config);
  if (!parsed) {
    return null;
  }
  return new Set(parsed.options.map((option) => option.value));
}

function readRawAnswerForVisibility(
  field: StepFieldDefinition,
  formData: FormData,
): VisibilityAnswerValue {
  if (field.type === FormFieldType.INFORMATIONAL) {
    return undefined;
  }
  if (field.type === FormFieldType.MULTIPLE_CHOICE) {
    return Array.from(new Set(readMany(formData, field.fieldKey)));
  }
  if (field.type === FormFieldType.CONSENT) {
    return (
      formData.get(field.fieldKey) === "yes" ||
      formData.get(field.fieldKey) === "on" ||
      formData.get(field.fieldKey) === "true"
    );
  }
  return readSingle(formData, field.fieldKey).trim();
}

/**
 * Validates only the fields in `stepFieldKeys` (current wizard panel).
 * Uses all `allFields` + FormData for visibility evaluation.
 */
export function validatePublicStepFields(params: {
  allFields: readonly StepFieldDefinition[];
  stepFieldKeys: ReadonlySet<string>;
  formData: FormData;
}): ValidatePublicStepResult {
  const { allFields, stepFieldKeys, formData } = params;
  const fieldErrors: Record<string, string> = {};
  const values: Record<string, PreservedFieldValue> = {};

  const rawAnswers: Record<string, VisibilityAnswerValue> = {};
  for (const field of allFields) {
    rawAnswers[field.fieldKey] = readRawAnswerForVisibility(field, formData);
  }

  const visibility = evaluateAllFieldVisibility({
    fields: allFields.map((field) => ({
      fieldKey: field.fieldKey,
      type: field.type,
      visibilityConditions: field.visibilityConditions ?? null,
      config: field.config,
    })),
    answers: rawAnswers,
  });

  if (!visibility.ok) {
    return {
      ok: false,
      fieldErrors: {},
      formError: visibility.error,
      values: {},
      firstInvalidFieldKey: null,
    };
  }

  for (const field of allFields) {
    if (!stepFieldKeys.has(field.fieldKey)) {
      continue;
    }
    if (field.type === FormFieldType.INFORMATIONAL) {
      continue;
    }
    if (!visibility.visible[field.fieldKey]) {
      continue;
    }

    if (field.type === FormFieldType.MULTIPLE_CHOICE) {
      const selected = Array.from(new Set(readMany(formData, field.fieldKey)));
      values[field.fieldKey] = selected;
      if (field.required && selected.length === 0) {
        fieldErrors[field.fieldKey] =
          `انتخاب حداقل یک گزینه برای «${field.label}» الزامی است.`;
        continue;
      }
      if (selected.length === 0) {
        continue;
      }
      const allowed = optionValues(field.config);
      if (
        !allowed ||
        selected.some(
          (value) => value.length > LIMITS.CHOICE_VALUE || !allowed.has(value),
        )
      ) {
        fieldErrors[field.fieldKey] =
          `گزینه انتخاب‌شده برای «${field.label}» معتبر نیست.`;
      }
      continue;
    }

    if (field.type === FormFieldType.CONSENT) {
      const checked =
        formData.get(field.fieldKey) === "yes" ||
        formData.get(field.fieldKey) === "on" ||
        formData.get(field.fieldKey) === "true";
      values[field.fieldKey] = checked;
      if (field.required && !checked) {
        fieldErrors[field.fieldKey] = `پذیرش «${field.label}» الزامی است.`;
      }
      continue;
    }

    const raw = readSingle(formData, field.fieldKey);
    const trimmed = raw.trim();
    values[field.fieldKey] = trimmed;

    if (field.required && isBlank(trimmed)) {
      fieldErrors[field.fieldKey] = `«${field.label}» الزامی است.`;
      continue;
    }
    if (isBlank(trimmed)) {
      continue;
    }

    switch (field.type) {
      case FormFieldType.SHORT_TEXT:
      case FormFieldType.SCHOOL_NAME:
        if (trimmed.length > LIMITS.SHORT_TEXT) {
          fieldErrors[field.fieldKey] =
            `«${field.label}» نباید بیشتر از ${LIMITS.SHORT_TEXT} کاراکتر باشد.`;
        }
        break;
      case FormFieldType.LONG_TEXT:
        if (trimmed.length > LIMITS.LONG_TEXT) {
          fieldErrors[field.fieldKey] =
            `«${field.label}» نباید بیشتر از ${LIMITS.LONG_TEXT} کاراکتر باشد.`;
        }
        break;
      case FormFieldType.MOBILE: {
        if (raw.length > LIMITS.MOBILE + 10) {
          fieldErrors[field.fieldKey] = `«${field.label}» بیش از حد طولانی است.`;
          break;
        }
        const mobileResult = normalizeIranianMobile(raw);
        if (!mobileResult.ok) {
          fieldErrors[field.fieldKey] = mobileResult.error;
          break;
        }
        values[field.fieldKey] = mobileResult.normalized;
        break;
      }
      case FormFieldType.EMAIL: {
        const emailResult = normalizeEmail(raw);
        if (!emailResult.ok) {
          fieldErrors[field.fieldKey] = emailResult.error;
          break;
        }
        values[field.fieldKey] = emailResult.email;
        break;
      }
      case FormFieldType.NATIONAL_ID: {
        const nationalIdResult = validateIranianNationalId(raw);
        if (!nationalIdResult.ok) {
          fieldErrors[field.fieldKey] = nationalIdResult.error;
          break;
        }
        values[field.fieldKey] = nationalIdResult.normalized;
        break;
      }
      case FormFieldType.NUMBER: {
        const parsed = Number(trimmed.replace(/,/g, ""));
        if (!Number.isFinite(parsed)) {
          fieldErrors[field.fieldKey] = `«${field.label}» باید عدد معتبر باشد.`;
        }
        break;
      }
      case FormFieldType.DATE: {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          fieldErrors[field.fieldKey] = `تاریخ «${field.label}» معتبر نیست.`;
          break;
        }
        const date = new Date(`${trimmed}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime())) {
          fieldErrors[field.fieldKey] = `تاریخ «${field.label}» معتبر نیست.`;
        }
        break;
      }
      case FormFieldType.SINGLE_CHOICE:
      case FormFieldType.DROPDOWN: {
        const allowed = optionValues(field.config);
        if (
          !allowed ||
          !allowed.has(trimmed) ||
          trimmed.length > LIMITS.CHOICE_VALUE
        ) {
          fieldErrors[field.fieldKey] =
            `گزینه انتخاب‌شده برای «${field.label}» معتبر نیست.`;
        }
        break;
      }
      case FormFieldType.GRADE:
      case FormFieldType.ACADEMIC_TRACK: {
        const allowed = optionValues(field.config);
        if (allowed) {
          if (!allowed.has(trimmed) || trimmed.length > LIMITS.CHOICE_VALUE) {
            fieldErrors[field.fieldKey] = `مقدار «${field.label}» معتبر نیست.`;
          }
        } else if (trimmed.length > LIMITS.SHORT_TEXT) {
          fieldErrors[field.fieldKey] = `«${field.label}» بیش از حد طولانی است.`;
        }
        break;
      }
      default:
        fieldErrors[field.fieldKey] =
          `نوع فیلد «${field.label}» پشتیبانی نمی‌شود.`;
    }
  }

  const errorKeys = Object.keys(fieldErrors);
  if (errorKeys.length > 0) {
    return {
      ok: false,
      fieldErrors,
      formError: "لطفاً خطاهای این مرحله را برطرف کنید.",
      values,
      firstInvalidFieldKey: errorKeys[0] ?? null,
    };
  }

  return { ok: true, values };
}
