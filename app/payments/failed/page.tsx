import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatus } from "@/generated/prisma/enums";
import { RetryPaymentButton } from "@/components/payment/RetryPaymentButton";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { formatRials } from "@/lib/registration/format";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { getPaymentIntentPublicView } from "@/lib/payment/service";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata() {
  return createPageMetadata({
    path: "/payments/failed",
    title: "پرداخت ناموفق | ستارگان پلاس",
    description: "پرداخت ثبت‌نام انجام نشد.",
    robots: { index: false, follow: false },
  });
}

export default async function PaymentFailedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const intentId = String(params.intent ?? "").trim();
  const errorHint = String(params.error ?? "").trim();

  if (!intentId) {
    return (
      <PublicFormShell>
        <article className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-xl font-bold text-red-900">پرداخت ناموفق</h1>
          <p className="mt-3 text-sm leading-7 text-red-800">
            {errorHint || "اطلاعات پرداخت در دسترس نیست."}
          </p>
          <Link
            href="/ghalamchi/register/wizard"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white"
          >
            بازگشت به ثبت‌نام
          </Link>
        </article>
      </PublicFormShell>
    );
  }

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const intent = await getPaymentIntentPublicView(organization.id, intentId);
  if (!intent) notFound();

  const reg = intent.registration;
  const canRetry =
    intent.status === PaymentStatus.FAILED ||
    intent.status === PaymentStatus.CANCELLED ||
    intent.status === PaymentStatus.PROCESSING;

  const statusLabel =
    intent.status === PaymentStatus.CANCELLED
      ? "پرداخت لغو شد"
      : "پرداخت ناموفق بود";

  return (
    <PublicFormShell>
      <article className="mx-auto max-w-lg space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_40px_rgb(15_23_42_/_0.06)] sm:p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center">
          <h1 className="text-xl font-bold text-red-900">{statusLabel}</h1>
          <p className="mt-3 text-sm leading-7 text-red-800">
            ثبت‌نام شما محفوظ است. می‌توانید دوباره برای پرداخت تلاش کنید.
          </p>
        </div>

        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <dt className="text-muted">شماره ثبت‌نام</dt>
            <dd dir="ltr" className="font-medium">
              {toPersianDigits(reg.registrationNumber)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
            <dt className="text-muted">مبلغ</dt>
            <dd className="font-bold text-primary">
              {formatRials(intent.finalAmountRials)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          {canRetry ? (
            <RetryPaymentButton registrationId={reg.id} />
          ) : null}
          <Link
            href={`/ghalamchi/register/receipt/${encodeURIComponent(reg.registrationNumber)}`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-medium text-foreground hover:bg-background"
          >
            مشاهده وضعیت ثبت‌نام
          </Link>
        </div>
      </article>
    </PublicFormShell>
  );
}
