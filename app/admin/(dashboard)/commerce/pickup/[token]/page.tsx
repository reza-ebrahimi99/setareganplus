import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import { OrderNextAction } from "@/components/admin/commerce/OrderNextAction";
import { OrderQrThumb } from "@/components/admin/commerce/OrderQrThumb";
import {
  OrderDelayBadge,
  OrderHealthBadge,
  OrderPriorityBadge,
} from "@/components/admin/commerce/OrderOpsSignals";
import { PickupLookupForm } from "@/components/admin/commerce/PickupLookupForm";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { getCommerceOrderByQrToken } from "@/lib/commerce/orders/pickup";
import { getAdminCommerceOrderDetail } from "@/lib/commerce/orders/service";
import { listCommerceHandoverStaff } from "@/lib/commerce/orders/staff";
import { buildCommerceOpsIntelligence } from "@/lib/commerce/orders/intelligence";
import { COMMERCE_OPS_STAGE_LABELS } from "@/lib/commerce/orders/ops-stage";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دریافت سفارش",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function CommercePickupTokenPage({ params }: PageProps) {
  const session = await requirePermission("commerce.orders.view");
  const { token } = await params;
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;
  const pickup = await getCommerceOrderByQrToken({
    organizationId: session.organization.id,
    token: decodeURIComponent(token),
    allowedBranchIds,
  });
  const canManage = hasPermission(session, "commerce.orders.manage");
  const staff = await listCommerceHandoverStaff(session.organization.id);

  if (!pickup) {
    return (
      <>
        <AdminPageHeader
          title="میز دریافت"
          description="کد QR یافت نشد"
          breadcrumbs={adminBreadcrumbs.commercePickup}
          compact
        />
        <AdminEmptyState
          title="سفارشی با این QR نیست"
          description="کد را دوباره اسکن کنید یا شناسه را وارد کنید."
        />
        <div className="mt-6">
          <PickupLookupForm initialToken={decodeURIComponent(token)} />
        </div>
      </>
    );
  }

  const detail = await getAdminCommerceOrderDetail({
    organizationId: session.organization.id,
    orderId: pickup.id,
    allowedBranchIds,
  });
  const intel = detail
    ? {
        priority: detail.priority,
        delayed: detail.delayed,
        delayKind: detail.delayKind,
        healthScore: detail.healthScore,
        healthLevel: detail.healthLevel,
      }
    : buildCommerceOpsIntelligence({
        opsStage: pickup.opsStage,
        paymentPaid: pickup.paymentPaid,
        urgentDelivery: false,
        opsVip: false,
      });

  return (
    <>
      <AdminPageHeader
        title="میز دریافت"
        description={`${pickup.buyerName ?? "سفارش"} · ${toPersianDigits(pickup.orderNumber)}`}
        breadcrumbs={adminBreadcrumbs.commercePickup}
        compact
      />
      <article className="mx-auto max-w-xl space-y-5 rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold">{pickup.buyerName ?? "—"}</p>
            <p className="mt-1 text-sm text-muted" dir="ltr">
              {pickup.buyerMobile ? toPersianDigits(pickup.buyerMobile) : "—"}
            </p>
            <p className="mt-2 text-sm">
              {pickup.studentGradeLabel ?? "—"}
              {pickup.studentMajorLabel ? ` · ${pickup.studentMajorLabel}` : ""}
            </p>
          </div>
          <OrderQrThumb token={pickup.qrToken} size={88} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <OrderPriorityBadge priority={intel.priority} />
          <OrderDelayBadge delayed={intel.delayed} delayKind={intel.delayKind} />
          <OrderHealthBadge score={intel.healthScore} level={intel.healthLevel} />
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px]">
            {COMMERCE_OPS_STAGE_LABELS[pickup.opsStage]}
          </span>
        </div>
        <p className="text-lg font-medium leading-8">{pickup.productTitle}</p>
        <p className="text-sm text-muted">{formatRials(pickup.grandTotalRials)}</p>
        <div className="flex flex-col gap-2">
          <OrderBranchBadge branch={pickup.branch} prefix="محصول:" size="md" />
          <OrderBranchBadge branch={pickup.pickupBranch} prefix="دریافت:" size="md" />
        </div>
        <p className="text-sm">مسئول: {pickup.handoverStaffName ?? "هنوز انتخاب نشده"}</p>
        {pickup.parentName ? <p className="text-sm text-muted">والد: {pickup.parentName}</p> : null}
        {canManage ? (
          <div className="sticky bottom-3 rounded-2xl border border-border bg-background p-3">
            <OrderNextAction
              orderId={pickup.id}
              opsStage={pickup.opsStage}
              paymentPaid={pickup.paymentPaid}
              canManage={canManage}
              staff={staff}
              defaultHandoverStaffUserId={pickup.handoverStaffUserId}
              large
              showSignature
              from={`/admin/commerce/pickup/${encodeURIComponent(pickup.qrToken)}`}
            />
          </div>
        ) : null}
      </article>
    </>
  );
}
