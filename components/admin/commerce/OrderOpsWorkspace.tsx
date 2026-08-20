"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  addOrderNoteAction,
  advanceOrderStageAction,
  rollbackOrderStageAction,
  updateOrderDetailsAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Timeline, type TimelineNodeView } from "@/components/admin/Timeline";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import {
  COMMERCE_OPS_STAGE_HINTS,
  COMMERCE_OPS_STAGE_LABELS,
  COMMERCE_OPS_STAGES,
  canRollbackCommerceOpsStage,
  commerceOpsNextActionLabel,
  commerceOpsStageIndex,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { toPersianDigits } from "@/lib/persian";

export type OrderOpsListItem = {
  id: string;
  orderNumber: string;
  buyerName: string | null;
  buyerMobile: string | null;
  productTitle: string;
  amountLabel: string;
  paymentLabel: string;
  paymentPaid: boolean;
  opsStage: CommerceOpsStageValue;
  lastActivityTitle: string;
  lastActivityAtLabel: string;
  createdAtLabel: string;
  branch: CommerceBranchBadge | null;
};

export type OrderOpsDetailView = OrderOpsListItem & {
  notes: string | null;
  deliveryNote: string | null;
  buyerEmail: string | null;
  paymentTrackingCode: string | null;
  deliveredAtLabel: string | null;
  deliveredByName: string | null;
  items: Array<{
    id: string;
    title: string;
    quantityLabel: string;
    unitPriceLabel: string;
    totalLabel: string;
  }>;
  timeline: TimelineNodeView[];
  activity: Array<{
    id: string;
    title: string;
    note: string | null;
    occurredAtLabel: string;
    operatorName: string | null;
  }>;
};

export type OrderOpsKpiView = {
  key: string;
  label: string;
  valueLabel: string;
  hint: string;
};

export type OrderOpsFilterState = {
  q: string;
  branchId: string;
  opsStage: string;
  dateFrom: string;
  dateTo: string;
  todayOnly: boolean;
  paidOnly: boolean;
  waitingProduction: boolean;
  readyForPickup: boolean;
  deliveredOnly: boolean;
  undeliveredOnly: boolean;
};

type Props = {
  orders: readonly OrderOpsListItem[];
  kpis: readonly OrderOpsKpiView[];
  branches: readonly CommerceBranchBadge[];
  filters: OrderOpsFilterState;
  exportHref: string;
  selectedOrderId: string | null;
  detail: OrderOpsDetailView | null;
  filteredTotal: number;
  canManage: boolean;
  canRollback: boolean;
};

const emptyAction: CommerceOrderActionState = {};

const STAGE_BADGE: Record<CommerceOpsStageValue, string> = {
  REGISTERED: "border-border bg-background text-muted",
  PAID: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  IN_PRODUCTION:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  READY_FOR_PICKUP:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
  DELIVERED_TO_STUDENT:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
};

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-muted hover:border-primary/30 hover:text-primary"
      }`}
    >
      {children}
    </Link>
  );
}

export function OrderOpsWorkspace({
  orders,
  kpis,
  branches,
  filters,
  exportHref,
  selectedOrderId,
  detail,
  filteredTotal,
  canManage,
  canRollback,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const filterHref = useMemo(() => {
    return (patch: Partial<OrderOpsFilterState> & { orderId?: string | null }) => {
      const next = { ...filters, ...patch };
      const params = new URLSearchParams();
      if (next.q) params.set("q", next.q);
      if (next.branchId) params.set("branchId", next.branchId);
      if (next.opsStage) params.set("opsStage", next.opsStage);
      if (next.dateFrom) params.set("dateFrom", next.dateFrom);
      if (next.dateTo) params.set("dateTo", next.dateTo);
      if (next.todayOnly) params.set("today", "1");
      if (next.paidOnly) params.set("paidOnly", "1");
      if (next.waitingProduction) params.set("waitingProduction", "1");
      if (next.readyForPickup) params.set("ready", "1");
      if (next.deliveredOnly) params.set("delivered", "1");
      if (next.undeliveredOnly) params.set("undeliveredOnly", "1");
      const orderId = patch.orderId === undefined ? selectedOrderId : patch.orderId;
      if (orderId) params.set("orderId", orderId);
      const qs = params.toString();
      return qs ? `/admin/commerce/orders?${qs}` : "/admin/commerce/orders";
    };
  }, [filters, selectedOrderId]);

  function openOrder(orderId: string) {
    startTransition(() => {
      router.push(filterHref({ orderId }), { scroll: false });
    });
  }

  function closeDrawer() {
    startTransition(() => {
      router.push(filterHref({ orderId: null }), { scroll: false });
    });
  }

  const nextLabel = detail ? commerceOpsNextActionLabel(detail.opsStage) : null;
  const canAdvance =
    Boolean(canManage && detail && nextLabel) &&
    (detail?.opsStage !== "REGISTERED" || Boolean(detail?.paymentPaid));
  const canRollbackStage = Boolean(
    canRollback &&
      detail &&
      canRollbackCommerceOpsStage({
        current: detail.opsStage,
        paymentPaid: detail.paymentPaid,
      }).ok,
  );

  return (
    <div className="space-y-5">
      <section
        aria-label="شاخص‌های سفارش"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
      >
        {kpis.map((kpi) => (
          <article key={kpi.key} className="admin-card px-4 py-4">
            <p className="text-xs font-medium text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
              {kpi.valueLabel}
            </p>
            <p className="mt-1 text-[11px] text-muted">{kpi.hint}</p>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {toPersianDigits(filteredTotal)} سفارش در نتیجه فیلتر
        </p>
        <Link
          href={exportHref}
          className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:bg-background"
        >
          خروجی اکسل
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip href={filterHref({
          todayOnly: false,
          paidOnly: false,
          waitingProduction: false,
          readyForPickup: false,
          deliveredOnly: false,
          undeliveredOnly: false,
          opsStage: "",
        })} active={!filters.todayOnly && !filters.paidOnly && !filters.waitingProduction && !filters.readyForPickup && !filters.deliveredOnly && !filters.opsStage}>
          همه
        </Chip>
        <Chip href={filterHref({ todayOnly: true, paidOnly: false, waitingProduction: false, readyForPickup: false, deliveredOnly: false, undeliveredOnly: false, opsStage: "" })} active={filters.todayOnly}>
          امروز
        </Chip>
        <Chip href={filterHref({ paidOnly: true, todayOnly: false, waitingProduction: false, readyForPickup: false, deliveredOnly: false, undeliveredOnly: false, opsStage: "" })} active={filters.paidOnly}>
          پرداخت شده
        </Chip>
        <Chip href={filterHref({ waitingProduction: true, todayOnly: false, paidOnly: false, readyForPickup: false, deliveredOnly: false, undeliveredOnly: false, opsStage: "" })} active={filters.waitingProduction}>
          در انتظار تولید
        </Chip>
        <Chip href={filterHref({ opsStage: "IN_PRODUCTION", todayOnly: false, paidOnly: false, waitingProduction: false, readyForPickup: false, deliveredOnly: false, undeliveredOnly: false })} active={filters.opsStage === "IN_PRODUCTION"}>
          در حال تولید
        </Chip>
        <Chip href={filterHref({ readyForPickup: true, todayOnly: false, paidOnly: false, waitingProduction: false, deliveredOnly: false, undeliveredOnly: false, opsStage: "" })} active={filters.readyForPickup}>
          آماده تحویل
        </Chip>
        <Chip href={filterHref({ deliveredOnly: true, todayOnly: false, paidOnly: false, waitingProduction: false, readyForPickup: false, undeliveredOnly: false, opsStage: "" })} active={filters.deliveredOnly}>
          تحویل شده
        </Chip>
        {branches.map((branch) => (
          <Chip
            key={branch.id}
            href={filterHref({ branchId: filters.branchId === branch.id ? "" : branch.id })}
            active={filters.branchId === branch.id}
          >
            {branch.name}
          </Chip>
        ))}
      </div>

      <form
        method="get"
        action="/admin/commerce/orders"
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block text-sm sm:col-span-2 lg:col-span-2">
          <span className="mb-1.5 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="نام، موبایل، شماره سفارش، محصول"
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">شعبه</span>
          <select
            name="branchId"
            defaultValue={filters.branchId}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
          >
            <option value="">همه شعبه‌ها</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">مرحله عملیات</span>
          <select
            name="opsStage"
            defaultValue={filters.opsStage}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
          >
            <option value="">همه مراحل</option>
            {COMMERCE_OPS_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {COMMERCE_OPS_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">از تاریخ</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={filters.dateFrom}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">تا تاریخ</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={filters.dateTo}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-2">
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
          description="پس از ثبت و پرداخت سفارش، عملیات تولید و تحویل حضوری اینجا مدیریت می‌شود."
        />
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {orders.map((order) => {
            const selected = order.id === selectedOrderId;
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order.id)}
                className={`w-full rounded-2xl border bg-surface p-4 text-right transition ${
                  selected
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-border hover:border-primary/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {order.buyerName ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted" dir="ltr">
                      {order.buyerMobile
                        ? toPersianDigits(order.buyerMobile)
                        : "—"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STAGE_BADGE[order.opsStage]}`}
                  >
                    {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <OrderBranchBadge branch={order.branch} />
                  <span className="text-xs text-muted" dir="ltr">
                    {toPersianDigits(order.orderNumber)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {order.productTitle}
                </p>
                <div className="mt-3">
                  <Timeline
                    orientation="horizontal"
                    size="sm"
                    nodes={COMMERCE_OPS_STAGES.map((stage, index) => ({
                      id: `${order.id}-${stage}`,
                      label: COMMERCE_OPS_STAGE_LABELS[stage],
                      status:
                        index < commerceOpsStageIndex(order.opsStage)
                          ? "completed"
                          : index === commerceOpsStageIndex(order.opsStage)
                            ? "current"
                            : "upcoming",
                    }))}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>{order.lastActivityTitle}</span>
                  <span className="whitespace-nowrap">{order.amountLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-background text-muted">
              <tr>
                <th className="px-3 py-3 text-right font-medium">مشتری</th>
                <th className="px-3 py-3 text-right font-medium">شعبه</th>
                <th className="px-3 py-3 text-right font-medium">محصول</th>
                <th className="px-3 py-3 text-right font-medium">مبلغ</th>
                <th className="px-3 py-3 text-right font-medium">مرحله</th>
                <th className="hidden px-3 py-3 text-right font-medium lg:table-cell">
                  آخرین فعالیت
                </th>
                <th className="hidden px-3 py-3 text-right font-medium xl:table-cell">
                  پیشرفت
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const selected = order.id === selectedOrderId;
                return (
                  <tr
                    key={order.id}
                    className={`cursor-pointer border-t border-border align-top transition hover:bg-background/80 ${
                      selected ? "bg-primary/[0.03]" : ""
                    }`}
                    onClick={() => openOrder(order.id)}
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">
                        {order.buyerName ?? "—"}
                      </div>
                      <div className="text-xs text-muted" dir="ltr">
                        {order.buyerMobile
                          ? toPersianDigits(order.buyerMobile)
                          : "—"}
                      </div>
                      <div className="mt-1 text-xs text-muted" dir="ltr">
                        {toPersianDigits(order.orderNumber)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <OrderBranchBadge branch={order.branch} />
                    </td>
                    <td className="px-3 py-3 leading-6">{order.productTitle}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{order.amountLabel}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STAGE_BADGE[order.opsStage]}`}
                      >
                        {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <div className="text-foreground">{order.lastActivityTitle}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {order.lastActivityAtLabel}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 xl:table-cell" style={{ minWidth: 120 }}>
                      <Timeline
                        orientation="horizontal"
                        size="sm"
                        nodes={COMMERCE_OPS_STAGES.map((stage, index) => ({
                          id: `${order.id}-${stage}`,
                          label: COMMERCE_OPS_STAGE_LABELS[stage],
                          status:
                            index < commerceOpsStageIndex(order.opsStage)
                              ? "completed"
                              : index === commerceOpsStageIndex(order.opsStage)
                                ? "current"
                                : "upcoming",
                        }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      <OrderOpsDrawer
        key={selectedOrderId ?? "closed"}
        open={Boolean(selectedOrderId)}
        pending={pending}
        detail={detail}
        branches={branches}
        canManage={canManage}
        canAdvance={canAdvance}
        nextLabel={nextLabel}
        canRollback={canRollbackStage}
        onClose={closeDrawer}
      />
    </div>
  );
}

function OrderOpsDrawer({
  open,
  pending,
  detail,
  branches,
  canManage,
  canAdvance,
  nextLabel,
  canRollback,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  detail: OrderOpsDetailView | null;
  branches: readonly CommerceBranchBadge[];
  canManage: boolean;
  canAdvance: boolean;
  nextLabel: string | null;
  canRollback: boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={detail?.buyerName ?? "جزئیات سفارش"}
      subtitle={
        detail
          ? `${toPersianDigits(detail.orderNumber)} · ${COMMERCE_OPS_STAGE_LABELS[detail.opsStage]}`
          : pending
            ? "در حال بارگذاری…"
            : null
      }
      wide
      footer={
        detail ? (
          <OrderDrawerActions
            detail={detail}
            canManage={canManage}
            canAdvance={canAdvance}
            nextLabel={nextLabel}
            canRollback={canRollback}
            onEdit={() => setEditing((value) => !value)}
            editing={editing}
          />
        ) : null
      }
    >
      {detail ? (
        <OrderDrawerBody
          detail={detail}
          branches={branches}
          editing={editing}
          canManage={canManage}
        />
      ) : (
        <p className="text-sm text-muted">سفارش انتخاب‌شده یافت نشد.</p>
      )}
    </AdminDrawer>
  );
}

function OrderDrawerBody({
  detail,
  branches,
  editing,
  canManage,
}: {
  detail: OrderOpsDetailView;
  branches: readonly CommerceBranchBadge[];
  editing: boolean;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">مشتری</h3>
        {editing && canManage ? (
          <OrderEditForm detail={detail} branches={branches} />
        ) : (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">نام</dt>
              <dd>{detail.buyerName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">موبایل</dt>
              <dd dir="ltr">
                {detail.buyerMobile ? toPersianDigits(detail.buyerMobile) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">شعبه</dt>
              <dd>
                <OrderBranchBadge branch={detail.branch} size="md" />
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">محصولات</h3>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {detail.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted">تعداد {item.quantityLabel}</p>
              </div>
              <p className="whitespace-nowrap">{item.totalLabel}</p>
            </li>
          ))}
        </ul>
        <p className="text-left text-sm font-bold text-primary">{detail.amountLabel}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">پرداخت</h3>
        <p className="text-sm">
          {detail.paymentLabel}
          {detail.paymentTrackingCode ? (
            <span className="mt-1 block text-xs text-muted" dir="ltr">
              رسید: {toPersianDigits(detail.paymentTrackingCode)}
            </span>
          ) : null}
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">خط زمان</h3>
          <p className="text-xs text-muted">
            {COMMERCE_OPS_STAGE_HINTS[detail.opsStage]}
          </p>
        </div>
        <Timeline nodes={detail.timeline} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">یادداشت داخلی</h3>
        <p className="whitespace-pre-wrap rounded-xl bg-background px-3 py-2.5 text-sm leading-7">
          {detail.notes || "یادداشتی ثبت نشده است."}
        </p>
        {canManage ? <OrderNoteForm orderId={detail.id} /> : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">فعالیت</h3>
        <ol className="space-y-2">
          {[...detail.activity].reverse().map((item) => (
            <li key={item.id} className="rounded-xl border border-border px-3 py-2 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted">
                {item.occurredAtLabel}
                {item.operatorName ? ` · ${item.operatorName}` : ""}
              </p>
              {item.note ? (
                <p className="mt-1 text-xs leading-6 text-foreground">{item.note}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="order-print-sheet hidden print:block">
        <h3 className="text-base font-bold">رسید تحویل حضوری</h3>
        <p>شماره: {toPersianDigits(detail.orderNumber)}</p>
        <p>مشتری: {detail.buyerName}</p>
        <p>موبایل: {detail.buyerMobile}</p>
        <p>شعبه: {detail.branch?.name ?? "—"}</p>
        <p>محصول: {detail.productTitle}</p>
        <p>مبلغ: {detail.amountLabel}</p>
      </section>
    </div>
  );
}

function OrderDrawerActions({
  detail,
  canManage,
  canAdvance,
  nextLabel,
  canRollback,
  onEdit,
  editing,
}: {
  detail: OrderOpsDetailView;
  canManage: boolean;
  canAdvance: boolean;
  nextLabel: string | null;
  canRollback: boolean;
  onEdit: () => void;
  editing: boolean;
}) {
  const [advanceState, advanceAction, advancePending] = useActionState(
    advanceOrderStageAction,
    emptyAction,
  );
  const [rollbackState, rollbackAction, rollbackPending] = useActionState(
    rollbackOrderStageAction,
    emptyAction,
  );

  return (
    <div className="space-y-3">
      {advanceState.formError || rollbackState.formError ? (
        <p className="text-sm text-danger" role="alert">
          {advanceState.formError ?? rollbackState.formError}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canManage && canAdvance && nextLabel ? (
          <form action={advanceAction} className="w-full sm:w-auto">
            <input type="hidden" name="orderId" value={detail.id} />
            <button
              type="submit"
              disabled={advancePending}
              className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
            >
              {advancePending ? "در حال ثبت…" : nextLabel}
            </button>
          </form>
        ) : canManage && detail.opsStage === "REGISTERED" && !detail.paymentPaid ? (
          <p className="text-sm text-muted">در انتظار پرداخت</p>
        ) : null}
        {canManage ? (
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 w-full rounded-xl border border-border px-4 text-sm text-primary sm:w-auto"
          >
            {editing ? "انصراف ویرایش" : "ویرایش"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 w-full rounded-xl border border-border px-4 text-sm text-primary sm:w-auto"
        >
          چاپ
        </button>
        {canManage && canRollback ? (
          <form action={rollbackAction} className="w-full sm:w-auto">
            <input type="hidden" name="orderId" value={detail.id} />
            <button
              type="submit"
              disabled={rollbackPending}
              className="min-h-11 w-full rounded-xl border border-danger/30 px-4 text-sm text-danger disabled:opacity-60 sm:w-auto"
            >
              {rollbackPending ? "در حال بازگشت…" : "بازگشت یک مرحله"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function OrderNoteForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(addOrderNoteAction, emptyAction);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="یادداشت داخلی برای همکاران"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
      {state.formError ? (
        <p className="text-sm text-danger">{state.formError}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-xl border border-border px-3 text-sm text-primary disabled:opacity-60"
      >
        {pending ? "در حال ثبت…" : "ثبت یادداشت"}
      </button>
    </form>
  );
}

function OrderEditForm({
  detail,
  branches,
}: {
  detail: OrderOpsDetailView;
  branches: readonly CommerceBranchBadge[];
}) {
  const [state, action, pending] = useActionState(
    updateOrderDetailsAction,
    emptyAction,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={detail.id} />
      <label className="block text-sm">
        <span className="mb-1 block text-muted">نام</span>
        <input
          name="buyerName"
          defaultValue={detail.buyerName ?? ""}
          required
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">موبایل</span>
        <input
          name="buyerMobile"
          defaultValue={detail.buyerMobile ?? ""}
          dir="ltr"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">شعبه</span>
        <select
          name="branchId"
          defaultValue={detail.branch?.id ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3"
        >
          <option value="">انتخاب شعبه</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">یادداشت</span>
        <textarea
          name="notes"
          defaultValue={detail.notes ?? ""}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>
      {state.formError ? (
        <p className="text-sm text-danger">{state.formError}</p>
      ) : state.successMessage ? (
        <p className="text-sm text-success">{state.successMessage}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-4 text-sm text-white disabled:opacity-60"
      >
        {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
