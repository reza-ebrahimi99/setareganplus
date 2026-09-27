import { notFound } from "next/navigation";
import { PaymentPayableType } from "@/generated/prisma/enums";
import { completeMockAcademyCheckoutAction } from "@/app/payments/mock/academy-checkout/[sessionId]/actions";
import { formatTomanFromRials } from "@/lib/academy/money";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MockAcademyCheckoutPage({
  params,
  searchParams,
}: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

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

  const session = await prisma.paymentSession.findFirst({
    where: {
      organizationId: organization.id,
      provider: "mock",
      providerSessionId,
      callbackToken: token,
    },
    include: { paymentIntent: true },
  });

  if (
    !session ||
    session.paymentIntent.payableType !== PaymentPayableType.ACADEMY_ORDER
  ) {
    notFound();
  }

  const order = await prisma.academyOrder.findFirst({
    where: { id: session.paymentIntent.payableId },
    select: { orderNumber: true },
  });

  return (
    <main className="mx-auto max-w-md px-4 py-16" dir="rtl">
      <h1 className="text-lg font-bold">پرداخت آزمایشی آکادمی</h1>
      <p className="mt-2 text-sm text-muted">
        سفارش {order?.orderNumber ?? "—"} —{" "}
        <span dir="ltr">{formatTomanFromRials(session.paymentIntent.finalAmountRials)}</span>
      </p>
      <form action={completeMockAcademyCheckoutAction} className="mt-8 space-y-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="providerSessionId" value={providerSessionId} />
        <input type="hidden" name="trackingCode" value={session.paymentIntent.trackingCode ?? ""} />
        <button
          type="submit"
          name="outcome"
          value="paid"
          className="w-full rounded-xl bg-emerald-600 py-3 text-white"
        >
          پرداخت موفق (آزمایشی)
        </button>
        <button
          type="submit"
          name="outcome"
          value="failed"
          className="w-full rounded-xl border py-3"
        >
          پرداخت ناموفق
        </button>
      </form>
    </main>
  );
}
