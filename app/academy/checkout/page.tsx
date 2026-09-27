import { redirect } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyCheckoutForm } from "@/components/academy/AcademyCheckoutForm";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { calculateCheckout } from "@/lib/academy/pricing";
import { formatTomanFromRials } from "@/lib/academy/money";

type Props = {
  searchParams?: Promise<{ course?: string; lesson?: string; code?: string }>;
};

export const metadata = { title: "تسویه حساب", robots: { index: false } };

export default async function AcademyCheckoutPage({ searchParams }: Props) {
  let session;
  try {
    session = await requireAcademySession();
  } catch {
    redirect("/login?next=/checkout");
  }

  const params = searchParams ? await searchParams : {};
  const organizationId = await getAcademyOrganizationId();

  const items =
    params.course != null
      ? [{ kind: "COURSE" as const, courseId: params.course }]
      : params.lesson != null
        ? [{ kind: "LESSON" as const, lessonId: params.lesson }]
        : [];

  if (items.length === 0) redirect("/courses");

  const quoted = await calculateCheckout({
    organizationId,
    userId: session.userId,
    items,
    discountCode: params.code,
  });

  if (!quoted.ok) {
    return (
      <AcademyShell>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-danger">{quoted.error}</p>
        </div>
      </AcademyShell>
    );
  }

  const line = quoted.quote.lines[0]!;

  return (
    <AcademyShell>
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-xl font-bold">تسویه حساب</h1>
        <div className="academy-card mt-6 space-y-3 p-6 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">{line.title}</span>
            <span dir="ltr">{formatTomanFromRials(line.lineTotalRials)}</span>
          </div>
          {quoted.quote.discountRials > 0 ? (
            <div className="flex justify-between text-success">
              <span>تخفیف</span>
              <span dir="ltr">-{formatTomanFromRials(quoted.quote.discountRials)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-3 font-bold">
            <span>مبلغ قابل پرداخت</span>
            <span className="text-secondary" dir="ltr">
              {formatTomanFromRials(quoted.quote.totalRials)}
            </span>
          </div>
        </div>
        <AcademyCheckoutForm
          courseId={line.courseId ?? undefined}
          lessonId={line.lessonId ?? undefined}
          discountCode={params.code}
          mobile={session.mobile}
        />
      </div>
    </AcademyShell>
  );
}
