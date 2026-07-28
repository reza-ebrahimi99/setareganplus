import Link from "next/link";
import { PublicRegistrationPricing } from "@/components/registration/PublicRegistrationPricing";
import { FLOW_PAYMENT_MODE_LABELS } from "@/lib/registration/flows/constants";
import type { PublicRegistrationFlow } from "@/lib/registration/flows/public";
import { getPublicRegistrationWizardPath } from "@/lib/registration/flows/public-url";

const CLOSED_MESSAGES = {
  draft: "این جریان ثبت‌نام هنوز منتشر نشده است.",
  archived: "ثبت‌نام در این جریان بسته شده است.",
  not_started: "مهلت ثبت‌نام هنوز آغاز نشده است.",
  ended: "مهلت ثبت‌نام به پایان رسیده است.",
  full: "ظرفیت این جریان تکمیل شده است.",
} as const;

export type RegistrationFlowLandingFallbackProps = {
  flow: PublicRegistrationFlow;
  allowPreview?: boolean;
  /** Optional query string without `?` preserved on the wizard CTA. */
  wizardQuery?: string | null;
};

function wizardHref(slug: string, query: string | null | undefined): string {
  const path = getPublicRegistrationWizardPath(slug);
  const q = query?.trim();
  if (!q) return path;
  return `${path}?${q.startsWith("?") ? q.slice(1) : q}`;
}

/**
 * Legacy registration landing UI — used when no published Experience is renderable.
 * Keep behavior identical to the pre-Experience /register/[slug] page.
 */
export function RegistrationFlowLandingFallback({
  flow,
  allowPreview = false,
  wizardQuery,
}: RegistrationFlowLandingFallbackProps) {
  const canStart = flow.isOpen || allowPreview;
  const paymentLabel = FLOW_PAYMENT_MODE_LABELS[flow.paymentMode];
  const href = wizardHref(flow.slug, wizardQuery);

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_12px_40px_rgb(15_23_42_/_0.06)]">
      {flow.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flow.coverUrl}
          alt=""
          className="h-48 w-full object-cover sm:h-64"
        />
      ) : null}
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-xs font-medium text-secondary">ثبت‌نام آنلاین</p>
        <h1 className="mt-3 text-2xl font-bold leading-10 text-primary sm:text-3xl">
          {flow.title}
        </h1>
        {flow.description ? (
          <p className="mt-4 max-w-2xl text-sm leading-8 text-muted sm:text-base">
            {flow.description}
          </p>
        ) : null}

        <ul className="mt-8 grid gap-3 text-sm text-foreground sm:grid-cols-2">
          {flow.steps
            .filter((step) => step.enabled)
            .map((step) => (
              <li
                key={step.stepKey}
                className="rounded-2xl border border-border/80 bg-white/80 px-4 py-3"
              >
                {step.label}
              </li>
            ))}
        </ul>

        <PublicRegistrationPricing
          paymentMode={flow.paymentMode}
          paymentAmountRials={flow.paymentAmountRials}
          saleAmountRials={flow.saleAmountRials}
          pricingBadge={flow.pricingBadge}
          discountStartsAtIso={flow.discountStartsAt?.toISOString() ?? null}
          discountEndsAtIso={flow.discountEndsAt?.toISOString() ?? null}
          showDiscountCountdown={flow.showDiscountCountdown}
          paymentLabel={paymentLabel}
        />

        {!canStart && flow.closedReason ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {CLOSED_MESSAGES[flow.closedReason]}
          </p>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {canStart ? (
            <Link
              href={href}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92"
            >
              شروع ثبت‌نام
            </Link>
          ) : (
            <span className="inline-flex min-h-12 items-center justify-center rounded-xl bg-muted/20 px-6 text-sm font-medium text-muted">
              ثبت‌نام در دسترس نیست
            </span>
          )}
          {allowPreview ? (
            <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-secondary/30 bg-secondary/10 px-6 text-xs font-medium text-primary">
              حالت پیش‌نمایش مدیر
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
