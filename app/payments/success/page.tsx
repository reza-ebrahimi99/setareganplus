import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentStatus } from "@/generated/prisma/enums";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { formatRegistrationDate, formatRials } from "@/lib/registration/format";
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
    path: "/payments/success",
    title: "پرداخت موفق | ستارگان پلاس",
    description: "رسید پرداخت موفق ثبت‌نام.",
    robots: { index: false, follow: false },
  });
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const intentId = String(params.intent ?? "").trim();
  if (!intentId) notFound();

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const intent = await getPaymentIntentPublicView(organization.id, intentId);
  if (!intent || intent.status !== PaymentStatus.PAID) {
    notFound();
  }

  const reg = intent.registration;
  const studentName =
    `${reg.studentFirstName} ${reg.studentLastName}`.trim();
  const statusUrl = `/ghalamchi/register/receipt/${encodeURIComponent(reg.registrationNumber)}`;

  return (
    <PublicFormShell>
      <article className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_16px_48px_rgb(15_23_42_/_0.08)]">
        <div className="bg-gradient-to-br from-emerald-600 via-primary to-secondary px-6 py-10 text-center text-white">
          <p className="text-sm font-medium text-white/85">پرداخت موفق</p>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
            ثبت‌نام شما تکمیل شد
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-white/90">
            مبلغ با موفقیت دریافت شد. رسید و کد پیگیری را نگه دارید.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          <dl className="grid gap-3 text-sm">
            <Row
              label="کد پیگیری"
              value={
                intent.trackingCode
                  ? toPersianDigits(intent.trackingCode)
                  : "—"
              }
              ltr
            />
            <Row
              label="شماره رسید"
              value={
                intent.receiptNumber
                  ? toPersianDigits(intent.receiptNumber)
                  : "—"
              }
              ltr
            />
            <Row label="مبلغ پرداختی" value={formatRials(intent.finalAmountRials)} />
            <Row
              label="تاریخ"
              value={formatRegistrationDate(intent.paidAt ?? intent.updatedAt)}
            />
            <Row label="دانش‌آموز" value={studentName} />
            <Row
              label="شماره ثبت‌نام"
              value={toPersianDigits(reg.registrationNumber)}
              ltr
            />
          </dl>

          <div className="rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-7 text-muted">
            <p className="font-medium text-primary">مراحل بعدی</p>
            <ul className="mt-2 list-disc space-y-1 pr-5">
              <li>رسید را ذخیره یا چاپ کنید.</li>
              <li>از وضعیت ثبت‌نام در پنل پیگیری کنید.</li>
              <li>در صورت نیاز، با پشتیبانی مرکز تماس بگیرید.</li>
            </ul>
          </div>

          <Link
            href={statusUrl}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/92"
          >
            مشاهده وضعیت ثبت‌نام
          </Link>
        </div>
      </article>
    </PublicFormShell>
  );
}

function Row({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-left font-medium text-foreground" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
