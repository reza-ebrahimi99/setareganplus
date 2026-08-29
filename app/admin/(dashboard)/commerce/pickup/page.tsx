import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PickupDeskSearch } from "@/components/admin/commerce/PickupDeskSearch";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminCommerceOrders } from "@/lib/commerce/orders/service";
import {
  loadPickupDeskStats,
  resolveCommercePickupScan,
} from "@/lib/commerce/orders/pickup";
import { parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";
import { COMMERCE_OPS_STAGE_LABELS } from "@/lib/commerce/orders/ops-stage";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "میز دریافت جزوه",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function CommercePickupIndexPage({ searchParams }: PageProps) {
  const session = await requirePermission("commerce.orders.view");
  const params = await searchParams;
  const q = first(params.q);
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;

  const token = parseCommerceOrderQrInput(q);
  if (token) {
    const scanned = await resolveCommercePickupScan({
      organizationId: session.organization.id,
      token,
      allowedBranchIds,
    });
    if (scanned.status !== "not_found") {
      redirect(`/admin/commerce/pickup/${encodeURIComponent(token)}`);
    }
  }

  const [stats, results] = await Promise.all([
    loadPickupDeskStats({
      organizationId: session.organization.id,
      userId: session.user.id,
      allowedBranchIds,
    }),
    q
      ? listAdminCommerceOrders({
          organizationId: session.organization.id,
          allowedBranchIds,
          q,
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const cards = [
    { key: "ready", label: "آماده تحویل", value: stats.ready, tone: "info" },
    { key: "delivered", label: "تحویل امروز", value: stats.deliveredToday, tone: "success" },
    { key: "waiting", label: "منتظر تولید", value: stats.waitingProduction, tone: "default" },
    { key: "vip", label: "VIP", value: stats.vip, tone: "warning" },
    { key: "delayed", label: "تاخیر", value: stats.delayed, tone: "danger" },
  ] as const;

  return (
    <>
      <AdminPageHeader
        title="میز دریافت"
        description="اسکن QR، پرونده سفارش، تحویل حضوری"
        breadcrumbs={adminBreadcrumbs.commercePickup}
        compact
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <article
            key={card.key}
            className={`rounded-2xl border px-4 py-4 ${
              card.tone === "danger"
                ? "border-red-200 bg-red-50"
                : card.tone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : card.tone === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-border bg-surface"
            }`}
          >
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{toPersianDigits(card.value)}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <PickupDeskSearch initialQuery={q} />
        <section className="rounded-3xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-primary">عملکرد امروز شما</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">تحویل‌های امروز</dt>
              <dd className="font-medium">{toPersianDigits(stats.todayDeliveries)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">میانگین زمان تحویل</dt>
              <dd className="font-medium">
                {stats.avgDeliveryMinutes == null
                  ? "—"
                  : `${toPersianDigits(stats.avgDeliveryMinutes)} دقیقه`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">آماده</dt>
              <dd className="font-medium">{toPersianDigits(stats.ready)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">در انتظار</dt>
              <dd className="font-medium">{toPersianDigits(stats.waitingProduction)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">تاخیری</dt>
              <dd className="font-medium">{toPersianDigits(stats.delayed)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {q ? (
        <section className="mt-5 rounded-3xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">نتایج جستجو</h2>
          {results.length === 0 ? (
            <p className="mt-3 text-sm text-muted">سفارشی پیدا نشد.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {results.map((order) => (
                <li key={order.id} className="py-3">
                  <Link
                    href={`/admin/commerce/pickup/${encodeURIComponent(order.qrToken)}`}
                    className="block rounded-xl px-2 py-1 hover:bg-background"
                  >
                    <p className="font-medium">{order.buyerName ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {toPersianDigits(order.orderNumber)} · {COMMERCE_OPS_STAGE_LABELS[order.opsStage]} ·{" "}
                      {order.pickupBranch?.name ?? "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}
