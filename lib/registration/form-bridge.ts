/**
 * Bridge between Registration Engine and Form Builder.
 * System fields stay on Registration; custom questions come from the linked Form.
 */

import {
  FormFieldSemantic,
  FormFieldType,
  type FormFieldSemantic as FormFieldSemanticValue,
} from "@/generated/prisma/enums";
import type { PublicFormData, PublicFormField } from "@/lib/forms/load-public-form";
import { buildRegistrationWizardPanels } from "@/lib/forms/build-registration-wizard-panels";

/** Semantics owned by Registration operational columns (not FormAnswer-only). */
export const REGISTRATION_SYSTEM_SEMANTICS = new Set<FormFieldSemanticValue>([
  FormFieldSemantic.FIRST_NAME,
  FormFieldSemantic.LAST_NAME,
  FormFieldSemantic.MOBILE,
]);

/** Field types treated as system identity even without semantic. */
export const REGISTRATION_SYSTEM_FIELD_TYPES = new Set<FormFieldType>([
  FormFieldType.NATIONAL_ID,
  FormFieldType.MOBILE,
]);

export function readFormFieldDefaultValue(config: unknown): string | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }
  const raw = (config as Record<string, unknown>).defaultValue;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === "boolean") {
    return raw ? "true" : "false";
  }
  return null;
}

export function isRegistrationSystemFormField(
  field: Pick<PublicFormField, "type" | "fieldKey"> & {
    semantic?: FormFieldSemanticValue | null;
  },
): boolean {
  if (field.semantic && REGISTRATION_SYSTEM_SEMANTICS.has(field.semantic)) {
    return true;
  }
  if (REGISTRATION_SYSTEM_FIELD_TYPES.has(field.type)) {
    return true;
  }
  const key = field.fieldKey.toLowerCase();
  return (
    key === "first_name" ||
    key === "firstname" ||
    key === "last_name" ||
    key === "lastname" ||
    key === "national_id" ||
    key === "nationalcode" ||
    key === "national_code" ||
    key === "mobile" ||
    key === "parent_mobile"
  );
}

export function partitionRegistrationFormFields(fields: PublicFormField[]): {
  systemFields: PublicFormField[];
  customFields: PublicFormField[];
} {
  const systemFields: PublicFormField[] = [];
  const customFields: PublicFormField[] = [];
  for (const field of fields) {
    if (isRegistrationSystemFormField(field)) {
      systemFields.push(field);
    } else {
      customFields.push(field);
    }
  }
  return { systemFields, customFields };
}

export type RegistrationLinkedFormView = {
  formId: string;
  formSlug: string;
  versionId: string;
  title: string;
  customFields: PublicFormField[];
  /** Full public payload for PublicFormField rendering. */
  data: PublicFormData;
};

export function toRegistrationLinkedFormView(
  data: PublicFormData,
): RegistrationLinkedFormView {
  const { customFields } = partitionRegistrationFormFields(data.fields);
  return {
    formId: data.form.id,
    formSlug: data.form.slug,
    versionId: data.version.id,
    title: data.version.title,
    customFields,
    data: {
      ...data,
      fields: customFields,
    },
  };
}

export function buildCustomFormPanels(linked: RegistrationLinkedFormView) {
  return buildRegistrationWizardPanels(
    linked.data.steps,
    linked.customFields.map((field) => ({
      id: field.id,
      formStepId: field.formStepId,
      fieldKey: field.fieldKey,
      sortOrder: field.sortOrder,
      type: field.type,
      label: field.label,
      helpText: field.helpText,
      placeholder: field.placeholder,
      required: field.required,
      config: field.config,
      visibilityConditions: field.visibilityConditions,
    })),
  );
}

export function initialFormAnswerDefaults(
  fields: PublicFormField[],
): Record<string, string | string[] | boolean> {
  const defaults: Record<string, string | string[] | boolean> = {};
  for (const field of fields) {
    if (field.type === FormFieldType.INFORMATIONAL) continue;
    const value = readFormFieldDefaultValue(field.config);
    if (value == null) continue;
    if (field.type === FormFieldType.MULTIPLE_CHOICE) {
      defaults[field.fieldKey] = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (field.type === FormFieldType.CONSENT) {
      defaults[field.fieldKey] =
        value === "true" || value === "yes" || value === "1";
    } else {
      defaults[field.fieldKey] = value;
    }
  }
  return defaults;
}
