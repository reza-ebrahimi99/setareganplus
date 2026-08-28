import { notFound, permanentRedirect } from "next/navigation";
import { commerceOrderTrackingPath } from "@/lib/commerce/orders/qr";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ shortCode: string }>;
};

/**
 * Permanent short link — `/o/{shortCode}` (used by every SMS and QR).
 * Always 308-redirects to the full public tracking page.
 */
export default async function CommerceOrderShortLinkRoute({ params }: PageProps) {
  const { shortCode: raw } = await params;
  const shortCode = decodeURIComponent(raw).trim().toUpperCase();
  if (!shortCode) notFound();

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const order = await prisma.commerceOrder.findFirst({
    where: { organizationId: organization.id, shortCode },
    select: { orderNumber: true },
  });
  if (!order) notFound();

  permanentRedirect(commerceOrderTrackingPath(order.orderNumber));
}
