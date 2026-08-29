import { notFound } from "next/navigation";
import { completeMockGuidanceCheckoutAction } from "@/app/payments/mock/guidance-checkout/[sessionId]/actions";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { getGuidancePackage } from "@/lib/guidance/journey/packages";
import { getMockGuidanceCheckoutSession } from "@/lib/guidance/journey/payment";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { formatRials } from "@/lib/registration/format";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

/**
 * Guidance Journey Engine Step 3 — dedicated mock checkout simulator.
 * Mirrors app/payments/mock/checkout/[sessionId]/page.tsx but scoped to
 * GUIDANCE_PACKAGE payment intents (Registration mock checkout untouched).
 */
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata() {
  return createPageMetadata({
    path: "/payments/mock/guidance-checkout",
    title: "پرداخت آزمایشی | سامانه انتخاب رشته",
    description: "شبیه‌ساز درگاه پرداخت بسته مشاوره انتخاب رشته.",
    robots: { index: false, follow: false },
  });
}

export default async function MockGuidanceCheckoutPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const query = await searchParams;
  const token = String(query.token ?? "").trim();
  const providerSessionId = decodeURIComponent(sessionId);

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const found = await getMockGuidanceCheckoutSession({
    organizationId: organization.id,
    providerSessionId,
    callbackToken: token,
  });
  if (!found || !found.plan) {
    notFound();
  }

  const { session, plan } = found;
  const intent = session.paymentIntent;
  const pkg = plan.guidancePackageCode
    ? getGuidancePackage(plan.guidancePackageCode)
    : null;

  return (
    <PublicFormShell>
      <article className="mx-auto max-w-lg space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_40px_rgb(15_23_42_/_0.06)] sm:p-8">
        <div className="rounded-2xl bg-gradient-to-l from-amber-50 to-secondary/10 px-5 py-5">
          <p className="text-xs font-medium text-amber-800">درگاه آزمایشی (Mock)</p>
          <h1 className="mt-2 text-xl font-bold text-primary">
            تکمیل پرداخت بسته مشاوره
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            این صفحه جایگزین درگاه واقعی است. یکی از نتایج زیر را انتخاب کنید.
          </p>
        </div>

        <dl className="grid gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">دانش‌آموز</dt>
            <dd className="font-medium">{plan.student?.fullName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">بسته</dt>
            <dd className="font-medium">{pkg?.title ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">مبلغ</dt>
            <dd className="text-base font-bold text-primary">
              {formatRials(intent.finalAmountRials)}
            </dd>
          </div>
        </dl>

        <form action={completeMockGuidanceCheckoutAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="providerSessionId" value={providerSessionId} />
          <input type="hidden" name="trackingCode" value={intent.trackingCode ?? ""} />

          <button
            type="submit"
            name="outcome"
            value="paid"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/92"
          >
            پرداخت موفق
          </button>
          <button
            type="submit"
            name="outcome"
            value="failed"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            پرداخت ناموفق
          </button>
          <button
            type="submit"
            name="outcome"
            value="cancelled"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-medium text-foreground hover:bg-background"
          >
            انصراف از پرداخت
          </button>
        </form>

        <p className="text-center text-xs text-muted">
          محیط آزمایشی — بدون تراکنش واقعی.
        </p>
      </article>
    </PublicFormShell>
  );
}
