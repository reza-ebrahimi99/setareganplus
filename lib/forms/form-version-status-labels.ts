import {
  FormVersionStatus,
  type FormVersionStatus as FormVersionStatusValue,
} from "@/generated/prisma/enums";

export const FORM_VERSION_STATUS_LABELS: Record<
  FormVersionStatusValue,
  string
> = {
  [FormVersionStatus.DRAFT]: "پیش‌نویس",
  [FormVersionStatus.PUBLISHED]: "منتشرشده",
  [FormVersionStatus.PAUSED]: "متوقف",
  [FormVersionStatus.ARCHIVED]: "بایگانی",
  [FormVersionStatus.SUPERSEDED]: "جایگزین‌شده",
};

export function getFormVersionStatusLabel(
  status: FormVersionStatusValue,
): string {
  return FORM_VERSION_STATUS_LABELS[status];
}
