import type { Metadata } from "next";
import {
  CommerceFulfillmentStatus,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import { markOrderDeliveredAction } from "@/app/admin/(dashboard)/commerce/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  COMMERCE_FULFILLMENT_STATUS_LABELS,
} from "@/lib/commerce/booklet";
import { listAdminCommerceOrders } from "@/lib/commerce/orders/service";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سفارش‌های فروشگاه",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: "پرداخت‌نشده",
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازگشت وجه",
  PARTIAL: "جزئی",
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function AdminCommerceOrdersPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("commerce.orders.view");
  const params = await searchParams;
  const q = first(params.q);
  const paymentStatus = first(params.paymentStatus);
  const fulfillmentStatus = first(params.fulfillmentStatus);

  const orders = await listAdminCommerceOrders({
    organizationId: session.organization.id,
    q,
    paymentStatus: paymentStatus as CommerceOrderPaymentStatus | "",
    fulfillmentStatus: fulfillmentStatus as CommerceFulfillmentStatus | "",
  });

  const canManage = true;

  return (
    <>
      <AdminPageHeader
        title="سفارش‌ها"
        description="سفارش‌های فروشگاه و تحویل حضوری"
        breadcrumbs={adminBreadcrumbs.commerceOrders}
        compact
      />

      <form className="mb-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-4">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="نام، موبایل، شماره سفارش، محصول"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">وضعیت پرداخت</span>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">همه</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">وضعیت تحویل</span>
          <select
            name="fulfillmentStatus"
            defaultValue={fulfillmentStatus}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">همه</option>
            {Object.entries(COMMERCE_FULFILLMENT_STATUS_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white"
          >
            اعمال فیلتر
          </button>
        </div>
      </form>

      {orders.length === 0 ? (
        <AdminEmptyState
          title="سفارشی یافت نشد"
          description="پس از خرید موفق، سفارش‌ها اینجا نمایش داده می‌شوند."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="min-w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-3 text-right font-medium">خریدار</th>
                <th className="px-3 py-3 text-right font-medium">محصول</th>
                <th className="px-3 py-3 text-right font-medium">مبلغ</th>
                <th className="px-3 py-3 text-right font-medium">پرداخت</th>
                <th className="px-3 py-3 text-right font-medium">تحویل</th>
                <th className="px-3 py-3 text-right font-medium">تاریخ</th>
                <th className="px-3 py-3 text-right font-medium">پیگیری</th>
                <th className="px-3 py-3 text-right font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium">{order.buyerName ?? "—"}</div>
                    <div className="text-xs text-muted" dir="ltr">
                      {order.buyerMobile
                        ? toPersianDigits(order.buyerMobile)
                        : "—"}
                    </div>
                    <div className="mt-1 text-xs text-muted" dir="ltr">
                      {toPersianDigits(order.orderNumber)}
                    </div>
                  </td>
                  <td className="px-3 py-3">{order.productTitle}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatRials(order.grandTotalRials)}
                  </td>
                  <td className="px-3 py-3">
                    {PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </td>
                  <td className="px-3 py-3">
                    {order.fulfillmentStatus
                      ? COMMERCE_FULFILLMENT_STATUS_LABELS[
                          order.fulfillmentStatus
                        ]
                      : "—"}
                    {order.deliveredAt ? (
                      <p className="mt-1 text-xs text-muted">
                        {formatJalaliDateTimeShort(order.deliveredAt)}
                        {order.deliveredByName
                          ? ` · ${order.deliveredByName}`
                          : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatJalaliDateTimeShort(order.createdAt)}
                  </td>
                  <td className="px-3 py-3" dir="ltr">
                    {order.trackingCode
                      ? toPersianDigits(order.trackingCode)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {canManage &&
                    order.paymentStatus === CommerceOrderPaymentStatus.PAID &&
                    order.fulfillmentStatus ===
                      CommerceFulfillmentStatus.AWAITING_PICKUP ? (
                      <form action={markOrderDeliveredAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900"
                        >
                          تحویل داده شد
                        </button>
                      </form>
                    ) : (
                      "—"
                    )}
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
