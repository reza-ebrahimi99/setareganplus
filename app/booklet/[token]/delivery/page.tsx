import { notFound } from "next/navigation";
import { CommerceQrImg } from "@/components/commerce/CommerceQrImg";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { getPublicBookletTicket } from "@/lib/commerce/orders/public-ticket";
import { parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { PrintQueueButton } from "@/components/admin/commerce/PrintQueueButton";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata() {
  return createPageMetadata({
    path: "/booklet",
    title: "رسید تحویل جزوه | ستارگان پلاس",
    description: "رسید تحویل حضوری جزوه.",
    robots: { index: false, follow: false },
  });
}

export default async function BookletDeliveryReceiptPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = parseCommerceOrderQrInput(decodeURIComponent(raw)) ?? decodeURIComponent(raw).trim();
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }
  const ticket = await getPublicBookletTicket({
    organizationId: organization.id,
    token,
  });
  if (!ticket?.delivered) notFound();

  return (
    <PublicFormShell>
      <article className="booklet-receipt mx-auto max-w-lg rounded-3xl border border-border bg-white p-5">
        <h1 className="text-center text-xl font-bold text-emerald-800">رسید تحویل جزوه</h1>
        <dl className="mt-5 space-y-2 text-sm leading-7">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">دانش‌آموز</dt>
            <dd>{ticket.studentName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">جزوه</dt>
            <dd className="text-left">{ticket.booklet}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">محل دریافت</dt>
            <dd>{ticket.pickupBranch?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">تحویل‌دهنده</dt>
            <dd>{ticket.deliveredByName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">زمان تحویل</dt>
            <dd>{ticket.deliveredAtLabel ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">شماره سفارش</dt>
            <dd dir="ltr">{toPersianDigits(ticket.orderNumber)}</dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-center">
          <CommerceQrImg src={ticket.qrDataUrl} alt="QR" size={200} />
        </div>
        {ticket.signatureDataUrl ? (
          <div className="mt-4">
            <p className="text-xs text-muted">امضا</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ticket.signatureDataUrl} alt="امضا" className="mt-2 h-24 w-full rounded-xl border border-border bg-white object-contain" />
          </div>
        ) : ticket.pickupSignedBy ? (
          <p className="mt-3 text-sm">امضا: {ticket.pickupSignedBy}</p>
        ) : null}
        <div className="mt-5 print:hidden">
          <PrintQueueButton label="چاپ رسید تحویل" />
        </div>
      </article>
    </PublicFormShell>
  );
}
