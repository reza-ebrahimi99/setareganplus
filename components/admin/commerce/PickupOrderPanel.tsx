import Link from "next/link";
import { Timeline } from "@/components/admin/Timeline";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import { PickupDeliverForm } from "@/components/admin/commerce/PickupDeliverForm";
import {
  OrderDelayBadge,
  OrderHealthBadge,
  OrderPriorityBadge,
} from "@/components/admin/commerce/OrderOpsSignals";
import { PrintQueueButton } from "@/components/admin/commerce/PrintQueueButton";
import { commerceOrderQrUrl } from "@/lib/commerce/orders/qr";
import { COMMERCE_OPS_STAGE_LABELS } from "@/lib/commerce/orders/ops-stage";
import type { PickupOrderView } from "@/lib/commerce/orders/pickup";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import { buildOpsTimelineNodes } from "@/lib/commerce/orders/timeline-view";
import { formatJalaliDateShort, formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { toPersianDigits } from "@/lib/persian";
import { formatRials } from "@/lib/registration/format";

function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.replace("undefined", "");
}

export function PickupOrderPanel({
  order,
  canManage,
  canChangeStaff,
  defaultHandoverStaffUserId,
  staff,
}: {
  order: PickupOrderView;
  canManage: boolean;
  canChangeStaff: boolean;
  defaultHandoverStaffUserId: string;
  staff: readonly CommerceStaffOption[];
}) {
  const delivered = order.opsStage === "DELIVERED_TO_STUDENT";
  const ready = order.opsStage === "READY_FOR_PICKUP";
  const timeline = buildOpsTimelineNodes({
    current: order.opsStage,
    events: order.events.map((event) => ({
      stage: event.stage,
      title: event.title,
      note: event.note,
      occurredAtLabel: formatJalaliDateTimeShort(event.occurredAt),
      operatorName: event.operatorName,
    })),
  });
  const smsBody = [
    "سفارش شما ثبت شد.",
    `شماره سفارش: ${order.orderNumber}`,
    "برای دریافت جزوه این لینک را نگه دارید.",
    commerceOrderQrUrl(order.qrToken),
  ].join("\n");

  return (
    <article className="pickup-order-panel mx-auto max-w-2xl space-y-4 pb-28">
      {delivered ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-950">
          <p className="text-lg font-bold">این سفارش قبلاً تحویل شده است.</p>
          {order.deliveredAt ? (
            <p className="mt-2 text-sm">
              تاریخ {formatJalaliDateShort(order.deliveredAt)} · ساعت{" "}
              {toPersianDigits(formatTehranTime24(order.deliveredAt))}
            </p>
          ) : null}
          <p className="mt-1 text-sm">تحویل‌دهنده: {order.deliveredByName ?? "—"}</p>
        </div>
      ) : null}

      {!delivered && !ready ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950">
          <p className="font-bold">این سفارش هنوز آماده تحویل نیست.</p>
          <p className="mt-1 text-sm">مرحله فعلی: {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}</p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex items-start gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"
            aria-hidden="true"
          >
            {initials(order.buyerName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold">{order.buyerName ?? "—"}</p>
            <p className="mt-1 text-sm text-muted">
              {order.studentGradeLabel ?? "—"}
              {order.studentMajorLabel ? ` · ${order.studentMajorLabel}` : ""}
            </p>
            <p className="mt-2 text-xs text-muted" dir="ltr">
              {toPersianDigits(order.orderNumber)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <OrderPriorityBadge priority={order.priority} />
          <OrderDelayBadge delayed={order.delayed} delayKind={order.delayKind} />
          <OrderHealthBadge score={order.healthScore} level={order.healthLevel} />
          {order.opsVip ? (
            <span className="rounded-full bg-secondary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              VIP
            </span>
          ) : null}
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px]">
            {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
          </span>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 text-sm leading-7">
        <p>
          <span className="text-muted">جزوه:</span> {order.productTitle}
        </p>
        <p>
          <span className="text-muted">مدرس:</span> {order.instructor ?? "—"}
        </p>
        <p>
          <span className="text-muted">تعداد:</span> {toPersianDigits(order.quantity)}
        </p>
        <p>
          <span className="text-muted">پرداخت:</span> {order.paymentPaid ? "پرداخت‌شده" : "پرداخت‌نشده"}
        </p>
        <p>
          <span className="text-muted">مبلغ:</span> {formatRials(order.grandTotalRials)}
        </p>
        <p>
          <span className="text-muted">مرحله فعلی:</span> {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
        </p>
        <p>
          <span className="text-muted">وضعیت تحویل:</span>{" "}
          {order.opsStage === "DELIVERED_TO_STUDENT" ? "تحویل شده" : "تحویل نشده"}
        </p>
        <p>
          <span className="text-muted">مسئول:</span> {order.handoverStaffName ?? "هنوز انتخاب نشده"}
        </p>
        {order.parentName ? (
          <p>
            <span className="text-muted">نام پدر:</span> {order.parentName}
          </p>
        ) : null}
        <div className="mt-3">
          <OrderBranchBadge branch={order.pickupBranch} prefix="دریافت:" size="md" />
          {order.pickupBranch?.address ? (
            <p className="mt-2 text-xs text-muted">{order.pickupBranch.address}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-primary">مسیر سفارش</h2>
        <div className="mt-3">
          <Timeline nodes={timeline} />
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 print:hidden">
        {order.buyerMobile ? (
          <a
            href={`tel:${order.buyerMobile}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-medium"
          >
            تماس با دانش‌آموز
          </a>
        ) : null}
        {order.buyerMobile ? (
          <a
            href={`sms:${order.buyerMobile}?body=${encodeURIComponent(smsBody)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-medium"
          >
            پیامک به دانش‌آموز
          </a>
        ) : null}
        <PrintQueueButton label="چاپ رسید میز" />
        <Link
          href={`/admin/commerce/orders/labels?ids=${encodeURIComponent(order.id)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-medium"
        >
          چاپ برچسب تحویل
        </Link>
        <Link
          href={`/booklet/${encodeURIComponent(order.qrToken)}/delivery`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-medium"
        >
          رسید تحویل
        </Link>
        <Link
          href={`/admin/commerce/orders?orderId=${encodeURIComponent(order.id)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-medium"
        >
          مشاهده کامل سفارش
        </Link>
      </section>

      {canManage ? (
        <div className="pickup-sticky-actions print:hidden sticky bottom-3 z-10 rounded-2xl border border-border bg-background/95 p-3 shadow-[0_8px_30px_rgb(15_23_42_/_0.12)] backdrop-blur">
          <PickupDeliverForm
            orderId={order.id}
            qrToken={order.qrToken}
            staff={staff}
            defaultHandoverStaffUserId={defaultHandoverStaffUserId}
            canChangeStaff={canChangeStaff}
            enabled={ready && !delivered}
          />
        </div>
      ) : null}
    </article>
  );
}
