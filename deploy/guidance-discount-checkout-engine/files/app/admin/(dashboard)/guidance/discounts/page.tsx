import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DiscountCodeManager } from "@/components/admin/guidance/DiscountCodeManager";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import { listGuidanceDiscountCodes } from "@/lib/guidance/discounts/store";
import { listDiscountPreviewPackages } from "@/lib/guidance/packages/resolve-payable";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مدیریت کدهای تخفیف" };

export default async function GuidanceDiscountCodesPage() {
  const session = await requirePermission("settings.manage");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) notFound();

  const rows = await listGuidanceDiscountCodes({
    organizationId: session.organization.id,
  });

  return (
    <div className="gdm-page">
      <AdminPageHeader
        title="مدیریت کدهای تخفیف"
        description="ساخت و مدیریت کدهای تخفیف بسته‌های انتخاب رشته"
        breadcrumbs={[
          ...adminBreadcrumbs.guidance,
          { label: "کدهای تخفیف" },
        ]}
      />
      <p className="gdm-page__note">
        اعتبارسنجی و محاسبه هنگام پرداخت فقط روی سرور انجام می‌شود. کدهای قدیمی محیطی همچنان به‌عنوان پشتیبان کار می‌کنند.
        <Link href="/admin/guidance">بازگشت به میز کار مشاور</Link>
      </p>
      <DiscountCodeManager
        packages={listDiscountPreviewPackages()}
        rows={rows.map((row) => ({
          id: row.id,
          code: row.code,
          type: row.type,
          value: row.value,
          packageScope: row.packageScope,
          startsAt: row.startsAt?.toISOString() ?? null,
          endsAt: row.endsAt?.toISOString() ?? null,
          maxUses: row.maxUses,
          usageCount: row.usageCount,
          isActive: row.isActive,
          note: row.note,
        }))}
      />
    </div>
  );
}
