import {
  FormSubmissionStatus,
  type FormSubmissionStatus as FormSubmissionStatusValue,
} from "@/generated/prisma/enums";

export const FORM_SUBMISSION_STATUS_LABELS: Record<
  FormSubmissionStatusValue,
  string
> = {
  [FormSubmissionStatus.RECEIVED]: "دریافت‌شده",
  [FormSubmissionStatus.DUPLICATE]: "تکراری",
  [FormSubmissionStatus.WAITING_LIST]: "لیست انتظار",
  [FormSubmissionStatus.REJECTED]: "رد شده",
};

export const FORM_SUBMISSION_STATUS_OPTIONS: ReadonlyArray<{
  value: FormSubmissionStatusValue;
  label: string;
}> = (
  Object.keys(FormSubmissionStatus) as Array<keyof typeof FormSubmissionStatus>
).map((key) => {
  const value = FormSubmissionStatus[key];
  return { value, label: FORM_SUBMISSION_STATUS_LABELS[value] };
});

export function getFormSubmissionStatusLabel(
  status: FormSubmissionStatusValue,
): string {
  return FORM_SUBMISSION_STATUS_LABELS[status];
}

export function isFormSubmissionStatus(
  value: string,
): value is FormSubmissionStatusValue {
  return Object.values(FormSubmissionStatus).includes(
    value as FormSubmissionStatusValue,
  );
}
