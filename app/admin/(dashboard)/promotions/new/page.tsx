import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PromotionEditorForm } from "@/components/admin/promotions/PromotionEditorForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { listFlowOptions, listStaffOptions } from "@/lib/promotions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پروموشن جدید" };

export default async function AdminNewPromotionPage() {
  const session = await requirePermission("promotions.manage");
  const [flowOptions, staffOptions] = await Promise.all([
    listFlowOptions(session.organization.id),
    listStaffOptions(session.organization.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="پروموشن جدید"
        description="کد تخفیف، معرف، VIP یا تخفیف زمان‌دار"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "تخفیف‌ها", href: "/admin/promotions" },
          { label: "جدید" },
        ]}
        compact
      />
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
        <PromotionEditorForm
          mode="create"
          canManage
          flowOptions={flowOptions}
          staffOptions={staffOptions}
        />
      </div>
    </>
  );
}
