"use client";

import { useActionState, useState } from "react";
import {
  addOrderNoteAction,
  rollbackOrderStageAction,
  updateOrderDetailsAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { Timeline } from "@/components/admin/Timeline";
import { OrderBranchBadge } from "@/components/admin/commerce/OrderBranchBadge";
import { OrderNextAction } from "@/components/admin/commerce/OrderNextAction";
import { OrderQrThumb } from "@/components/admin/commerce/OrderQrThumb";
import {
  OrderDelayBadge,
  OrderHealthBadge,
  OrderPriorityBadge,
} from "@/components/admin/commerce/OrderOpsSignals";
import { StudentAcademicFields } from "@/components/commerce/StudentAcademicFields";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import {
  COMMERCE_OPS_STAGE_HINTS,
  COMMERCE_OPS_STAGE_LABELS,
  canRollbackCommerceOpsStage,
} from "@/lib/commerce/orders/ops-stage";
import { toPersianDigits } from "@/lib/persian";
import type { OrderOpsDetailView } from "@/components/admin/commerce/order-ops-types";

const empty: CommerceOrderActionState = {};

type Props = {
  open: boolean;
  pending: boolean;
  detail: OrderOpsDetailView | null;
  branches: readonly CommerceBranchBadge[];
  staff: readonly CommerceStaffOption[];
  canManage: boolean;
  canRollback: boolean;
  onClose: () => void;
};

export function OrderOpsDrawer({
  open,
  pending,
  detail,
  branches,
  staff,
  canManage,
  canRollback,
  onClose,
}: Props) {
  const [editing, setEditing] = useState(false);
  const canRollbackStage = Boolean(
    canRollback &&
      detail &&
      canRollbackCommerceOpsStage({
        current: detail.opsStage,
        paymentPaid: detail.paymentPaid,
        allowDeliveredRollback: canRollback,
      }).ok,
  );

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={detail?.buyerName ?? "پرونده سفارش"}
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
          <DrawerFooter
            detail={detail}
            staff={staff}
            canManage={canManage}
            canRollback={canRollbackStage}
            editing={editing}
            onEdit={() => setEditing((value) => !value)}
          />
        ) : null
      }
    >
      {detail ? (
        <DrawerBody
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-left">{children}</dd>
    </div>
  );
}

function DrawerBody({
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
        <h3 className="text-sm font-semibold text-primary">دانش‌آموز</h3>
        <div className="flex flex-wrap gap-1.5">
          <OrderPriorityBadge priority={detail.priority} />
          <OrderDelayBadge delayed={detail.delayed} delayKind={detail.delayKind} />
          <OrderHealthBadge score={detail.healthScore} level={detail.healthLevel} />
        </div>
        {editing && canManage ? (
          <OrderEditForm detail={detail} branches={branches} />
        ) : (
          <dl className="grid gap-2">
            <Row label="نام">{detail.buyerName ?? "—"}</Row>
            <Row label="والد">{detail.parentName ?? "—"}</Row>
            <Row label="موبایل">
              <span dir="ltr">
                {detail.buyerMobile ? toPersianDigits(detail.buyerMobile) : "—"}
              </span>
            </Row>
            <Row label="کد ملی">
              <span dir="ltr">
                {detail.buyerNationalCode
                  ? toPersianDigits(detail.buyerNationalCode)
                  : "—"}
              </span>
            </Row>
          </dl>
        )}
      </section>

      {!editing ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">تحصیلی</h3>
          <dl className="grid gap-2">
            <Row label="پایه">{detail.studentGradeLabel ?? "—"}</Row>
            <Row label="رشته">{detail.studentMajorLabel ?? "—"}</Row>
          </dl>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">QR و اقدام سریع</h3>
        <OrderQrThumb token={detail.qrToken} size={160} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">شعبه و دریافت</h3>
        <div className="flex flex-wrap gap-2">
          <OrderBranchBadge branch={detail.branch} size="md" prefix="محصول:" />
          <OrderBranchBadge branch={detail.pickupBranch} size="md" prefix="دریافت:" />
        </div>
        {detail.branch?.address ? (
          <p className="text-xs text-muted">{detail.branch.address}</p>
        ) : null}
        {detail.pickupBranch?.address ? (
          <p className="text-xs text-muted">دریافت: {detail.pickupBranch.address}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">سفارش</h3>
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
        {detail.urgentDelivery ? (
          <p className="text-xs font-medium text-amber-700">تحویل فوری</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">مسئول تحویل</h3>
        <p className="text-sm">{detail.handoverStaffName ?? "هنوز انتخاب نشده"}</p>
        {detail.deliveredAtLabel ? (
          <p className="text-xs text-muted">{detail.deliveredAtLabel}</p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">پرداخت</h3>
        <p className="text-sm">
          {detail.paymentLabel}
          {detail.bookletPaymentMethodLabel ? ` · ${detail.bookletPaymentMethodLabel}` : ""}
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
          <p className="text-xs text-muted">{COMMERCE_OPS_STAGE_HINTS[detail.opsStage]}</p>
        </div>
        <Timeline nodes={detail.timeline} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">یادداشت</h3>
        <p className="whitespace-pre-wrap rounded-xl bg-background px-3 py-2.5 text-sm leading-7">
          {detail.notes || "یادداشتی ثبت نشده است."}
        </p>
        {detail.specialNotes ? (
          <p className="whitespace-pre-wrap rounded-xl border border-border px-3 py-2.5 text-sm leading-7">
            {detail.specialNotes}
          </p>
        ) : null}
        {canManage ? <OrderNoteForm orderId={detail.id} /> : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">تاریخچه</h3>
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
        <p>دانش‌آموز: {detail.buyerName}</p>
        <p>موبایل: {detail.buyerMobile}</p>
        <p>پایه: {detail.studentGradeLabel ?? "—"}</p>
        <p>شعبه: {detail.branch?.name ?? "—"}</p>
        <p>محل دریافت: {detail.pickupBranch?.name ?? "—"}</p>
        <p>مسئول تحویل: {detail.handoverStaffName ?? "—"}</p>
        <p>محصول: {detail.productTitle}</p>
        <p>مبلغ: {detail.amountLabel}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/admin/commerce/orders/qr/${encodeURIComponent(detail.qrToken)}?preview=1`}
          alt="QR"
          width={140}
          height={140}
        />
      </section>
    </div>
  );
}

function DrawerFooter({
  detail,
  staff,
  canManage,
  canRollback,
  editing,
  onEdit,
}: {
  detail: OrderOpsDetailView;
  staff: readonly CommerceStaffOption[];
  canManage: boolean;
  canRollback: boolean;
  editing: boolean;
  onEdit: () => void;
}) {
  const [rollbackState, rollbackAction, rollbackPending] = useActionState(
    rollbackOrderStageAction,
    empty,
  );

  return (
    <div className="space-y-3">
      {rollbackState.formError ? (
        <p className="text-sm text-danger" role="alert">
          {rollbackState.formError}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <OrderNextAction
          orderId={detail.id}
          opsStage={detail.opsStage}
          paymentPaid={detail.paymentPaid}
          canManage={canManage}
          staff={staff}
          defaultHandoverStaffUserId={detail.handoverStaffUserId}
        />
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
          <form action={rollbackAction} className="w-full space-y-2 sm:w-auto">
            <input type="hidden" name="orderId" value={detail.id} />
            <textarea
              name="note"
              required={detail.opsStage === "DELIVERED_TO_STUDENT"}
              rows={2}
              placeholder={
                detail.opsStage === "DELIVERED_TO_STUDENT"
                  ? "دلیل بازگشت الزامی است"
                  : "دلیل بازگشت (اختیاری)"
              }
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
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
  const [state, action, pending] = useActionState(addOrderNoteAction, empty);
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
  const [state, action, pending] = useActionState(updateOrderDetailsAction, empty);
  const inputClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={detail.id} />
      <label className="block text-sm">
        <span className="mb-1 block text-muted">نام</span>
        <input name="buyerFirstName" defaultValue={detail.buyerFirstName ?? ""} required className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">نام خانوادگی</span>
        <input name="buyerLastName" defaultValue={detail.buyerLastName ?? ""} required className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">والد</span>
        <input name="parentName" defaultValue={detail.parentName ?? ""} className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">موبایل</span>
        <input name="buyerMobile" defaultValue={detail.buyerMobile ?? ""} dir="ltr" className={inputClass} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">کد ملی</span>
        <input name="buyerNationalCode" defaultValue={detail.buyerNationalCode ?? ""} dir="ltr" className={inputClass} />
      </label>
      <StudentAcademicFields
        defaultGrade={detail.studentGrade ?? ""}
        defaultMajor={detail.studentMajor}
      />
      <label className="block text-sm">
        <span className="mb-1 block text-muted">شعبه محصول</span>
        <select name="branchId" defaultValue={detail.branch?.id ?? ""} className={inputClass}>
          <option value="">انتخاب شعبه</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">محل دریافت جزوه</span>
        <select name="pickupBranchId" required defaultValue={detail.pickupBranch?.id ?? ""} className={inputClass}>
          <option value="">انتخاب محل دریافت</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.shortName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="opsVip" defaultChecked={detail.opsVip} />
        VIP
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">یادداشت</span>
        <textarea name="notes" defaultValue={detail.notes ?? ""} rows={3} className={`${inputClass} py-2.5 text-sm`} />
      </label>
      {state.formError ? (
        <p className="text-sm text-danger">{state.formError}</p>
      ) : state.successMessage ? (
        <p className="text-sm text-success">{state.successMessage}</p>
      ) : null}
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-primary px-4 text-sm text-white disabled:opacity-60">
        {pending ? "در حال ذخیره…" : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
