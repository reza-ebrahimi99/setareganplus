import { CounselorScheduleSessionKind } from "@/generated/prisma/enums";
import {
  APPOINTMENT_PURPOSE,
  type AppointmentPurpose,
} from "@/lib/guidance/journey-v2/constants";

export function sessionKindFromPurpose(
  purpose: AppointmentPurpose | null | undefined,
): CounselorScheduleSessionKind {
  return purpose === APPOINTMENT_PURPOSE.SECOND_SESSION
    ? CounselorScheduleSessionKind.SECOND_SESSION
    : CounselorScheduleSessionKind.FIRST_SESSION;
}

export function purposeFromSessionKind(
  kind: CounselorScheduleSessionKind,
): AppointmentPurpose {
  return kind === CounselorScheduleSessionKind.SECOND_SESSION
    ? APPOINTMENT_PURPOSE.SECOND_SESSION
    : APPOINTMENT_PURPOSE.FIRST_SESSION;
}

export function sessionKindLabel(kind: CounselorScheduleSessionKind): string {
  return kind === CounselorScheduleSessionKind.SECOND_SESSION
    ? "جلسه دوم"
    : "جلسه اول";
}

export function planStatusLabel(
  status: "DRAFT" | "ACTIVE" | "PAUSED",
): string {
  switch (status) {
    case "DRAFT":
      return "پیش‌نویس";
    case "ACTIVE":
      return "فعال";
    case "PAUSED":
      return "متوقف";
    default:
      return status;
  }
}
