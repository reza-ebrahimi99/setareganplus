import { FormStatusBadges } from "@/components/forms/FormStatusBadges";
import type { FormAvailabilityStatus } from "@/lib/forms/evaluate-form-availability";
import { getFormPurposeLabel } from "@/lib/forms/form-purpose-labels";
import type { FormPurpose } from "@/generated/prisma/enums";

type PublicFormHeaderProps = {
  title: string;
  description: string | null;
  purpose: FormPurpose;
  posterUrl?: string | null;
  posterAlt?: string | null;
  status: FormAvailabilityStatus;
  capacity: number | null;
  remainingCapacity: number | null;
  showRemainingCapacity: boolean;
  registrationDeadline: Date | null;
  showRequiredHint?: boolean;
};

export function PublicFormHeader({
  title,
  description,
  purpose,
  posterUrl,
  posterAlt,
  status,
  capacity,
  remainingCapacity,
  showRemainingCapacity,
  registrationDeadline,
  showRequiredHint = false,
}: PublicFormHeaderProps) {
  return (
    <header className="public-form-section space-y-6">
      {posterUrl ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgb(15_23_42_/_0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Nginx /media */}
          <img
            src={posterUrl}
            alt={posterAlt?.trim() || title}
            width={1200}
            height={630}
            decoding="async"
            fetchPriority="high"
            className="mx-auto h-auto max-h-[min(52vh,28rem)] w-full object-contain"
          />
        </div>
      ) : null}

      <div className="space-y-4 text-center sm:text-start">
        <p className="inline-flex rounded-full bg-secondary/15 px-3 py-1 text-[11px] font-medium text-primary">
          {getFormPurposeLabel(purpose)}
        </p>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-10 tracking-tight text-primary sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mx-auto max-w-2xl text-sm leading-8 text-muted sm:mx-0 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        <FormStatusBadges
          status={status}
          capacity={capacity}
          remainingCapacity={remainingCapacity}
          showRemainingCapacity={showRemainingCapacity}
          registrationDeadline={registrationDeadline}
        />

        {showRequiredHint ? (
          <p className="text-xs text-muted">
            فیلدهای دارای علامت{" "}
            <span className="text-danger" aria-hidden="true">
              *
            </span>{" "}
            الزامی هستند.
          </p>
        ) : null}
      </div>
    </header>
  );
}
