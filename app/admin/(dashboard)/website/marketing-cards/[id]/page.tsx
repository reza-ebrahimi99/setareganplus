import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeleteMarketingCardButton } from "@/components/admin/website/DeleteMarketingCardButton";
import { MarketingCardForm } from "@/components/admin/website/MarketingCardForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { getAdminMarketingCard } from "@/lib/website/marketing-cards-admin";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `ویرایش کارت ${id.slice(0, 8)}` };
}

export default async function AdminEditMarketingCardPage({
  params,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const { id } = await params;
  const card = await getAdminMarketingCard(session.organization.id, id);
  if (!card) notFound();

  return (
    <>
      <AdminPageHeader
        title={card.title}
        description="ویرایش کارت نمایندگی صفحه اصلی"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "کارت‌های نمایندگی", href: "/admin/website/marketing-cards" },
          { label: card.title },
        ]}
        compact
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/marketing-cards"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          بازگشت به فهرست
        </Link>
        <DeleteMarketingCardButton cardId={card.id} />
      </div>
      <MarketingCardForm mode="edit" card={card} />
    </>
  );
}
