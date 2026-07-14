import { FormFieldType, type FormFieldType as FormFieldTypeValue } from "@/generated/prisma/enums";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import { isChoiceFieldType } from "@/lib/forms/form-field-type-labels";
import { normalizeFormSlug } from "@/lib/forms/normalize-form-slug";

export type PublishValidationField = {
  fieldKey: string;
  sortOrder: number;
  type: FormFieldTypeValue;
  label: string;
  required: boolean;
  config: unknown;
};

export type PublishValidationInput = {
  slug: string;
  title: string;
  confirmationMessage: string;
  fields: PublishValidationField[];
};

export type PublishValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function isEmptyConfig(config: unknown): boolean {
  if (config == null) {
    return true;
  }
  if (typeof config !== "object" || Array.isArray(config)) {
    return false;
  }
  return Object.keys(config as Record<string, unknown>).length === 0;
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

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
