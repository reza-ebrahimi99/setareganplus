import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  getPromotionReports,
  getReferralLeaderboard,
} from "@/lib/promotions/reports";
import { PROMOTION_TYPE_LABELS } from "@/lib/promotions/types";
import type { PromotionType } from "@/generated/prisma/enums";
import { formatTomansFromRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "گزارش پروموشن و معرف" };

export default async function AdminPromotionReportsPage() {
  const session = await requirePermission("reports.view");
  const [rows, leaders] = await Promise.all([
    getPromotionReports(session.organization.id),
    getReferralLeaderboard(session.organization.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="گزارش پروموشن و معرف"
        description="آمار استفاده، تخفیف، درآمد و رتبه معرف‌ها"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "گزارش‌ها" },
          { label: "پروموشن" },
        ]}
        compact
      />

      <section className="mb-8 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-primary">همه پروموشن‌ها</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/reports/promotions/export"
              className="text-xs font-medium text-secondary hover:underline"
            >
              خروجی CSV
            </a>
            <Link
              href="/admin/promotions"
              className="text-xs font-medium text-secondary hover:underline"
            >
              مدیریت پروموشن‌ها
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-muted">
              <tr>
                <th className="px-3 py-2.5 text-right font-medium">عنوان</th>
                <th className="px-3 py-2.5 text-right font-medium">نوع</th>
                <th className="px-3 py-2.5 text-right font-medium">استفاده</th>
                <th className="px-3 py-2.5 text-right font-medium">تخفیف</th>
                <th className="px-3 py-2.5 text-right font-medium">درآمد</th>
                <th className="px-3 py-2.5 text-right font-medium">نرخ تبدیل</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted"
                  >
                    داده‌ای نیست.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/promotions/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.title}
                      </Link>
                      {row.code ? (
                        <span className="mt-0.5 block text-xs text-muted" dir="ltr">
                          {row.code}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      {PROMOTION_TYPE_LABELS[row.type as PromotionType] ??
                        row.type}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(row.usageCount))}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatTomansFromRials(row.totalDiscountRials)}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatTomansFromRials(row.revenueRials)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(
                        String(Math.round(row.conversionRate * 100)),
                      )}
                      ٪
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-primary">رتبه معرف‌ها</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-slate-50 text-muted">
              <tr>
                <th className="px-3 py-2.5 text-right font-medium">رتبه</th>
                <th className="px-3 py-2.5 text-right font-medium">معرف</th>
                <th className="px-3 py-2.5 text-right font-medium">کدها</th>
                <th className="px-3 py-2.5 text-right font-medium">ثبت‌نام</th>
                <th className="px-3 py-2.5 text-right font-medium">فروش</th>
                <th className="px-3 py-2.5 text-right font-medium">تخفیف</th>
              </tr>
            </thead>
            <tbody>
              {leaders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-muted"
                  >
                    هنوز کد معرفی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                leaders.map((row, index) => (
                  <tr
                    key={row.ownerStaffId}
                    className="border-b border-border/60"
                  >
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(index + 1))}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {row.ownerStaffName}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(row.promotionCount))}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {toPersianDigits(String(row.registrationCount))}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatTomansFromRials(row.totalSalesRials)}
                    </td>
                    <td className="px-3 py-2.5">
                      {formatTomansFromRials(row.totalDiscountRials)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
