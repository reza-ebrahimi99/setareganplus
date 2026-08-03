import type { Metadata } from "next";
import Link from "next/link";
import {
  CommerceFulfillmentStatus,
  CommerceOrderPaymentStatus,
} from "@/generated/prisma/enums";
import { markOrderDeliveredAction } from "@/app/admin/(dashboard)/commerce/actions";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  COMMERCE_FULFILLMENT_STATUS_LABELS,
} from "@/lib/commerce/booklet";
import {
  listAdminCommerceOrders,
  listCommerceProductFilterOptions,
} from "@/lib/commerce/orders/service";
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
  const buyerName = first(params.buyerName);
  const buyerMobile = first(params.buyerMobile);
  const productQuery = first(params.productQuery);
  const itemId = first(params.itemId);
  const paymentStatus = first(params.paymentStatus);
  const fulfillmentStatus = first(params.fulfillmentStatus);
  const paidOnly = first(params.paidOnly) === "1";
  const undeliveredOnly = first(params.undeliveredOnly) === "1";
  const dateFrom = first(params.dateFrom);
  const dateTo = first(params.dateTo);

  const [orders, products] = await Promise.all([
    listAdminCommerceOrders({
      organizationId: session.organization.id,
      q,
      buyerName,
      buyerMobile,
      productQuery,
      itemId,
      paymentStatus: paymentStatus as CommerceOrderPaymentStatus | "",
      fulfillmentStatus: fulfillmentStatus as CommerceFulfillmentStatus | "",
      paidOnly,
      undeliveredOnly,
      dateFrom,
      dateTo,
    }),
    listCommerceProductFilterOptions(session.organization.id),
  ]);

  const canManage = hasPermission(session, "commerce.orders.manage");

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (buyerName) exportParams.set("buyerName", buyerName);
  if (buyerMobile) exportParams.set("buyerMobile", buyerMobile);
  if (productQuery) exportParams.set("productQuery", productQuery);
  if (itemId) exportParams.set("itemId", itemId);
  if (paymentStatus) exportParams.set("paymentStatus", paymentStatus);
  if (fulfillmentStatus) exportParams.set("fulfillmentStatus", fulfillmentStatus);
  if (paidOnly) exportParams.set("paidOnly", "1");
  if (undeliveredOnly) exportParams.set("undeliveredOnly", "1");
  if (dateFrom) exportParams.set("dateFrom", dateFrom);
  if (dateTo) exportParams.set("dateTo", dateTo);
  const exportHref = `/admin/commerce/orders/export.xlsx${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <>
      <AdminPageHeader
        title="سفارش‌ها"
        description="سفارش‌های فروشگاه و تحویل حضوری"
        breadcrumbs={adminBreadcrumbs.commerceOrders}
        compact
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {toPersianDigits(orders.length)} سفارش در نتیجه فیلتر
        </p>
        <Link
          href={exportHref}
          className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:bg-background"
        >
          خروجی اکسل
        </Link>
      </div>

      <form className="mb-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-2">
          <input
            type="checkbox"
            name="paidOnly"
            value="1"
            defaultChecked={paidOnly}
            className="size-4 rounded border-border"
          />
          <span>فقط پرداخت شده</span>
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-2">
          <input
            type="checkbox"
            name="undeliveredOnly"
            value="1"
            defaultChecked={undeliveredOnly}
            className="size-4 rounded border-border"
          />
          <span>فقط تحویل نشده</span>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">از تاریخ</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={dateFrom}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">تا تاریخ</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={dateTo}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">محصول</span>
          <select
            name="itemId"
            defaultValue={itemId}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">همه محصولات</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">جستجوی محصول</span>
          <input
            name="productQuery"
            defaultValue={productQuery}
            placeholder="عنوان محصول"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">جستجوی نام</span>
          <input
            name="buyerName"
            defaultValue={buyerName}
            placeholder="نام خریدار"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">جستجوی موبایل</span>
          <input
            name="buyerMobile"
            defaultValue={buyerMobile}
            placeholder="09…"
            dir="ltr"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted">جستجوی کلی</span>
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
            defaultValue={paidOnly ? "" : paymentStatus}
            disabled={paidOnly}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
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
            defaultValue={undeliveredOnly ? "" : fulfillmentStatus}
            disabled={undeliveredOnly}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
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
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white"
          >
            اعمال فیلتر
          </button>
          <Link
            href="/admin/commerce/orders"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm text-muted"
          >
            پاک کردن
          </Link>
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
                <th className="px-3 py-3 text-right font-medium">وضعیت پرداخت</th>
                <th className="px-3 py-3 text-right font-medium">وضعیت تحویل</th>
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
                      : "در انتظار تحویل"}
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
                          ثبت تحویل
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
