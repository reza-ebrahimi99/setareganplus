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
import { listCommerceOpsNotifications } from "@/lib/commerce/orders/notify";
import {
  getAdminCommerceOrderDetail,
  listAdminCommerceOrders,
  listCommerceBranchesForOps,
  listCommerceItemOptionsForOps,
} from "@/lib/commerce/orders/service";
import { listCommerceHandoverStaff } from "@/lib/commerce/orders/staff";
import { buildOpsTimelineNodes } from "@/lib/commerce/orders/timeline-view";
import { commerceOpsStageIndex } from "@/lib/commerce/orders/ops-stage";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مرکز عملیات جزوه",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function toListItem(
  order: Awaited<ReturnType<typeof listAdminCommerceOrders>>[number],
): OrderOpsListItem {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    buyerName: order.buyerName,
    buyerFirstName: order.buyerFirstName,
    buyerLastName: order.buyerLastName,
    parentName: order.parentName,
    buyerMobile: order.buyerMobile,
    buyerNationalCode: order.buyerNationalCode,
    studentGrade: order.studentGrade,
    studentGradeLabel: order.studentGradeLabel,
    studentMajor: order.studentMajor,
    studentMajorLabel: order.studentMajorLabel,
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
    lastActivityIsRollback: order.lastActivityIsRollback,
    createdAtLabel: formatJalaliDateTimeShort(order.createdAt),
    branch: order.branch,
    pickupBranch: order.pickupBranch,
    handoverStaffUserId: order.handoverStaffUserId,
    handoverStaffName: order.handoverStaffName,
    urgentDelivery: order.urgentDelivery,
    opsVip: order.opsVip,
    qrToken: order.qrToken,
    notes: order.notes,
    priority: order.priority,
    delayed: order.delayed,
    delayKind: order.delayKind,
    healthScore: order.healthScore,
    healthLevel: order.healthLevel,
    progressPercent: Math.round(
      ((commerceOpsStageIndex(order.opsStage) + 1) / 5) * 100,
    ),
  };
}

const KPI_HREF: Record<string, string> = {
  today: "/admin/commerce/orders?today=1",
  waitingPayment: "/admin/commerce/orders?opsStage=REGISTERED",
  production: "/admin/commerce/orders?opsStage=IN_PRODUCTION",
  ready: "/admin/commerce/orders?ready=1",
  deliveredToday: "/admin/commerce/orders?deliveredToday=1",
  delayed: "/admin/commerce/orders?delayed=1",
  todayRevenue: "/admin/commerce/orders?today=1&paidOnly=1",
};

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
    mineUserId: parsed.mine ? session.user.id : undefined,
  };

  const [orders, branches, staff, items, detail, kpiCounts, notifications] =
    await Promise.all([
      listAdminCommerceOrders(listFilters),
      listCommerceBranchesForOps({
        organizationId: session.organization.id,
        allowedBranchIds,
      }),
      listCommerceHandoverStaff(session.organization.id),
      listCommerceItemOptionsForOps(session.organization.id),
      selectedOrderId
        ? getAdminCommerceOrderDetail({
            organizationId: session.organization.id,
            orderId: selectedOrderId,
            allowedBranchIds,
          })
        : Promise.resolve(null),
      loadOrderOpsKpiCounts({
        organizationId: session.organization.id,
        allowedBranchIds,
      }),
      listCommerceOpsNotifications({
        organizationId: session.organization.id,
        userId: session.user.id,
      }),
    ]);

  const canManage = hasPermission(session, "commerce.orders.manage");
  const canRollback = hasPermission(session, "commerce.orders.rollback");
  const kpis = formatOrderOpsKpis(kpiCounts);

  const listItems: OrderOpsListItem[] = orders.map(toListItem);

  const detailView: OrderOpsDetailView | null = detail
    ? {
        ...toListItem(detail),
        notes: detail.notes,
        specialNotes: detail.specialNotes,
        deliveryNote: detail.deliveryNote,
        buyerEmail: detail.buyerEmail,
        paymentTrackingCode: detail.paymentTrackingCode,
        bookletPaymentMethodLabel: detail.bookletPaymentMethodLabel,
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

  const girls = branches.find((branch) => branch.bookletOpsKey === "GIRLS");
  const boys = branches.find((branch) => branch.bookletOpsKey === "BOYS");
  const elementary = branches.find((branch) => branch.bookletOpsKey === "ELEMENTARY");

  return (
    <>
      <AdminPageHeader
        title="مرکز عملیات جزوه"
        description="تولید، آماده‌سازی و تحویل حضوری جزوه — یک نگاه، مرحله بعد مشخص است"
        breadcrumbs={adminBreadcrumbs.commerceOrders}
        compact
      />
      <OrderOpsWorkspace
        orders={listItems}
        kpis={kpis.map((kpi) => ({
          key: kpi.key,
          label: kpi.label,
          valueLabel:
            kpi.key === "avgProcessing" || kpi.key === "avgDelivery"
              ? kpi.value
                ? `${toPersianDigits(kpi.value)} دقیقه`
                : "—"
              : kpi.tone === "revenue"
                ? formatRials(kpi.value)
                : toPersianDigits(kpi.value),
          hint: kpi.hint,
          tone: kpi.tone,
          href:
            KPI_HREF[kpi.key] ??
            (kpi.key === "girls" && girls
              ? `/admin/commerce/orders?branchId=${girls.id}`
              : kpi.key === "boys" && boys
                ? `/admin/commerce/orders?branchId=${boys.id}`
                : kpi.key === "elementary" && elementary
                  ? `/admin/commerce/orders?branchId=${elementary.id}`
                  : undefined),
        }))}
        branches={branches}
        staff={staff}
        items={items}
        filters={{
          q: parsed.q ?? "",
          branchId: parsed.branchId ?? "",
          pickupBranchId: parsed.pickupBranchId ?? "",
          opsStage: parsed.opsStage ?? "",
          studentGrade: parsed.studentGrade ?? "",
          studentMajor: parsed.studentMajor ?? "",
          handoverStaffUserId: parsed.handoverStaffUserId ?? "",
          dateFrom: parsed.dateFrom ?? "",
          dateTo: parsed.dateTo ?? "",
          datePreset: parsed.datePreset ?? "",
          todayOnly: Boolean(parsed.todayOnly),
          paidOnly: Boolean(parsed.paidOnly),
          waitingProduction: Boolean(parsed.waitingProduction),
          readyForPickup: Boolean(parsed.readyForPickup),
          deliveredOnly: Boolean(parsed.deliveredOnly),
          deliveredToday: Boolean(parsed.deliveredToday),
          undeliveredOnly: Boolean(parsed.undeliveredOnly),
          delayedOnly: Boolean(parsed.delayedOnly),
          mine: Boolean(parsed.mine),
          opsVipOnly: Boolean(parsed.opsVipOnly),
          sort: parsed.sort === "priority" ? "priority" : "createdAt",
          yesterday: parsed.datePreset === "yesterday",
          thisWeek: parsed.datePreset === "thisWeek",
          thisMonth: parsed.datePreset === "thisMonth",
        }}
        exportHref={`/admin/commerce/orders/export.xlsx${commerceOrderExportQuery(parsed)}`}
        selectedOrderId={selectedOrderId}
        detail={detailView}
        filteredTotal={orders.length}
        delayedCount={kpiCounts.delayed}
        canManage={canManage}
        canRollback={canRollback}
        unreadCount={notifications.unreadCount}
        notifications={notifications.latest.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          entityId: item.entityId,
          read: Boolean(item.readAt),
          createdAtLabel: formatJalaliDateTimeShort(item.createdAt),
        }))}
      />
    </>
  );
}
