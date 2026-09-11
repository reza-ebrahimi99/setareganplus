import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { loadOrderOpsKpis } from "@/lib/commerce/orders/kpis";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "گزارش استاربوک",
};

export default async function AdminCommerceReportsPage() {
  const session = await requirePermission("commerce.reports.view");
  const organizationId = session.organization.id;
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;

  const [kpis, skuCount, visibleCount, featuredCount, lowStock] = await Promise.all([
    loadOrderOpsKpis({ organizationId, allowedBranchIds }),
    prisma.bookSku.count({ where: { organizationId, deletedAt: null } }),
    prisma.bookSku.count({
      where: { organizationId, deletedAt: null, isVisible: true },
    }),
    prisma.bookSku.count({
      where: { organizationId, deletedAt: null, isFeatured: true },
    }),
    prisma.bookSku.count({
      where: {
        organizationId,
        deletedAt: null,
        trackInventory: true,
        unlimitedStock: false,
        stockQuantity: { lte: 3 },
      },
    }),
  ]);

  const catalog = [
    { label: "کل BookSku", value: skuCount },
    { label: "نمایان در استاربوک", value: visibleCount },
    { label: "ویژه خانه", value: featuredCount },
    { label: "موجودی کم", value: lowStock },
  ];

  return (
    <>
      <AdminPageHeader
        title="گزارش فروشگاه"
        description="فروش و موجودی از همان سفارش‌ها و BookSku موجود — بدون انبار موازی"
        breadcrumbs={adminBreadcrumbs.commerceReports}
        compact
      />
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {catalog.map((card) => (
          <article key={card.label} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {toPersianDigits(card.value)}
            </p>
          </article>
        ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((card) => (
          <article key={card.key} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">
              {card.tone === "revenue"
                ? formatRials(card.value)
                : toPersianDigits(card.value)}
            </p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(8, card.value % 100))}%` }}
              />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
