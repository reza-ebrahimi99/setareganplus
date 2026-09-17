import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PosTerminal } from "@/components/admin/book-pos/PosTerminal";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "فروش جدید",
};

export default async function BookPosSalePage() {
  await requirePermission("commerce.orders.manage");
  return (
    <>
      <AdminPageHeader
        title="فروش جدید"
        description="فروش سریع کتاب قلم‌چی — انتخاب دانش‌آموز، کتاب‌ها و ثبت فاکتور."
        breadcrumbs={adminBreadcrumbs.bookPosSale}
        compact
      />
      <PosTerminal />
    </>
  );
}
