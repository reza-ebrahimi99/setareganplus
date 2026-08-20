import { Timeline } from "@/components/admin/Timeline";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import { OrderNextAction } from "@/components/admin/commerce/OrderNextAction";
import { OrderQrThumb } from "@/components/admin/commerce/OrderQrThumb";
import {
  OrderDelayBadge,
  OrderHealthBadge,
  OrderPriorityBadge,
} from "@/components/admin/commerce/OrderOpsSignals";
import type { OrderOpsListItem } from "@/components/admin/commerce/order-ops-types";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import {
  COMMERCE_OPS_STAGE_DOT,
  COMMERCE_OPS_STAGE_LABELS,
  COMMERCE_OPS_STAGES,
  commerceOpsStageIndex,
} from "@/lib/commerce/orders/ops-stage";
import { toPersianDigits } from "@/lib/persian";

function stageNodes(order: OrderOpsListItem) {
  return COMMERCE_OPS_STAGES.map((stage, index) => ({
    id: `${order.id}-${stage}`,
    label: COMMERCE_OPS_STAGE_LABELS[stage],
    status:
      index < commerceOpsStageIndex(order.opsStage)
        ? ("completed" as const)
        : index === commerceOpsStageIndex(order.opsStage)
          ? ("current" as const)
          : ("upcoming" as const),
    stage,
    dotClass: COMMERCE_OPS_STAGE_DOT[stage],
  }));
}

export function OrderOpsExpanded({
  order,
  staff,
  canManage,
}: {
  order: OrderOpsListItem;
  staff: readonly CommerceStaffOption[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-4 rounded-xl bg-background/70 p-3 md:grid-cols-3">
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-primary">خط زمان</h4>
        <Timeline nodes={stageNodes(order)} />
        <div className="flex flex-wrap gap-1.5">
          <OrderPriorityBadge priority={order.priority} />
          <OrderDelayBadge delayed={order.delayed} delayKind={order.delayKind} />
          <OrderHealthBadge score={order.healthScore} level={order.healthLevel} />
        </div>
      </section>
      <section className="space-y-1.5 text-sm">
        <h4 className="text-xs font-semibold text-primary">دانش‌آموز و تحصیلی</h4>
        <p>{order.buyerName ?? "—"}</p>
        <p className="text-xs text-muted">والد: {order.parentName ?? "—"}</p>
        <p className="text-xs" dir="ltr">
          {order.buyerMobile ? toPersianDigits(order.buyerMobile) : "—"}
        </p>
        <p className="text-xs text-muted">
          {order.studentGradeLabel ?? "—"}
          {order.studentMajorLabel ? ` · ${order.studentMajorLabel}` : ""}
        </p>
        <p className="text-xs text-muted">پرداخت: {order.paymentLabel}</p>
        <p className="text-xs">مسئول: {order.handoverStaffName ?? "انتخاب نشده"}</p>
        <div className="flex flex-col gap-1 pt-1">
          <OrderBranchBadge branch={order.branch} prefix="محصول:" />
          <OrderBranchBadge branch={order.pickupBranch} prefix="دریافت:" />
        </div>
      </section>
      <section className="space-y-2">
        <h4 className="text-xs font-semibold text-primary">یادداشت، QR و اقدام</h4>
        <p className="whitespace-pre-wrap rounded-lg border border-border px-2.5 py-2 text-xs leading-6">
          {order.notes || "یادداشتی ثبت نشده است."}
        </p>
        <OrderQrThumb token={order.qrToken} />
        {canManage ? (
          <OrderNextAction
            orderId={order.id}
            opsStage={order.opsStage}
            paymentPaid={order.paymentPaid}
            canManage={canManage}
            staff={staff}
            defaultHandoverStaffUserId={order.handoverStaffUserId}
          />
        ) : null}
      </section>
    </div>
  );
}
