import {
  getRegistrationBadge,
  REGISTRATION_BADGE_STYLES,
} from "@/lib/forms/registration-status";
import type { FormAvailabilityStatus } from "@/lib/forms/evaluate-form-availability";
import { toPersianDigits } from "@/lib/persian";

type FormStatusBadgesProps = {
  status: FormAvailabilityStatus;
  capacity: number | null;
  remainingCapacity: number | null;
  showRemainingCapacity: boolean;
  registrationDeadline: Date | string | null;
};

function formatDeadline(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return toPersianDigits(
    date.toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function FormStatusBadges({
  status,
  capacity,
  remainingCapacity,
  showRemainingCapacity,
  registrationDeadline,
}: FormStatusBadgesProps) {
  const registration = getRegistrationBadge(status);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 sm:justify-start"
      dir="rtl"
    >
      <Badge className={REGISTRATION_BADGE_STYLES[registration.tone]}>
        <span aria-hidden="true">{registration.mark}</span>
        <span>{registration.label}</span>
      </Badge>

      {capacity != null ? (
        <Badge className="bg-sky-50 text-sky-900 ring-1 ring-sky-200/80">
          ظرفیت: {toPersianDigits(capacity)} نفر
        </Badge>
      ) : (
        <Badge className="bg-slate-50 text-slate-700 ring-1 ring-slate-200/80">
          ظرفیت نامحدود
        </Badge>
      )}

      {registrationDeadline ? (
        <Badge className="bg-violet-50 text-violet-900 ring-1 ring-violet-200/80">
          مهلت: {formatDeadline(registrationDeadline)}
        </Badge>
      ) : null}

      {showRemainingCapacity && remainingCapacity != null ? (
        <Badge className="bg-secondary/15 text-primary ring-1 ring-secondary/30">
          باقی‌مانده: {toPersianDigits(remainingCapacity)} نفر
        </Badge>
      ) : null}
    </div>
  );
}
