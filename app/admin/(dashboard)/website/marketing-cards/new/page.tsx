import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MarketingCardForm } from "@/components/admin/website/MarketingCardForm";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "کارت نمایندگی جدید" };

export default async function AdminNewMarketingCardPage() {
  await requirePermission("website.manage");

  return (
    <>
      <AdminPageHeader
        title="کارت نمایندگی جدید"
        description="افزودن کارت به بخش نمایندگی قلم‌چی صفحه اصلی"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "کارت‌های نمایندگی", href: "/admin/website/marketing-cards" },
          { label: "جدید" },
        ]}
        compact
      />
      <div className="mb-4">
        <Link
          href="/admin/website/marketing-cards"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          بازگشت به فهرست
        </Link>
      </div>
      <MarketingCardForm mode="create" />
    </>
  );
}
