import Link from "next/link";
import { leadDetailUnavailable } from "@/content/admin";
import { AdminEmptyState } from "./AdminEmptyState";

export function LeadDetailEmpty() {
  return (
    <div className="space-y-6">
      <AdminEmptyState
        title={leadDetailUnavailable.title}
        description={leadDetailUnavailable.description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={leadDetailUnavailable.backHref}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              {leadDetailUnavailable.backLabel}
            </Link>
            <Link
              href={leadDetailUnavailable.preRegistrationHref}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              {leadDetailUnavailable.preRegistrationLabel}
            </Link>
          </div>
        }
      />

      <section
        aria-labelledby="lead-dependencies-heading"
        className="admin-card p-5 sm:p-6"
      >
        <h2
          id="lead-dependencies-heading"
          className="text-base font-semibold text-primary"
        >
          پیش‌نیازهای نمایش پرونده
        </h2>
        <p className="mt-2 text-sm text-muted">
          اطلاعات پس از اتصال سامانه بارگذاری می‌شوند.
        </p>
        <ul className="mt-4 space-y-2">
          {leadDetailUnavailable.dependencies.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground"
            >
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted"
              >
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
