import Link from "next/link";
import type { RegistrationFormBlockConfig } from "@/lib/experience/blocks/registration-form";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

const CLOSED_MESSAGES = {
  draft: "این جریان ثبت‌نام هنوز منتشر نشده است.",
  archived: "ثبت‌نام در این جریان بسته شده است.",
  not_started: "مهلت ثبت‌نام هنوز آغاز نشده است.",
  ended: "مهلت ثبت‌نام به پایان رسیده است.",
  full: "ظرفیت این جریان تکمیل شده است.",
} as const;

export function RegistrationFormBlockPublic({
  config,
  context,
}: ExperiencePublicBlockRendererProps<RegistrationFormBlockConfig>) {
  const { availability, registrationFlow, wizardHref } = context;
  const label = config.startButtonLabel?.trim() || "شروع ثبت‌نام";

  if (!registrationFlow.formId && !availability.allowPreview) {
    return (
      <section
        className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-950"
        role="status"
      >
        ثبت‌نام موقتاً در دسترس نیست.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border bg-surface px-6 py-10 sm:px-10">
      {config.introHeading ? (
        <h2 className="text-xl font-bold text-primary">{config.introHeading}</h2>
      ) : null}
      {config.introBody ? (
        <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">
          {config.introBody}
        </p>
      ) : null}

      {!availability.canStartRegistration && availability.closedReason ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {CLOSED_MESSAGES[availability.closedReason]}
        </p>
      ) : null}

      {config.showStartButton !== false ? (
        <div className="mt-8">
          {availability.canStartRegistration ? (
            <Link
              href={wizardHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92"
            >
              {label}
            </Link>
          ) : (
            <span className="inline-flex min-h-12 items-center justify-center rounded-xl bg-muted/20 px-6 text-sm font-medium text-muted">
              ثبت‌نام در دسترس نیست
            </span>
          )}
        </div>
      ) : null}

      {availability.allowPreview ? (
        <p className="mt-4 text-xs font-medium text-primary">
          حالت پیش‌نمایش مدیر
        </p>
      ) : null}
    </section>
  );
}
