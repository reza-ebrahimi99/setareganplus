import Link from "next/link";
import { notFound } from "next/navigation";
import { completeMockCheckoutAction } from "@/app/payments/actions";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { formatRials } from "@/lib/registration/format";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { getMockCheckoutSession } from "@/lib/payment/service";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata() {
  return createPageMetadata({
    path: "/payments/mock/checkout",
    title: "پرداخت آزمایشی | ستارگان پلاس",
    description: "شبیه‌ساز درگاه پرداخت ستارگان پلاس.",
    robots: { index: false, follow: false },
  });
}

export default async function MockCheckoutPage({
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

  const session = await getMockCheckoutSession(
    organization.id,
    providerSessionId,
    token,
  );
  if (!session) {
    notFound();
  }

  const intent = session.paymentIntent;
  const studentName =
    `${intent.registration.studentFirstName} ${intent.registration.studentLastName}`.trim();

  return (
    <PublicFormShell>
      <article className="mx-auto max-w-lg space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-[0_12px_40px_rgb(15_23_42_/_0.06)] sm:p-8">
        <div className="rounded-2xl bg-gradient-to-l from-amber-50 to-secondary/10 px-5 py-5">
          <p className="text-xs font-medium text-amber-800">درگاه آزمایشی (Mock)</p>
          <h1 className="mt-2 text-xl font-bold text-primary">تکمیل پرداخت</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            این صفحه جایگزین درگاه واقعی است. یکی از نتایج زیر را انتخاب کنید.
          </p>
        </div>

        <dl className="grid gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">ثبت‌نام</dt>
            <dd className="font-medium" dir="ltr">
              {toPersianDigits(intent.registration.registrationNumber)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">دانش‌آموز</dt>
            <dd className="font-medium">{studentName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">محصول</dt>
            <dd className="font-medium">{intent.registration.productTitle}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">مبلغ</dt>
            <dd className="text-base font-bold text-primary">
              {formatRials(intent.finalAmountRials)}
            </dd>
          </div>
        </dl>

        <form action={completeMockCheckoutAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="providerSessionId" value={providerSessionId} />
          <input
            type="hidden"
            name="trackingCode"
            value={intent.trackingCode ?? ""}
          />

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
          <Link href="/ghalamchi/register" className="text-secondary hover:underline">
            بازگشت به ثبت‌نام
          </Link>
        </p>
      </article>
    </PublicFormShell>
  );
}
