import Link from "next/link";
import type { RegistrationFormBlockConfig } from "@/lib/experience/blocks/registration-form";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";

export function RegistrationFormBlockPublic({
  config,
  binding,
}: ExperiencePublicBlockRendererProps<RegistrationFormBlockConfig>) {
  if (!binding) return null;
  const { wizardPath, canStartRegistration, flow } = binding;
  const label = config.startButtonLabel?.trim() || "شروع ثبت‌نام";

  return (
    <section className="rounded-3xl border border-border bg-surface px-6 py-10 sm:px-10">
      {config.introHeading ? (
        <h2 className="text-xl font-bold text-primary">{config.introHeading}</h2>
      ) : null}
      {config.introBody ? (
        <p className="mt-3 max-w-2xl text-sm leading-8 text-muted">{config.introBody}</p>
      ) : null}
      {!flow.formId ? (
        <p className="mt-6 text-sm text-muted">فرمی به این جریان متصل نشده است.</p>
      ) : config.showStartButton !== false ? (
        <div className="mt-8">
          {canStartRegistration ? (
            <Link
              href={wizardPath}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92"
            >
              {label}
            </Link>
          ) : (
            <span className="inline-flex min-h-12 items-center justify-center rounded-xl bg-muted/20 px-6 text-sm font-medium text-muted">
              {label}
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}
