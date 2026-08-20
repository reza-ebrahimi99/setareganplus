import type { Metadata } from "next";
import { CommerceOrderPaymentStatus } from "@/generated/prisma/enums";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  OrderOpsWorkspace,
  type OrderOpsDetailView,
  type OrderOpsListItem,
} from "@/components/admin/commerce/OrderOpsWorkspace";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { COMMERCE_PAYMENT_STATUS_LABELS } from "@/lib/commerce/booklet";
import { formatOrderOpsKpis, loadOrderOpsKpiCounts } from "@/lib/commerce/orders/kpis";
import {
  commerceOrderExportQuery,
  parseAdminCommerceOrderFilters,
} from "@/lib/commerce/orders/filters";
import {
  getAdminCommerceOrderDetail,
  listAdminCommerceOrders,
  listCommerceBranchesForOps,
} from "@/lib/commerce/orders/service";
import { buildOpsTimelineNodes } from "@/lib/commerce/orders/timeline-view";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مرکز عملیات سفارش",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const parsed = parseAdminCommerceOrderFilters(params);
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;
  const selectedOrderId = first(params.orderId) || null;

  const listFilters = {
    ...parsed,
    organizationId: session.organization.id,
    allowedBranchIds,
  };

  const [orders, branches, detail, kpiCounts] = await Promise.all([
    listAdminCommerceOrders(listFilters),
    listCommerceBranchesForOps({
      organizationId: session.organization.id,
      allowedBranchIds,
    }),
    selectedOrderId
      ? getAdminCommerceOrderDetail({
          organizationId: session.organization.id,
          orderId: selectedOrderId,
          allowedBranchIds,
        })
      : Promise.resolve(null),
    loadOrderOpsKpiCounts(listFilters),
  ]);

  const canManage = hasPermission(session, "commerce.orders.manage");
  const canRollback = hasPermission(session, "commerce.orders.rollback");
  const kpis = formatOrderOpsKpis(kpiCounts, branches);

  const listItems: OrderOpsListItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerMobile: order.buyerMobile,
    productTitle: order.productTitle,
    amountLabel: formatRials(order.grandTotalRials),
    paymentLabel:
      COMMERCE_PAYMENT_STATUS_LABELS[
        order.paymentStatus as keyof typeof COMMERCE_PAYMENT_STATUS_LABELS
      ] ?? order.paymentStatus,
    paymentPaid: order.paymentStatus === CommerceOrderPaymentStatus.PAID,
    opsStage: order.opsStage,
    lastActivityTitle: order.lastActivityTitle,
    lastActivityAtLabel: formatJalaliDateTimeShort(order.lastActivityAt),
    createdAtLabel: formatJalaliDateTimeShort(order.createdAt),
    branch: order.branch,
  }));

  const detailView: OrderOpsDetailView | null = detail
    ? {
        id: detail.id,
        orderNumber: detail.orderNumber,
        buyerName: detail.buyerName,
        buyerMobile: detail.buyerMobile,
        productTitle: detail.productTitle,
        amountLabel: formatRials(detail.grandTotalRials),
        paymentLabel:
          COMMERCE_PAYMENT_STATUS_LABELS[
            detail.paymentStatus as keyof typeof COMMERCE_PAYMENT_STATUS_LABELS
          ] ?? detail.paymentStatus,
        paymentPaid: detail.paymentStatus === CommerceOrderPaymentStatus.PAID,
        opsStage: detail.opsStage,
        lastActivityTitle: detail.lastActivityTitle,
        lastActivityAtLabel: formatJalaliDateTimeShort(detail.lastActivityAt),
        createdAtLabel: formatJalaliDateTimeShort(detail.createdAt),
        branch: detail.branch,
        notes: detail.notes,
        deliveryNote: detail.deliveryNote,
        buyerEmail: detail.buyerEmail,
        paymentTrackingCode: detail.paymentTrackingCode,
        deliveredAtLabel: detail.deliveredAt
          ? formatJalaliDateTimeShort(detail.deliveredAt)
          : null,
        deliveredByName: detail.deliveredByName,
        items: detail.items.map((item) => ({
          id: item.id,
          title: item.title,
          quantityLabel: toPersianDigits(item.quantity),
          unitPriceLabel: formatRials(item.unitPriceRials),
          totalLabel: formatRials(item.totalRials),
        })),
        timeline: buildOpsTimelineNodes({
          current: detail.opsStage,
          events: detail.events.map((event) => ({
            stage: event.stage,
            title: event.title,
            note: event.note,
            occurredAtLabel: formatJalaliDateTimeShort(event.occurredAt),
            operatorName: event.operatorName,
          })),
        }),
        activity: detail.events.map((event) => ({
          id: event.id,
          title: event.title,
          note: event.note,
          occurredAtLabel: formatJalaliDateTimeShort(event.occurredAt),
          operatorName: event.operatorName,
        })),
      }
    : null;

  return (
    <>
      <AdminPageHeader
        title="مرکز عملیات سفارش"
        description="پیگیری تولید جزوه، آماده‌سازی و تحویل حضوری به دانش‌آموز"
        breadcrumbs={adminBreadcrumbs.commerceOrders}
        compact
      />
      <OrderOpsWorkspace
        orders={listItems}
        kpis={kpis.map((kpi) => ({
          key: kpi.key,
          label: kpi.label,
          valueLabel: toPersianDigits(kpi.value),
          hint: kpi.hint,
        }))}
        branches={branches}
        filters={{
          q: parsed.q ?? "",
          branchId: parsed.branchId ?? "",
          opsStage: parsed.opsStage ?? "",
          dateFrom: parsed.dateFrom ?? "",
          dateTo: parsed.dateTo ?? "",
          todayOnly: Boolean(parsed.todayOnly),
          paidOnly: Boolean(parsed.paidOnly),
          waitingProduction: Boolean(parsed.waitingProduction),
          readyForPickup: Boolean(parsed.readyForPickup),
          deliveredOnly: Boolean(parsed.deliveredOnly),
          undeliveredOnly: Boolean(parsed.undeliveredOnly),
        }}
        exportHref={`/admin/commerce/orders/export.xlsx${commerceOrderExportQuery(parsed)}`}
        selectedOrderId={selectedOrderId}
        detail={detailView}
        filteredTotal={kpiCounts.total}
        canManage={canManage}
        canRollback={canRollback}
      />
    </>
  );
}
