"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  bulkCommerceOrdersAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import { toPersianDigits } from "@/lib/persian";

const empty: CommerceOrderActionState = {};

type Props = {
  selectedIds: readonly string[];
  staff: readonly CommerceStaffOption[];
  branches: readonly CommerceBranchBadge[];
  onClear: () => void;
};

export function OrderOpsBulkBar({ selectedIds, staff, branches, onClear }: Props) {
  const [state, action, pending] = useActionState(bulkCommerceOrdersAction, empty);
  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky bottom-3 z-30 rounded-2xl border border-primary/20 bg-surface/95 p-3 shadow-lg backdrop-blur-md">
      <form action={action} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="orderIds" value={id} />
        ))}
        <p className="text-sm font-medium text-primary">
          {toPersianDigits(selectedIds.length)} سفارش انتخاب‌شده
        </p>
        <select
          name="intent"
          required
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
          defaultValue="production"
        >
          <option value="production">انتقال به تولید</option>
          <option value="ready">آماده تحویل</option>
          <option value="deliver">تحویل شده</option>
          <option value="assignStaff">تخصیص مسئول</option>
          <option value="assignPickup">تخصیص محل دریافت</option>
        </select>
        <select
          name="handoverStaffUserId"
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="">مسئول</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <select
          name="pickupBranchId"
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="">محل دریافت</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.shortName}
            </option>
          ))}
        </select>
        {state.formError ? (
          <p className="text-sm text-danger" role="alert">
            {state.formError}
          </p>
        ) : state.successMessage ? (
          <p className="text-sm text-success">{state.successMessage}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "در حال اجرا…" : "اجرای گروهی"}
          </button>
          <Link
            href={`/admin/commerce/orders/labels?ids=${selectedIds.join(",")}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm"
          >
            چاپ برچسب
          </Link>
          <Link
            href={`/admin/commerce/orders/export.xlsx?ids=${selectedIds.join(",")}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm"
          >
            خروجی انتخاب‌شده
          </Link>
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 rounded-xl border border-border px-4 text-sm text-muted"
          >
            لغو انتخاب
          </button>
        </div>
      </form>
    </div>
  );
}
