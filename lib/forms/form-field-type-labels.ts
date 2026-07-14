import {
  FormFieldType,
  type FormFieldType as FormFieldTypeValue,
} from "@/generated/prisma/enums";

/** Persian labels for FormFieldType — never show raw enum names in UI. */
export const FORM_FIELD_TYPE_LABELS: Record<FormFieldTypeValue, string> = {
  [FormFieldType.SHORT_TEXT]: "متن کوتاه",
  [FormFieldType.LONG_TEXT]: "متن بلند",
  [FormFieldType.MOBILE]: "شماره موبایل",
  [FormFieldType.EMAIL]: "ایمیل",
  [FormFieldType.NUMBER]: "عدد",
  [FormFieldType.SINGLE_CHOICE]: "انتخاب تکی",
  [FormFieldType.MULTIPLE_CHOICE]: "انتخاب چندتایی",
  [FormFieldType.DROPDOWN]: "لیست کشویی",
  [FormFieldType.DATE]: "تاریخ",
  [FormFieldType.GRADE]: "پایه تحصیلی",
  [FormFieldType.ACADEMIC_TRACK]: "رشته تحصیلی",
  [FormFieldType.SCHOOL_NAME]: "نام مدرسه",
  [FormFieldType.CONSENT]: "رضایت‌نامه",
  [FormFieldType.INFORMATIONAL]: "متن راهنما (بدون پاسخ)",
  [FormFieldType.NATIONAL_ID]: "کد ملی",
};

export const FORM_FIELD_TYPE_OPTIONS: ReadonlyArray<{
  value: FormFieldTypeValue;
  label: string;
}> = (Object.keys(FormFieldType) as Array<keyof typeof FormFieldType>).map(
  (key) => {
    const value = FormFieldType[key];
    return { value, label: FORM_FIELD_TYPE_LABELS[value] };
  },
);

export const CHOICE_FIELD_TYPES: ReadonlySet<FormFieldTypeValue> = new Set([
  FormFieldType.SINGLE_CHOICE,
  FormFieldType.MULTIPLE_CHOICE,
  FormFieldType.DROPDOWN,
]);

export function isFormFieldType(value: string): value is FormFieldTypeValue {
  return Object.values(FormFieldType).includes(value as FormFieldTypeValue);
}

export function isChoiceFieldType(type: FormFieldTypeValue): boolean {
  return CHOICE_FIELD_TYPES.has(type);
}

export function getFormFieldTypeLabel(type: FormFieldTypeValue): string {
  return FORM_FIELD_TYPE_LABELS[type];
}
