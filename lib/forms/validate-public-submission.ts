import { FormFieldType, type FormFieldType as FormFieldTypeValue } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import {
  evaluateAllFieldVisibility,
  type VisibilityAnswerValue,
} from "@/lib/forms/field-visibility";
import {
  parseFormFileUploadAnswerFromFormValue,
  readFileUploadConfig,
  type FormFileUploadAnswer,
} from "@/lib/forms/file-upload-config";
import { normalizeEmail } from "@/lib/forms/normalize-email";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { validateIranianNationalId } from "@/lib/forms/validate-national-id";

export type SubmissionFieldDefinition = {
  id: string;
  fieldKey: string;
  type: FormFieldTypeValue;
  label: string;
  required: boolean;
  config: unknown;
  visibilityConditions?: unknown;
};

export type PreservedFieldValue =
  | string
  | string[]
  | boolean
  | FormFileUploadAnswer;

export type ValidatedAnswerRow = {
  fieldId: string;
  fieldKey: string;
  valueText?: string | null;
  valueLongText?: string | null;
  valueNumber?: Prisma.Decimal | null;
  valueDate?: Date | null;
  valueJson?: Prisma.InputJsonValue | null;
};

export type ValidatePublicSubmissionResult =
  | {
      ok: true;
      answers: ValidatedAnswerRow[];
      mobileRaw: string | null;
      mobile: string | null;
      normalizedMobile: string | null;
      email: string | null;
      values: Record<string, PreservedFieldValue>;
    }
  | {
      ok: false;
      fieldErrors: Record<string, string>;
      formError?: string;
      values: Record<string, PreservedFieldValue>;
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

function gradeOrTrackOptions(config: unknown): Set<string> | null {
  const parsed = readChoiceConfig(config);
  if (!parsed) {
    return null;
  }
  return new Set(parsed.options.map((option) => option.value));
}

function readRawAnswerForVisibility(
  field: SubmissionFieldDefinition,
  formData: FormData,
): VisibilityAnswerValue {
  if (field.type === FormFieldType.INFORMATIONAL) {
    return undefined;
  }
  if (field.type === FormFieldType.FILE_UPLOAD) {
    const raw = readSingle(formData, field.fieldKey).trim();
    const parsed = parseFormFileUploadAnswerFromFormValue(raw);
    return parsed && parsed.files.length > 0 ? raw : "";
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
 * Validates FormData against the published FormField definitions only.
 * Unknown keys are ignored. INFORMATIONAL creates no answer row.
 * Hidden fields (visibilityConditions) are ignored and never stored.
 */
export function validatePublicSubmission(
  fields: SubmissionFieldDefinition[],
  formData: FormData,
): ValidatePublicSubmissionResult {
  const fieldErrors: Record<string, string> = {};
  const values: Record<string, PreservedFieldValue> = {};
  const answers: ValidatedAnswerRow[] = [];

  let mobileRaw: string | null = null;
  let mobile: string | null = null;
  let normalizedMobile: string | null = null;
  let email: string | null = null;

  const rawAnswers: Record<string, VisibilityAnswerValue> = {};
  for (const field of fields) {
    rawAnswers[field.fieldKey] = readRawAnswerForVisibility(field, formData);
  }

  const visibility = evaluateAllFieldVisibility({
    fields: fields.map((field) => ({
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
    };
  }

  for (const field of fields) {
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
        fieldErrors[field.fieldKey] = `انتخاب حداقل یک گزینه برای «${field.label}» الزامی است.`;
        continue;
      }

      if (selected.length === 0) {
        continue;
      }

      const allowed = optionValues(field.config);
      if (!allowed) {
        fieldErrors[field.fieldKey] = `گزینه‌های «${field.label}» نامعتبر است.`;
        continue;
      }

      if (selected.some((value) => value.length > LIMITS.CHOICE_VALUE || !allowed.has(value))) {
        fieldErrors[field.fieldKey] = `گزینه انتخاب‌شده برای «${field.label}» معتبر نیست.`;
        continue;
      }

      answers.push({
        fieldId: field.id,
        fieldKey: field.fieldKey,
        valueJson: selected,
      });
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
        continue;
      }

      if (!checked) {
        continue;
      }

      answers.push({
        fieldId: field.id,
        fieldKey: field.fieldKey,
        valueJson: true,
      });
      continue;
    }

    if (field.type === FormFieldType.FILE_UPLOAD) {
      const raw = readSingle(formData, field.fieldKey);
      const parsed = parseFormFileUploadAnswerFromFormValue(raw);
      const uploadConfig = readFileUploadConfig(field.config);

      if (!parsed || parsed.files.length === 0) {
        values[field.fieldKey] = { files: [] };
        if (field.required) {
          fieldErrors[field.fieldKey] =
            `بارگذاری فایل برای «${field.label}» الزامی است.`;
        }
        continue;
      }

      if (parsed.files.length > uploadConfig.maxFiles) {
        fieldErrors[field.fieldKey] =
          `حداکثر ${uploadConfig.maxFiles} فایل برای «${field.label}» مجاز است.`;
        values[field.fieldKey] = parsed;
        continue;
      }

      const invalidMime = parsed.files.some(
        (file) =>
          !uploadConfig.allowedMimeTypes.includes(
            file.mimeType as (typeof uploadConfig.allowedMimeTypes)[number],
          ),
      );
      if (invalidMime) {
        fieldErrors[field.fieldKey] =
          `نوع یکی از فایل‌های «${field.label}» مجاز نیست.`;
        values[field.fieldKey] = parsed;
        continue;
      }

      const oversized = parsed.files.some(
        (file) => file.byteSize > uploadConfig.maxBytes,
      );
      if (oversized) {
        fieldErrors[field.fieldKey] =
          `حجم یکی از فایل‌های «${field.label}» بیش از حد مجاز است.`;
        values[field.fieldKey] = parsed;
        continue;
      }

      values[field.fieldKey] = parsed;
      answers.push({
        fieldId: field.id,
        fieldKey: field.fieldKey,
        valueJson: parsed as unknown as Prisma.InputJsonValue,
      });
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
      case FormFieldType.SCHOOL_NAME: {
        if (trimmed.length > LIMITS.SHORT_TEXT) {
          fieldErrors[field.fieldKey] = `«${field.label}» نباید بیشتر از ${LIMITS.SHORT_TEXT} کاراکتر باشد.`;
          break;
        }
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueText: trimmed,
        });
        break;
      }
      case FormFieldType.LONG_TEXT: {
        if (trimmed.length > LIMITS.LONG_TEXT) {
          fieldErrors[field.fieldKey] = `«${field.label}» نباید بیشتر از ${LIMITS.LONG_TEXT} کاراکتر باشد.`;
          break;
        }
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueLongText: trimmed,
        });
        break;
      }
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
        mobileRaw = mobileResult.raw;
        mobile = mobileResult.normalized;
        normalizedMobile = mobileResult.normalized;
        values[field.fieldKey] = mobileResult.normalized;
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueText: mobileResult.normalized,
        });
        break;
      }
      case FormFieldType.EMAIL: {
        const emailResult = normalizeEmail(raw);
        if (!emailResult.ok) {
          fieldErrors[field.fieldKey] = emailResult.error;
          break;
        }
        email = emailResult.email;
        values[field.fieldKey] = emailResult.email;
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueText: emailResult.email,
        });
        break;
      }
      case FormFieldType.NATIONAL_ID: {
        const nationalIdResult = validateIranianNationalId(raw);
        if (!nationalIdResult.ok) {
          fieldErrors[field.fieldKey] = nationalIdResult.error;
          break;
        }
        values[field.fieldKey] = nationalIdResult.normalized;
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueText: nationalIdResult.normalized,
        });
        break;
      }
      case FormFieldType.NUMBER: {
        const parsed = Number(trimmed.replace(/,/g, ""));
        if (!Number.isFinite(parsed)) {
          fieldErrors[field.fieldKey] = `«${field.label}» باید عدد معتبر باشد.`;
          break;
        }
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueNumber: new Prisma.Decimal(parsed),
        });
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
          break;
        }
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueDate: date,
        });
        break;
      }
      case FormFieldType.SINGLE_CHOICE:
      case FormFieldType.DROPDOWN: {
        const allowed = optionValues(field.config);
        if (!allowed || !allowed.has(trimmed) || trimmed.length > LIMITS.CHOICE_VALUE) {
          fieldErrors[field.fieldKey] = `گزینه انتخاب‌شده برای «${field.label}» معتبر نیست.`;
          break;
        }
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueText: trimmed,
        });
        break;
      }
      case FormFieldType.GRADE:
      case FormFieldType.ACADEMIC_TRACK: {
        const allowed = gradeOrTrackOptions(field.config);
        if (allowed) {
          if (!allowed.has(trimmed) || trimmed.length > LIMITS.CHOICE_VALUE) {
            fieldErrors[field.fieldKey] = `مقدار «${field.label}» معتبر نیست.`;
            break;
          }
        } else if (trimmed.length > LIMITS.SHORT_TEXT) {
          fieldErrors[field.fieldKey] = `«${field.label}» بیش از حد طولانی است.`;
          break;
        }
        answers.push({
          fieldId: field.id,
          fieldKey: field.fieldKey,
          valueText: trimmed,
        });
        break;
      }
      default: {
        fieldErrors[field.fieldKey] = `نوع فیلد «${field.label}» پشتیبانی نمی‌شود.`;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      formError: "لطفاً خطاهای فرم را بررسی و دوباره ارسال کنید.",
      values,
    };
  }

  return {
    ok: true,
    answers,
    mobileRaw,
    mobile,
    normalizedMobile,
    email,
    values,
  };
}
