/**
 * Shared public form availability rules (loader + submit must agree).
 */

export type FormAvailabilityStatus =
  | "AVAILABLE"
  | "NOT_OPEN_YET"
  | "CLOSED_BY_DEADLINE"
  | "CAPACITY_FULL"
  | "UNPUBLISHED_OR_PAUSED";

export type FormAvailabilityInput = {
  isPublishedLive: boolean;
  opensAt: Date | null;
  registrationDeadline: Date | null;
  capacity: number | null;
  /** Count of submissions that consume capacity (see capacity-count.ts). */
  usedCapacity: number;
  now?: Date;
};

export type FormAvailabilityResult = {
  status: FormAvailabilityStatus;
  remainingCapacity: number | null;
  message: string | null;
};

export const AVAILABILITY_MESSAGES: Record<
  Exclude<FormAvailabilityStatus, "AVAILABLE">,
  string
> = {
  NOT_OPEN_YET: "ثبت‌نام این فرم هنوز آغاز نشده است.",
  CLOSED_BY_DEADLINE: "مهلت ثبت‌نام این فرم به پایان رسیده است.",
  CAPACITY_FULL: "ظرفیت ثبت‌نام این برنامه تکمیل شده است.",
  UNPUBLISHED_OR_PAUSED: "این فرم هم‌اکنون برای ثبت پاسخ فعال نیست.",
};

export function evaluateFormAvailability(
  input: FormAvailabilityInput,
): FormAvailabilityResult {
  const now = input.now ?? new Date();

  const remainingCapacity =
    input.capacity == null
      ? null
      : Math.max(0, input.capacity - Math.max(0, input.usedCapacity));

  if (!input.isPublishedLive) {
    return {
      status: "UNPUBLISHED_OR_PAUSED",
      remainingCapacity,
      message: AVAILABILITY_MESSAGES.UNPUBLISHED_OR_PAUSED,
    };
  }

  if (input.opensAt && now.getTime() < input.opensAt.getTime()) {
    return {
      status: "NOT_OPEN_YET",
      remainingCapacity,
      message: AVAILABILITY_MESSAGES.NOT_OPEN_YET,
    };
  }

  if (
    input.registrationDeadline &&
    now.getTime() >= input.registrationDeadline.getTime()
  ) {
    return {
      status: "CLOSED_BY_DEADLINE",
      remainingCapacity,
      message: AVAILABILITY_MESSAGES.CLOSED_BY_DEADLINE,
    };
  }

  if (input.capacity != null && remainingCapacity !== null && remainingCapacity <= 0) {
    return {
      status: "CAPACITY_FULL",
      remainingCapacity: 0,
      message: AVAILABILITY_MESSAGES.CAPACITY_FULL,
    };
  }

  return {
    status: "AVAILABLE",
    remainingCapacity,
    message: null,
  };
}
