import { notFound } from "next/navigation";
import { BookletPublicTicket } from "@/components/commerce/BookletPublicTicket";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { getPublicBookletTicket } from "@/lib/commerce/orders/public-ticket";
import { parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata() {
  return createPageMetadata({
    path: "/booklet",
    title: "رسید و QR جزوه | ستارگان پلاس",
    description: "رسید دریافت حضوری جزوه.",
    robots: { index: false, follow: false },
  });
}

export default async function PublicBookletTicketPage({ params }: PageProps) {
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
  if (!ticket) notFound();

  return (
    <PublicFormShell>
      <BookletPublicTicket ticket={ticket} />
    </PublicFormShell>
  );
}
