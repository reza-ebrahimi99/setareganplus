import { FormFieldType, type FormFieldType as FormFieldTypeValue } from "@/generated/prisma/enums";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import { CAPACITY_MAX } from "@/lib/forms/capacity";
import {
  detectVisibilityCycles,
  validateVisibilityConditionForField,
} from "@/lib/forms/field-visibility";
import { isChoiceFieldType } from "@/lib/forms/form-field-type-labels";
import {
  parseFormVersionSettings,
  validateFormVersionSettings,
} from "@/lib/forms/form-version-settings";
import { normalizeFormSlug } from "@/lib/forms/normalize-form-slug";

export type PublishValidationField = {
  fieldKey: string;
  sortOrder: number;
  type: FormFieldTypeValue;
  label: string;
  required: boolean;
  config: unknown;
  visibilityConditions?: unknown;
};

export type PublishValidationInput = {
  slug: string;
  title: string;
  confirmationMessage: string;
  opensAt?: Date | null;
  registrationDeadline?: Date | null;
  capacity?: number | null;
  settings?: unknown;
  fields: PublishValidationField[];
};

export type PublishValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const ALLOWED_NON_CHOICE_CONFIG_KEYS = new Set([
  "helpText",
  "placeholder",
  "prefix",
  "visibility", // legacy only — ignored at runtime in favor of visibilityConditions
]);

function isEmptyConfig(config: unknown): boolean {
  if (config == null) {
    return true;
  }
  if (typeof config !== "object" || Array.isArray(config)) {
    return false;
  }
  const keys = Object.keys(config as Record<string, unknown>).filter(
    (key) => !ALLOWED_NON_CHOICE_CONFIG_KEYS.has(key),
  );
  return keys.length === 0;
}

/**
 * Validates a draft version before it becomes the public published version.
 */
export function validateFormVersionForPublish(
  input: PublishValidationInput,
): PublishValidationResult {
  const errors: string[] = [];

  const slugResult = normalizeFormSlug(input.slug);
  if (!slugResult.ok) {
    errors.push(slugResult.error);
  }

  if (!input.title.trim()) {
    errors.push("عنوان فرم برای انتشار الزامی است.");
  }

  if (!input.confirmationMessage.trim()) {
    errors.push("پیام تأیید پس از ثبت برای انتشار الزامی است.");
  }

  const opensAt = input.opensAt ?? null;
  const registrationDeadline = input.registrationDeadline ?? null;
  const capacity = input.capacity ?? null;

  if (opensAt && registrationDeadline && opensAt.getTime() >= registrationDeadline.getTime()) {
    errors.push("زمان شروع ثبت‌نام باید قبل از زمان پایان باشد.");
  }

  if (capacity != null) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > CAPACITY_MAX) {
      errors.push(
        `ظرفیت ثبت‌نام باید عدد صحیح بین ۱ تا ${CAPACITY_MAX.toLocaleString("en-US")} باشد.`,
      );
    }
  }

  const settingsError = validateFormVersionSettings(input.settings);
  if (settingsError) {
    errors.push(settingsError);
  } else {
    // Ensure settings can be parsed (contract check).
    parseFormVersionSettings(input.settings);
  }

  if (input.fields.length === 0) {
    errors.push("برای انتشار حداقل یک سؤال لازم است.");
    return { ok: false, errors };
  }

  const fieldKeys = new Set<string>();
  for (const field of input.fields) {
    if (!field.label.trim()) {
      errors.push("همه سؤال‌ها باید برچسب غیرخالی داشته باشند.");
      break;
    }
  }

  for (const field of input.fields) {
    if (fieldKeys.has(field.fieldKey)) {
      errors.push("کلید فیلد تکراری در نسخه پیش‌نویس وجود دارد.");
      break;
    }
    fieldKeys.add(field.fieldKey);
  }

  const sortedOrders = input.fields
    .map((field) => field.sortOrder)
    .sort((a, b) => a - b);

  const orderSet = new Set(sortedOrders);
  if (orderSet.size !== sortedOrders.length) {
    errors.push("ترتیب سؤال‌ها یکتا نیست.");
  }

  for (let index = 0; index < sortedOrders.length; index += 1) {
    if (sortedOrders[index] !== index + 1) {
      errors.push("ترتیب سؤال‌ها باید از ۱ تا n و پیوسته باشد.");
      break;
    }
  }

  for (const field of input.fields) {
    if (field.type === FormFieldType.INFORMATIONAL && field.required) {
      errors.push(
        `سؤال «${field.label}» از نوع راهنما است و نمی‌تواند الزامی باشد.`,
      );
    }

    if (field.type === FormFieldType.CONSENT && field.label.trim().length < 3) {
      errors.push("فیلد رضایت‌نامه باید برچسب معنادار داشته باشد.");
    }

    if (isChoiceFieldType(field.type)) {
      const choiceConfig = readChoiceConfig(field.config);
      if (!choiceConfig) {
        errors.push(
          `سؤال «${field.label}» گزینه‌های معتبر ندارد (حداقل دو گزینه در قالب قرارداد مشخص).`,
        );
      }
    } else if (!isEmptyConfig(field.config)) {
      errors.push(
        `سؤال «${field.label}» پیکربندی پشتیبانی‌نشده دارد. برای انواع غیراز انتخابی، config باید خالی باشد.`,
      );
    }
  }

  const visibilityFields = input.fields.map((field) => ({
    fieldKey: field.fieldKey,
    sortOrder: field.sortOrder,
    type: field.type,
    label: field.label,
    config: field.config,
    visibilityConditions: field.visibilityConditions ?? null,
  }));

  for (const field of visibilityFields) {
    const result = validateVisibilityConditionForField({
      dependentFieldKey: field.fieldKey,
      dependentLabel: field.label,
      visibilityConditions: field.visibilityConditions,
      config: field.config,
      fields: visibilityFields,
    });
    if (!result.ok) {
      errors.push(result.error);
    }
  }

  const cycleError = detectVisibilityCycles(visibilityFields);
  if (cycleError) {
    errors.push(cycleError);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
