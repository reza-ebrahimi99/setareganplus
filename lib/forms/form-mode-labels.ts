import {
  FormMode,
  type FormMode as FormModeValue,
} from "@/generated/prisma/enums";

/** Persian labels for FormMode — never show raw enum names in UI. */
export const FORM_MODE_LABELS: Record<FormModeValue, string> = {
  [FormMode.STANDARD]: "فرم استاندارد",
  [FormMode.REGISTRATION]: "ثبت‌نام",
};

export const FORM_MODE_OPTIONS: ReadonlyArray<{
  value: FormModeValue;
  label: string;
  description: string;
}> = [
  {
    value: FormMode.STANDARD,
    label: FORM_MODE_LABELS[FormMode.STANDARD],
    description: "فرم تک‌صفحه‌ای فعلی برای ثبت پاسخ و لید",
  },
  {
    value: FormMode.REGISTRATION,
    label: FORM_MODE_LABELS[FormMode.REGISTRATION],
    description: "حالت چندمرحله‌ای ثبت‌نام روی همین فرم‌ساز",
  },
];

export function isFormMode(value: string): value is FormModeValue {
  return Object.values(FormMode).includes(value as FormModeValue);
}

export function getFormModeLabel(mode: FormModeValue): string {
  return FORM_MODE_LABELS[mode];
}
