import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PrintQueueButton } from "@/components/admin/commerce/PrintQueueButton";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { generateCommerceOrderQrDataUrl } from "@/lib/commerce/orders/qr";
import { listAdminCommerceOrders } from "@/lib/commerce/orders/service";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "برچسب سفارش",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function CommerceOrderLabelsPage({ searchParams }: PageProps) {
  const session = await requirePermission("commerce.orders.view");
  const params = await searchParams;
  const ids = first(params.ids)
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 80);
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;

  const orders = ids.length
    ? await listAdminCommerceOrders({
        organizationId: session.organization.id,
        allowedBranchIds,
        orderIds: ids,
        take: 80,
      })
    : [];

  const labels = await Promise.all(
    orders.map(async (order) => ({
      order,
      qr: await generateCommerceOrderQrDataUrl(order.qrToken, 180),
    })),
  );

  return (
    <>
      <AdminPageHeader
        title="برچسب‌های چاپ"
        description="QR، دانش‌آموز، پایه، رشته، جزوه، محل دریافت"
        breadcrumbs={adminBreadcrumbs.commerceLabels}
        compact
      />
      <div className="mb-4 print:hidden">
        <PrintQueueButton label="چاپ برچسب‌ها" />
      </div>
      {labels.length === 0 ? (
        <AdminEmptyState
          title="برچسبی برای چاپ نیست"
          description="از مرکز عملیات چند سفارش را انتخاب کنید و «چاپ برچسب» را بزنید."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
          {labels.map(({ order, qr }) => (
            <article
              key={order.id}
              className="ops-label break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4 text-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR" width={96} height={96} className="rounded-md" />
                <div className="min-w-0 text-right">
                  <p className="text-xs text-slate-500" dir="ltr">
                    {toPersianDigits(order.orderNumber)}
                  </p>
                  <p className="mt-1 text-base font-bold">{order.buyerName ?? "—"}</p>
                  <p className="mt-1 text-sm">
                    {order.studentGradeLabel ?? "—"}
                    {order.studentMajorLabel ? ` · ${order.studentMajorLabel}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-6">{order.productTitle}</p>
              <p className="mt-2 text-xs text-slate-600">
                دریافت: {order.pickupBranch?.name ?? "—"}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
