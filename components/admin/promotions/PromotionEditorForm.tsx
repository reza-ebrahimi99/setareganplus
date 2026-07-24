"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  PromotionType,
  PromotionValueType,
} from "@/generated/prisma/enums";
import {
  createPromotionAction,
  updatePromotionAction,
  type PromotionActionState,
} from "@/app/admin/(dashboard)/promotions/actions";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import { formatDateTimeLocalInTehran } from "@/lib/forms/tehran-datetime";
import {
  PROMOTION_TYPE_LABELS,
  PROMOTION_VALUE_TYPE_LABELS,
} from "@/lib/promotions/types";

const inputClass =
  "mt-1.5 w-full min-h-11 rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type Option = { id: string; name?: string; title?: string; slug?: string };

type Props = {
  mode: "create" | "edit";
  canManage: boolean;
  flowOptions: Array<{ id: string; title: string; slug: string }>;
  staffOptions: Option[];
  initial?: {
    id: string;
    title: string;
    code: string | null;
    type: PromotionType;
    valueType: PromotionValueType;
    value: number;
    maxDiscountAmount: number | null;
    stackable: boolean;
    priority: number;
    startsAt: Date | null;
    endsAt: Date | null;
    usageLimit: number | null;
    usagePerNationalCode: number | null;
    isActive: boolean;
    registrationFlowId: string | null;
    ownerStaffId: string | null;
  };
};

export function PromotionEditorForm({
  mode,
  canManage,
  flowOptions,
  staffOptions,
  initial,
}: Props) {
  const action = mode === "create" ? createPromotionAction : updatePromotionAction;
  const [state, formAction, pending] = useActionState<
    PromotionActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      {state.formError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.formError}
        </p>
      ) : null}
      {state.successMessage ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {state.successMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">عنوان</span>
          <input
            name="title"
            required
            disabled={!canManage}
            defaultValue={initial?.title ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.title ? (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.title}
            </span>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="text-muted">نوع</span>
          <select
            name="type"
            disabled={!canManage}
            defaultValue={initial?.type ?? PromotionType.COUPON}
            className={inputClass}
          >
            {Object.values(PromotionType).map((type) => (
              <option key={type} value={type}>
                {PROMOTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">کد (اختیاری برای زمان‌دار)</span>
          <input
            name="code"
            disabled={!canManage}
            defaultValue={initial?.code ?? ""}
            className={`${inputClass} uppercase`}
            dir="ltr"
            placeholder="SETAREGAN10"
          />
          {state.fieldErrors?.code ? (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.code}
            </span>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="text-muted">نوع مقدار</span>
          <select
            name="valueType"
            disabled={!canManage}
            defaultValue={initial?.valueType ?? PromotionValueType.PERCENT}
            className={inputClass}
          >
            {Object.values(PromotionValueType).map((type) => (
              <option key={type} value={type}>
                {PROMOTION_VALUE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">مقدار (درصد یا ریال)</span>
          <input
            name="value"
            type="number"
            required
            disabled={!canManage}
            defaultValue={initial?.value ?? ""}
            className={inputClass}
            dir="ltr"
          />
          {state.fieldErrors?.value ? (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.value}
            </span>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className="text-muted">سقف تخفیف (ریال)</span>
          <input
            name="maxDiscountAmount"
            type="number"
            disabled={!canManage}
            defaultValue={initial?.maxDiscountAmount ?? ""}
            className={inputClass}
            dir="ltr"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">اولویت (کمتر = زودتر)</span>
          <input
            name="priority"
            type="number"
            disabled={!canManage}
            defaultValue={initial?.priority ?? 100}
            className={inputClass}
            dir="ltr"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">سقف کل استفاده</span>
          <input
            name="usageLimit"
            type="number"
            disabled={!canManage}
            defaultValue={initial?.usageLimit ?? ""}
            className={inputClass}
            dir="ltr"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted">سقف هر کد ملی</span>
          <input
            name="usagePerNationalCode"
            type="number"
            disabled={!canManage}
            defaultValue={initial?.usagePerNationalCode ?? ""}
            className={inputClass}
            dir="ltr"
          />
        </label>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm text-muted">شروع اعتبار</p>
          <JalaliDateTimeFields
            id="startsAt"
            name="startsAt"
            disabled={!canManage}
            defaultValueIso={
              initial?.startsAt
                ? formatDateTimeLocalInTehran(initial.startsAt)
                : null
            }
            hasError={Boolean(state.fieldErrors?.startsAt)}
          />
          {state.fieldErrors?.startsAt ? (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.startsAt}
            </span>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm text-muted">پایان اعتبار</p>
          <JalaliDateTimeFields
            id="endsAt"
            name="endsAt"
            disabled={!canManage}
            defaultValueIso={
              initial?.endsAt
                ? formatDateTimeLocalInTehran(initial.endsAt)
                : null
            }
            hasError={Boolean(state.fieldErrors?.endsAt)}
          />
          {state.fieldErrors?.endsAt ? (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.endsAt}
            </span>
          ) : null}
        </div>

        <label className="block text-sm">
          <span className="text-muted">جریان ثبت‌نام (اختیاری)</span>
          <select
            name="registrationFlowId"
            disabled={!canManage}
            defaultValue={initial?.registrationFlowId ?? ""}
            className={inputClass}
          >
            <option value="">همه جریان‌ها</option>
            {flowOptions.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-muted">معرف / کارشناس (برای Referral)</span>
          <select
            name="ownerStaffId"
            disabled={!canManage}
            defaultValue={initial?.ownerStaffId ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.ownerStaffId ? (
            <span className="mt-1 block text-xs text-danger">
              {state.fieldErrors.ownerStaffId}
            </span>
          ) : null}
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            name="stackable"
            value="true"
            disabled={!canManage}
            defaultChecked={initial?.stackable ?? false}
            className="size-4 rounded border-border"
          />
          قابل ترکیب با هم‌نوع
        </label>
        <label className="block text-sm">
          <span className="text-muted">وضعیت</span>
          <select
            name="isActive"
            disabled={!canManage}
            defaultValue={initial?.isActive === false ? "false" : "true"}
            className={inputClass}
          >
            <option value="true">فعال</option>
            <option value="false">غیرفعال / آرشیو</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        {canManage ? (
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "در حال ذخیره…" : mode === "create" ? "ایجاد" : "ذخیره"}
          </button>
        ) : null}
        <Link
          href="/admin/promotions"
          className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          بازگشت
        </Link>
      </div>
    </form>
  );
}
