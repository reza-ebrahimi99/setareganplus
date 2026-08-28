import { notFound } from "next/navigation";
import { OrderTrackingPage } from "@/components/commerce/OrderTrackingPage";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { getPublicOrderTracking } from "@/lib/commerce/orders/public-ticket";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ orderNumber: string }>;
};

export async function generateMetadata() {
  return createPageMetadata({
    path: "/order",
    title: "پیگیری سفارش | ستارگان پلاس",
    description: "وضعیت، فاکتور و QR پیگیری سفارش.",
    robots: { index: false, follow: false },
  });
}

export default async function PublicOrderTrackingRoute({ params }: PageProps) {
  const { orderNumber: raw } = await params;
  const orderNumber = decodeURIComponent(raw).trim();

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const tracking = await getPublicOrderTracking({
    organizationId: organization.id,
    orderNumber,
  });
  if (!tracking) notFound();

  return (
    <PublicFormShell>
      <OrderTrackingPage tracking={tracking} />
    </PublicFormShell>
  );
}
