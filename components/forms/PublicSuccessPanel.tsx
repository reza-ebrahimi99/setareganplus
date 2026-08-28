import Link from "next/link";
import { CopyButton } from "@/components/ui/CopyButton";
import { toPersianDigits } from "@/lib/persian";

export type PublicSuccessPanelProps = {
  title: string;
  subtitle?: string | null;
  message: string;
  submitterName?: string | null;
  trackingCode?: string | null;
  submittedAtLabel?: string | null;
  backHref?: string;
  backLabel?: string;
};

export function PublicSuccessPanel({
  title,
  subtitle,
  message,
  submitterName,
  trackingCode,
  submittedAtLabel,
  backHref = "/",
  backLabel = "بازگشت به صفحه اصلی",
}: PublicSuccessPanelProps) {
  return (
    <div className="public-form-section rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:px-10">
      <div
        aria-hidden="true"
        className="public-form-success-mark mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-700"
      >
        ✓
      </div>
      <h1 className="text-xl font-bold leading-10 tracking-tight text-primary sm:text-2xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
      ) : null}
      <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-foreground sm:text-base">
        {message}
      </p>

      {(submitterName || trackingCode || submittedAtLabel) && (
        <dl className="mx-auto mt-8 max-w-md space-y-3 text-start">
          {submitterName ? (
            <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
              <dt className="text-[11px] text-muted">نام</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {submitterName}
              </dd>
            </div>
          ) : null}
          {trackingCode ? (
            <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
              <dt className="text-[11px] text-muted">کد پیگیری</dt>
              <dd className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <span
                  className="font-mono text-base font-semibold tracking-wide text-primary"
                  dir="ltr"
                >
                  {toPersianDigits(trackingCode)}
                </span>
                <CopyButton text={trackingCode} />
              </dd>
            </div>
          ) : null}
          {submittedAtLabel ? (
            <div className="rounded-xl border border-border/80 bg-white px-4 py-3">
              <dt className="text-[11px] text-muted">تاریخ ثبت</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {submittedAtLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      <Link
        href={backHref}
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92"
      >
        {backLabel}
      </Link>
    </div>
  );
}
