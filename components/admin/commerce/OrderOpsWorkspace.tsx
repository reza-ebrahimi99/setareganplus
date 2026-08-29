"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Timeline } from "@/components/admin/Timeline";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import { OrderCreatePanel } from "@/components/admin/commerce/OrderCreatePanel";
import { OrderNextAction } from "@/components/admin/commerce/OrderNextAction";
import { OrderOpsBulkBar } from "@/components/admin/commerce/OrderOpsBulkBar";
import { OrderOpsDrawer } from "@/components/admin/commerce/OrderOpsDrawer";
import { OrderOpsExpanded } from "@/components/admin/commerce/OrderOpsExpanded";
import { OrderOpsInstantSearch } from "@/components/admin/commerce/OrderOpsInstantSearch";
import { OrderOpsNotifications } from "@/components/admin/commerce/OrderOpsNotifications";
import {
  OrderDelayBadge,
  OrderHealthBadge,
  OrderPriorityBadge,
} from "@/components/admin/commerce/OrderOpsSignals";
import { OrderQrThumb } from "@/components/admin/commerce/OrderQrThumb";
import type {
  OrderOpsDetailView,
  OrderOpsFilterState,
  OrderOpsKpiView,
  OrderOpsListItem,
  OrderOpsNotificationView,
} from "@/components/admin/commerce/order-ops-types";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import {
  COMMERCE_OPS_STAGE_DOT,
  COMMERCE_OPS_STAGE_LABELS,
  COMMERCE_OPS_STAGE_TONES,
  COMMERCE_OPS_STAGES,
  commerceOpsStageIndex,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import {
  COMMERCE_OPS_BUILTIN_PRESETS,
  COMMERCE_OPS_PRESET_STORAGE_KEY,
  commerceOpsPresetHref,
  type CommerceOpsPreset,
} from "@/lib/commerce/orders/presets";
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
  delayedCount: number;
  canManage: boolean;
  canRollback: boolean;
  notifications: readonly OrderOpsNotificationView[];
  unreadCount: number;
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
      className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium transition hover:-translate-y-px ${
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
    stage,
    dotClass: COMMERCE_OPS_STAGE_DOT[stage],
  }));
}

function activityTone(order: OrderOpsListItem): CommerceOpsStageValue | "ROLLBACK" {
  return order.lastActivityIsRollback ? "ROLLBACK" : order.opsStage;
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
  delayedCount,
  canManage,
  canRollback,
  notifications,
  unreadCount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savedPresets, setSavedPresets] = useState<CommerceOpsPreset[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(COMMERCE_OPS_PRESET_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as CommerceOpsPreset[];
        if (Array.isArray(parsed)) setSavedPresets(parsed);
      } catch {
        /* ignore */
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
      if (next.delayedOnly) params.set("delayed", "1");
      if (next.mine) params.set("mine", "1");
      if (next.opsVipOnly) params.set("vip", "1");
      if (next.sort === "priority") params.set("sort", "priority");
      const orderId = patch.orderId === undefined ? selectedOrderId : patch.orderId;
      if (orderId) params.set("orderId", orderId);
      const qs = params.toString();
      return qs ? `/admin/commerce/orders?${qs}` : "/admin/commerce/orders";
    };
  }, [filters, selectedOrderId]);

  const searchHref = useCallback((q: string) => filterHref({ q }), [filterHref]);

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

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function savePreset() {
    const name = window.prompt("نام پیش‌تنظیم");
    if (!name?.trim()) return;
    const query: Record<string, string> = {};
    const href = filterHref({});
    const qs = href.split("?")[1] ?? "";
    new URLSearchParams(qs).forEach((value, key) => {
      if (key !== "orderId") query[key] = value;
    });
    const next = [...savedPresets, { id: `saved-${Date.now()}`, label: name.trim(), query }];
    setSavedPresets(next);
    window.localStorage.setItem(COMMERCE_OPS_PRESET_STORAGE_KEY, JSON.stringify(next));
  }

  const clearStage: Partial<OrderOpsFilterState> = {
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
    delayedOnly: false,
    mine: false,
    opsVipOnly: false,
    opsStage: "",
    sort: "createdAt",
    branchId: "",
  };

  const girls = branches.find((branch) => branch.bookletOpsKey === "GIRLS");
  const boys = branches.find((branch) => branch.bookletOpsKey === "BOYS");
  const elementary = branches.find((branch) => branch.bookletOpsKey === "ELEMENTARY");

  return (
    <div className="space-y-5">
      <section
        aria-label="شاخص‌های عملیات جزوه"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
      >
        {kpis.map((kpi) => {
          const card = (
            <article className={`admin-glass ops-kpi-card px-4 py-4 ${KPI_TONE[kpi.tone ?? "default"]}`}>
              <p className="text-xs font-medium text-muted">{kpi.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-primary">{kpi.valueLabel}</p>
              <p className="mt-1 text-[11px] text-muted">{kpi.hint}</p>
            </article>
          );
          return kpi.href ? (
            <Link key={kpi.key} href={kpi.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={kpi.key}>{card}</div>
          );
        })}
      </section>

      {canManage ? <OrderCreatePanel branches={branches} items={items} /> : null}

      <div className="sticky top-0 z-20 -mx-1 space-y-3 bg-background/90 px-1 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {toPersianDigits(filteredTotal)} سفارش در نتیجه فیلتر
            {delayedCount > 0 ? (
              <span className="ms-2 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
                {toPersianDigits(delayedCount)} معوق
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <OrderOpsNotifications unreadCount={unreadCount} items={notifications} />
            <Link
              href="/admin/commerce/production"
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm"
            >
              صف تولید
            </Link>
            <Link
              href="/admin/commerce/performance"
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm"
            >
              عملکرد کارکنان
            </Link>
            <Link
              href="/admin/commerce/pickup"
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm"
            >
              میز دریافت
            </Link>
            <Link
              href={exportHref}
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:bg-background"
            >
              خروجی اکسل
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip href={filterHref(clearStage)} active={!filters.todayOnly && !filters.paidOnly && !filters.waitingProduction && !filters.readyForPickup && !filters.deliveredOnly && !filters.deliveredToday && !filters.opsStage && !filters.yesterday && !filters.thisWeek && !filters.thisMonth && !filters.delayedOnly && !filters.mine}>
            همه
          </Chip>
          {COMMERCE_OPS_BUILTIN_PRESETS.filter((preset) => !["girls", "boys", "elementary"].includes(preset.id)).map(
            (preset) => (
              <Chip
                key={preset.id}
                href={commerceOpsPresetHref(preset.query)}
                active={
                  (preset.id === "today" && (filters.todayOnly || filters.datePreset === "today")) ||
                  (preset.id === "readyToday" && filters.readyForPickup) ||
                  (preset.id === "delayed" && filters.delayedOnly) ||
                  (preset.id === "mine" && filters.mine) ||
                  (preset.id === "production" && filters.opsStage === "IN_PRODUCTION") ||
                  (preset.id === "deliveredToday" && filters.deliveredToday) ||
                  (preset.id === "priority" && filters.sort === "priority")
                }
              >
                {preset.label}
                {preset.id === "delayed" && delayedCount > 0 ? ` · ${toPersianDigits(delayedCount)}` : ""}
              </Chip>
            ),
          )}
          {girls ? (
            <Chip href={filterHref({ ...clearStage, branchId: girls.id })} active={filters.branchId === girls.id}>
              شعبه دختران
            </Chip>
          ) : null}
          {boys ? (
            <Chip href={filterHref({ ...clearStage, branchId: boys.id })} active={filters.branchId === boys.id}>
              شعبه پسران
            </Chip>
          ) : null}
          {elementary ? (
            <Chip href={filterHref({ ...clearStage, branchId: elementary.id })} active={filters.branchId === elementary.id}>
              ابتدایی
            </Chip>
          ) : null}
          {savedPresets.map((preset) => (
            <Chip key={preset.id} href={commerceOpsPresetHref(preset.query)} active={false}>
              {preset.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={savePreset}
            className="inline-flex min-h-9 items-center rounded-full border border-dashed border-border px-3 text-xs text-muted"
          >
            ذخیره پیش‌تنظیم
          </button>
        </div>
      </div>

      <form
        method="get"
        action="/admin/commerce/orders"
        className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
      >
        <OrderOpsInstantSearch value={filters.q} hrefFor={searchHref} />
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
            فیلتر تکمیلی
          </button>
          <Link href="/admin/commerce/orders" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm text-muted">
            پاک کردن
          </Link>
        </div>
      </form>

      {pending ? (
        <div className="ops-skeleton h-16 rounded-2xl" aria-hidden="true" />
      ) : null}

      {orders.length === 0 ? (
        <AdminEmptyState
          title="سفارشی یافت نشد"
          description="پس از ثبت سفارش، عملیات تولید و تحویل حضوری اینجا مدیریت می‌شود."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <MobileOrderCard
                key={order.id}
                order={order}
                selected={selected.has(order.id)}
                expanded={expanded.has(order.id)}
                highlighted={order.id === selectedOrderId}
                canManage={canManage}
                staff={staff}
                onToggleSelected={() => toggleSelected(order.id)}
                onToggleExpanded={() => toggleExpanded(order.id)}
                onOpen={() => openOrder(order.id)}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-background text-muted">
                <tr>
                  <th className="px-3 py-3 text-right font-medium">
                    <input
                      type="checkbox"
                      aria-label="انتخاب همه"
                      checked={orders.length > 0 && selected.size === orders.length}
                      onChange={(event) => {
                        setSelected(event.target.checked ? new Set(orders.map((row) => row.id)) : new Set());
                      }}
                    />
                  </th>
                  <th className="px-3 py-3 text-right font-medium">خط زمان</th>
                  <th className="px-3 py-3 text-right font-medium">دانش‌آموز</th>
                  <th className="px-3 py-3 text-right font-medium">محصول</th>
                  <th className="px-3 py-3 text-right font-medium">شعبه‌ها</th>
                  <th className="px-3 py-3 text-right font-medium">سلامت</th>
                  <th className="px-3 py-3 text-right font-medium">مرحله</th>
                  <th className="px-3 py-3 text-right font-medium">مسئول</th>
                  <th className="px-3 py-3 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isExpanded = expanded.has(order.id);
                  const highlighted = order.id === selectedOrderId;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={`ops-row border-t border-border align-top transition ${
                          highlighted ? "bg-primary/[0.03]" : ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(order.id)}
                            onChange={() => toggleSelected(order.id)}
                            aria-label="انتخاب سفارش"
                          />
                        </td>
                        <td className="px-3 py-3" style={{ minWidth: 132 }}>
                          <button type="button" onClick={() => toggleExpanded(order.id)} className="block w-full">
                            <Timeline orientation="horizontal" size="sm" nodes={stageNodes(order)} />
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => toggleExpanded(order.id)} className="text-right">
                            <div className="font-medium text-foreground">{order.buyerName ?? "—"}</div>
                            <div className="text-xs text-muted" dir="ltr">
                              {order.buyerMobile ? toPersianDigits(order.buyerMobile) : "—"}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <OrderPriorityBadge priority={order.priority} />
                              <OrderDelayBadge delayed={order.delayed} delayKind={order.delayKind} />
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3 leading-6">
                          {order.productTitle}
                          <div className="mt-1 text-xs text-muted" dir="ltr">
                            {toPersianDigits(order.orderNumber)}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1.5">
                            <OrderBranchBadge branch={order.branch} prefix="محصول:" />
                            <OrderBranchBadge branch={order.pickupBranch} prefix="دریافت:" />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <OrderHealthBadge score={order.healthScore} level={order.healthLevel} />
                          <p className="mt-1 whitespace-nowrap text-xs text-muted">{order.amountLabel}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${COMMERCE_OPS_STAGE_TONES[order.opsStage]}`}>
                            {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
                          </span>
                          <div className="mt-1">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${COMMERCE_OPS_STAGE_TONES[activityTone(order)]}`}>
                              {order.lastActivityTitle}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {order.handoverStaffName ?? "—"}
                          <div className="mt-2">
                            <OrderQrThumb token={order.qrToken} size={48} />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-2">
                            <OrderNextAction
                              orderId={order.id}
                              opsStage={order.opsStage}
                              paymentPaid={order.paymentPaid}
                              canManage={canManage}
                              staff={staff}
                              defaultHandoverStaffUserId={order.handoverStaffUserId}
                              compact
                            />
                            <button
                              type="button"
                              onClick={() => openOrder(order.id)}
                              className="text-xs text-primary"
                            >
                              پرونده
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(order.id)}
                              className="text-xs text-muted"
                            >
                              {isExpanded ? "بستن ردیف" : "گسترش ردیف"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-t border-border bg-background/60">
                          <td colSpan={9} className="px-3 py-3">
                            <OrderOpsExpanded order={order} staff={staff} canManage={canManage} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canManage ? (
        <OrderOpsBulkBar
          selectedIds={[...selected]}
          staff={staff}
          branches={branches}
          onClear={() => setSelected(new Set())}
        />
      ) : null}

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

function MobileOrderCard({
  order,
  selected,
  expanded,
  highlighted,
  canManage,
  staff,
  onToggleSelected,
  onToggleExpanded,
  onOpen,
}: {
  order: OrderOpsListItem;
  selected: boolean;
  expanded: boolean;
  highlighted: boolean;
  canManage: boolean;
  staff: readonly CommerceStaffOption[];
  onToggleSelected: () => void;
  onToggleExpanded: () => void;
  onOpen: () => void;
}) {
  const [dx, setDx] = useState(0);

  return (
    <article
      className={`ops-mobile-card w-full rounded-2xl border bg-surface p-4 text-right ${
        highlighted ? "border-primary/40 bg-primary/[0.03]" : "border-border"
      }`}
      onTouchStart={(event) => {
        setDx(event.changedTouches[0]?.clientX ?? 0);
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX ?? dx;
        if (dx - end > 72) {
          document.getElementById(`ops-next-${order.id}`)?.click();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={selected} onChange={onToggleSelected} />
          انتخاب
        </label>
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${COMMERCE_OPS_STAGE_TONES[order.opsStage]}`}>
          {COMMERCE_OPS_STAGE_LABELS[order.opsStage]}
        </span>
      </div>
      <button type="button" onClick={onToggleExpanded} className="mt-3 w-full text-right">
        <p className="font-medium text-foreground">{order.buyerName ?? "—"}</p>
        <p className="mt-0.5 text-xs text-muted" dir="ltr">
          {order.buyerMobile ? toPersianDigits(order.buyerMobile) : "—"}
        </p>
        <p className="mt-2 text-sm leading-6">{order.productTitle}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <OrderPriorityBadge priority={order.priority} />
          <OrderDelayBadge delayed={order.delayed} delayKind={order.delayKind} />
          <OrderHealthBadge score={order.healthScore} level={order.healthLevel} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OrderBranchBadge branch={order.branch} prefix="محصول:" />
          <OrderBranchBadge branch={order.pickupBranch} prefix="دریافت:" />
        </div>
        <div className="mt-3">
          <Timeline orientation="horizontal" size="sm" nodes={stageNodes(order)} />
        </div>
      </button>
      {expanded ? (
        <div className="mt-3">
          <OrderOpsExpanded order={order} staff={staff} canManage={canManage} />
        </div>
      ) : null}
      <div className="sticky bottom-2 mt-3 space-y-2 border-t border-border bg-surface/95 pt-3">
        {canManage ? (
          <OrderNextAction
            orderId={order.id}
            opsStage={order.opsStage}
            paymentPaid={order.paymentPaid}
            canManage={canManage}
            staff={staff}
            defaultHandoverStaffUserId={order.handoverStaffUserId}
            large
          />
        ) : null}
        <div className="flex gap-2">
          <button type="button" onClick={onOpen} className="min-h-11 flex-1 rounded-xl border border-border text-sm">
            پرونده
          </button>
          <button type="button" onClick={onToggleExpanded} className="min-h-11 flex-1 rounded-xl border border-border text-sm">
            {expanded ? "بستن" : "جزئیات ردیف"}
          </button>
        </div>
      </div>
    </article>
  );
}
