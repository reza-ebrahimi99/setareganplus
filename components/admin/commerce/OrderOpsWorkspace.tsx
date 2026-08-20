"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Timeline } from "@/components/admin/Timeline";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import { OrderCreatePanel } from "@/components/admin/commerce/OrderCreatePanel";
import { OrderNextAction } from "@/components/admin/commerce/OrderNextAction";
import { OrderOpsDrawer } from "@/components/admin/commerce/OrderOpsDrawer";
import type {
  OrderOpsDetailView,
  OrderOpsFilterState,
  OrderOpsKpiView,
  OrderOpsListItem,
} from "@/components/admin/commerce/order-ops-types";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import {
  COMMERCE_OPS_STAGE_LABELS,
  COMMERCE_OPS_STAGES,
  commerceOpsStageIndex,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import {
  COMMERCE_STUDENT_GRADE_LABELS,
  COMMERCE_STUDENT_GRADES,
  COMMERCE_STUDENT_MAJOR_LABELS,
  COMMERCE_STUDENT_MAJORS,
} from "@/lib/commerce/student-fields";
import { toPersianDigits } from "@/lib/persian";

export type {
  OrderOpsDetailView,
  OrderOpsFilterState,
  OrderOpsKpiView,
  OrderOpsListItem,
} from "@/components/admin/commerce/order-ops-types";

type ItemOption = { id: string; title: string };

type Props = {
  orders: readonly OrderOpsListItem[];
  kpis: readonly OrderOpsKpiView[];
  branches: readonly CommerceBranchBadge[];
  staff: readonly CommerceStaffOption[];
  items: readonly ItemOption[];
  filters: OrderOpsFilterState;
  exportHref: string;
  selectedOrderId: string | null;
  detail: OrderOpsDetailView | null;
  filteredTotal: number;
  canManage: boolean;
  canRollback: boolean;
};

const STAGE_BADGE: Record<CommerceOpsStageValue | "ROLLBACK", string> = {
  REGISTERED: "border-border bg-background text-muted",
  PAID: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  IN_PRODUCTION:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  READY_FOR_PICKUP:
    "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
  DELIVERED_TO_STUDENT:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  ROLLBACK: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
};

const KPI_TONE: Record<NonNullable<OrderOpsKpiView["tone"]>, string> = {
  default: "",
  warning: "ring-1 ring-amber-200/80",
  info: "ring-1 ring-sky-200/70",
  success: "ring-1 ring-emerald-200/70",
  revenue: "ring-1 ring-secondary/40",
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
  }));
}

export function OrderOpsWorkspace({
  orders,
  kpis,
  branches,
  staff,
  items,
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
      if (next.pickupBranchId) params.set("pickupBranchId", next.pickupBranchId);
      if (next.opsStage) params.set("opsStage", next.opsStage);
      if (next.studentGrade) params.set("grade", next.studentGrade);
      if (next.studentMajor) params.set("major", next.studentMajor);
      if (next.handoverStaffUserId) params.set("employee", next.handoverStaffUserId);
      if (next.dateFrom) params.set("dateFrom", next.dateFrom);
      if (next.dateTo) params.set("dateTo", next.dateTo);
      if (next.datePreset === "today" || next.todayOnly) params.set("today", "1");
      if (next.datePreset === "yesterday" || next.yesterday) params.set("yesterday", "1");
      if (next.datePreset === "thisWeek" || next.thisWeek) params.set("thisWeek", "1");
      if (next.datePreset === "thisMonth" || next.thisMonth) params.set("thisMonth", "1");
      if (next.paidOnly) params.set("paidOnly", "1");
      if (next.waitingProduction) params.set("waitingProduction", "1");
      if (next.readyForPickup) params.set("ready", "1");
      if (next.deliveredOnly) params.set("delivered", "1");
      if (next.deliveredToday) params.set("deliveredToday", "1");
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

  const clearStage = {
    todayOnly: false,
    yesterday: false,
    thisWeek: false,
    thisMonth: false,
    datePreset: "",
    paidOnly: false,
    waitingProduction: false,
    readyForPickup: false,
    deliveredOnly: false,
    deliveredToday: false,
    undeliveredOnly: false,
    opsStage: "",
  };

  return (
    <div className="space-y-5">
      <section
        aria-label="شاخص‌های عملیات جزوه"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9"
      >
        {kpis.map((kpi) => (
          <article
            key={kpi.key}
            className={`admin-glass px-4 py-4 ${KPI_TONE[kpi.tone ?? "default"]}`}
          >
            <p className="text-xs font-medium text-muted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-primary">
              {kpi.valueLabel}
            </p>
            <p className="mt-1 text-[11px] text-muted">{kpi.hint}</p>
          </article>
        ))}
      </section>

      {canManage ? <OrderCreatePanel branches={branches} items={items} /> : null}

      <div className="sticky top-0 z-20 -mx-1 space-y-3 bg-background/90 px-1 py-3 backdrop-blur-md">
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
          <Chip href={filterHref(clearStage)} active={!filters.todayOnly && !filters.paidOnly && !filters.waitingProduction && !filters.readyForPickup && !filters.deliveredOnly && !filters.deliveredToday && !filters.opsStage && !filters.yesterday && !filters.thisWeek && !filters.thisMonth}>
            همه
          </Chip>
          <Chip href={filterHref({ ...clearStage, todayOnly: true, datePreset: "today" })} active={filters.todayOnly || filters.datePreset === "today"}>
            امروز
          </Chip>
          <Chip href={filterHref({ ...clearStage, yesterday: true, datePreset: "yesterday" })} active={filters.yesterday || filters.datePreset === "yesterday"}>
            دیروز
          </Chip>
          <Chip href={filterHref({ ...clearStage, thisWeek: true, datePreset: "thisWeek" })} active={filters.thisWeek || filters.datePreset === "thisWeek"}>
            این هفته
          </Chip>
          <Chip href={filterHref({ ...clearStage, thisMonth: true, datePreset: "thisMonth" })} active={filters.thisMonth || filters.datePreset === "thisMonth"}>
            این ماه
          </Chip>
          <Chip href={filterHref({ ...clearStage, waitingProduction: true })} active={filters.waitingProduction}>
            در انتظار تولید
          </Chip>
          <Chip href={filterHref({ ...clearStage, opsStage: "IN_PRODUCTION" })} active={filters.opsStage === "IN_PRODUCTION"}>
            در حال تولید
          </Chip>
          <Chip href={filterHref({ ...clearStage, readyForPickup: true })} active={filters.readyForPickup}>
            آماده تحویل
          </Chip>
          <Chip href={filterHref({ ...clearStage, deliveredToday: true })} active={filters.deliveredToday}>
            تحویل امروز
          </Chip>
          {branches.map((branch) => (
            <Chip
              key={branch.id}
              href={filterHref({ branchId: filters.branchId === branch.id ? "" : branch.id })}
              active={filters.branchId === branch.id}
            >
              {branch.shortName}
            </Chip>
          ))}
        </div>
      </div>

      <form
        method="get"
        action="/admin/commerce/orders"
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
      >
        <label className="block text-sm sm:col-span-2 xl:col-span-2">
          <span className="mb-1.5 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="دانش‌آموز، والد، موبایل، شماره سفارش، محصول، شعبه"
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">شعبه محصول</span>
          <select name="branchId" defaultValue={filters.branchId} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5">
            <option value="">همه</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.shortName}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">محل دریافت</span>
          <select name="pickupBranchId" defaultValue={filters.pickupBranchId} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5">
            <option value="">همه</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.shortName}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">مرحله</span>
          <select name="opsStage" defaultValue={filters.opsStage} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5">
            <option value="">همه مراحل</option>
            {COMMERCE_OPS_STAGES.map((stage) => (
              <option key={stage} value={stage}>{COMMERCE_OPS_STAGE_LABELS[stage]}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">پایه</span>
          <select name="grade" defaultValue={filters.studentGrade} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5">
            <option value="">همه</option>
            {COMMERCE_STUDENT_GRADES.map((grade) => (
              <option key={grade} value={grade}>{COMMERCE_STUDENT_GRADE_LABELS[grade]}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">رشته</span>
          <select name="major" defaultValue={filters.studentMajor} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5">
            <option value="">همه</option>
            {COMMERCE_STUDENT_MAJORS.map((major) => (
              <option key={major} value={major}>{COMMERCE_STUDENT_MAJOR_LABELS[major]}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">مسئول تحویل</span>
          <select name="employee" defaultValue={filters.handoverStaffUserId} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5">
            <option value="">همه</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">از تاریخ</span>
          <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">تا تاریخ</span>
          <input type="date" name="dateTo" defaultValue={filters.dateTo} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5" />
        </label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
          <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white">
            اعمال فیلتر
          </button>
          <Link href="/admin/commerce/orders" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm text-muted">
            پاک کردن
          </Link>
        </div>
      </form>

      {orders.length === 0 ? (
        <AdminEmptyState
          title="سفارشی یافت نشد"
          description="پس از ثبت سفارش، عملیات تولید و تحویل حضوری اینجا مدیریت می‌شود."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {orders.map((order) => {
              const selected = order.id === selectedOrderId;
              const activityTone = order.lastActivityIsRollback ? "ROLLBACK" : order.opsStage;
              return (
                <article
                  key={order.id}
                  className={`w-full rounded-2xl border bg-surface p-4 text-right ${
                    selected ? "border-primary/40 bg-primary/[0.03]" : "border-border"
                  }`}
                >
                  <button type="button" onClick={() => openOrder(order.id)} className="w-full text-right">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{order.buyerName ?? "—"}</p>
                        <p className="mt-0.5 text-xs text-muted" dir="ltr">
                          {order.buyerMobile ? toPersianDigits(order.buyerMobile) : "—"}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STAGE_BADGE[order.opsStage]}`}>
                        {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <OrderBranchBadge branch={order.branch} prefix="محصول:" />
                      <OrderBranchBadge branch={order.pickupBranch} prefix="دریافت:" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground">{order.productTitle}</p>
                    <div className="mt-3">
                      <Timeline orientation="horizontal" size="sm" nodes={stageNodes(order)} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 ${STAGE_BADGE[activityTone]}`}>
                        {order.lastActivityTitle}
                      </span>
                      <span className="whitespace-nowrap text-muted">{order.amountLabel}</span>
                    </div>
                  </button>
                  {canManage ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <OrderNextAction
                        orderId={order.id}
                        opsStage={order.opsStage}
                        paymentPaid={order.paymentPaid}
                        canManage={canManage}
                        staff={staff}
                        defaultHandoverStaffUserId={order.handoverStaffUserId}
                        compact
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-3 py-3 text-right font-medium">خط زمان</th>
                  <th className="px-3 py-3 text-right font-medium">دانش‌آموز</th>
                  <th className="px-3 py-3 text-right font-medium">محصول</th>
                  <th className="px-3 py-3 text-right font-medium">شعبه‌ها</th>
                  <th className="px-3 py-3 text-right font-medium">مبلغ</th>
                  <th className="px-3 py-3 text-right font-medium">مرحله</th>
                  <th className="px-3 py-3 text-right font-medium">آخرین فعالیت</th>
                  <th className="px-3 py-3 text-right font-medium">پیشرفت</th>
                  <th className="px-3 py-3 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const selected = order.id === selectedOrderId;
                  const activityTone = order.lastActivityIsRollback ? "ROLLBACK" : order.opsStage;
                  return (
                    <tr
                      key={order.id}
                      className={`border-t border-border align-top transition hover:bg-background/80 ${
                        selected ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <td className="px-3 py-3" style={{ minWidth: 132 }}>
                        <button type="button" onClick={() => openOrder(order.id)} className="block w-full">
                          <Timeline orientation="horizontal" size="sm" nodes={stageNodes(order)} />
                        </button>
                      </td>
                      <td className="cursor-pointer px-3 py-3" onClick={() => openOrder(order.id)}>
                        <div className="font-medium text-foreground">{order.buyerName ?? "—"}</div>
                        <div className="text-xs text-muted" dir="ltr">
                          {order.buyerMobile ? toPersianDigits(order.buyerMobile) : "—"}
                        </div>
                        <div className="mt-1 text-xs text-muted" dir="ltr">
                          {toPersianDigits(order.orderNumber)}
                        </div>
                      </td>
                      <td className="cursor-pointer px-3 py-3 leading-6" onClick={() => openOrder(order.id)}>
                        {order.productTitle}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          <OrderBranchBadge branch={order.branch} prefix="محصول:" />
                          <OrderBranchBadge branch={order.pickupBranch} prefix="دریافت:" />
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{order.amountLabel}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STAGE_BADGE[order.opsStage]}`}>
                          {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STAGE_BADGE[activityTone]}`}>
                          {order.lastActivityTitle}
                        </span>
                        <div className="mt-0.5 text-xs text-muted">{order.lastActivityAtLabel}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${order.progressPercent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {toPersianDigits(order.progressPercent)}٪
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <OrderNextAction
                          orderId={order.id}
                          opsStage={order.opsStage}
                          paymentPaid={order.paymentPaid}
                          canManage={canManage}
                          staff={staff}
                          defaultHandoverStaffUserId={order.handoverStaffUserId}
                          compact
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
        staff={staff}
        canManage={canManage}
        canRollback={canRollback}
        onClose={closeDrawer}
      />
    </div>
  );
}
