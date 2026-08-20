import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PrintQueueButton } from "@/components/admin/commerce/PrintQueueButton";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadProductionQueue } from "@/lib/commerce/orders/production-queue";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "صف تولید جزوه",
};

const STATUS_LABEL = {
  printing: "در حال چاپ",
  ready: "آماده",
  waiting: "در انتظار",
} as const;

const STATUS_CLASS = {
  printing: "border-orange-300 bg-orange-50 text-orange-900",
  ready: "border-sky-300 bg-sky-50 text-sky-900",
  waiting: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

export default async function CommerceProductionQueuePage() {
  const session = await requirePermission("commerce.orders.view");
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;
  const rows = await loadProductionQueue({
    organizationId: session.organization.id,
    allowedBranchIds,
  });

  return (
    <>
      <AdminPageHeader
        title="صف تولید"
        description="گروه‌بندی بر اساس جزوه — امروز چه چیزی باید چاپ شود"
        breadcrumbs={adminBreadcrumbs.commerceProduction}
        compact
      />
      <div className="mb-4 print:hidden">
        <PrintQueueButton label="چاپ صف" />
      </div>
      {rows.length === 0 ? (
        <AdminEmptyState
          title="صف تولید خالی است"
          description="سفارش پرداخت‌شده یا در جریان تولید اینجا جمع می‌شود."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">جزوه</th>
                <th className="px-4 py-3 text-right font-medium">امروز</th>
                <th className="px-4 py-3 text-right font-medium">دختران</th>
                <th className="px-4 py-3 text-right font-medium">پسران</th>
                <th className="px-4 py-3 text-right font-medium">ابتدایی</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.bookletTitle}</p>
                    <p className="text-xs text-muted">{row.gradeLabel ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{toPersianDigits(row.todayCopies)}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.girls)}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.boys)}</td>
                  <td className="px-4 py-3">{toPersianDigits(row.elementary)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] ${STATUS_CLASS[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                    <p className="mt-1 text-[11px] text-muted">
                      چاپ {toPersianDigits(row.printing)} · آماده {toPersianDigits(row.ready)} · انتظار {toPersianDigits(row.waiting)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
