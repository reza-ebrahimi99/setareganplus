import {
  FormPurpose,
  type FormPurpose as FormPurposeValue,
} from "@/generated/prisma/enums";

/** Persian labels for FormPurpose — never show raw enum names in UI. */
export const FORM_PURPOSE_LABELS: Record<FormPurposeValue, string> = {
  [FormPurpose.FREE_CLASS]: "کلاس رایگان",
  [FormPurpose.EDUCATIONAL_EVENT]: "رویداد آموزشی",
  [FormPurpose.SEMINAR]: "سمینار",
  [FormPurpose.GIFTED_EXAM]: "آزمون تیزهوشان",
  [FormPurpose.CONSULTATION]: "مشاوره",
  [FormPurpose.ADMISSION]: "پذیرش",
  [FormPurpose.SURVEY]: "نظرسنجی",
  [FormPurpose.EMPLOYMENT]: "استخدام",
  [FormPurpose.FESTIVAL]: "جشنواره",
  [FormPurpose.PARENT_MEETING]: "جلسه اولیا",
};

export const FORM_PURPOSE_OPTIONS: ReadonlyArray<{
  value: FormPurposeValue;
  label: string;
}> = (
  Object.keys(FormPurpose) as Array<keyof typeof FormPurpose>
).map((key) => {
  const value = FormPurpose[key];
  return { value, label: FORM_PURPOSE_LABELS[value] };
});

export function isFormPurpose(value: string): value is FormPurposeValue {
  return Object.values(FormPurpose).includes(value as FormPurposeValue);
}

export function getFormPurposeLabel(purpose: FormPurposeValue): string {
  return FORM_PURPOSE_LABELS[purpose];
}
