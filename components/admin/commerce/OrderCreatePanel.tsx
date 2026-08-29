"use client";

import { useActionState, useState } from "react";
import {
  createAdminCommerceOrderAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import { StudentAcademicFields } from "@/components/commerce/StudentAcademicFields";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import {
  COMMERCE_ACQUISITION_SOURCE_LABELS,
  COMMERCE_ACQUISITION_SOURCES,
  COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS,
  COMMERCE_BOOKLET_PAYMENT_METHODS,
} from "@/lib/commerce/student-fields";

const empty: CommerceOrderActionState = {};

type ItemOption = { id: string; title: string };

type Props = {
  branches: readonly CommerceBranchBadge[];
  items: readonly ItemOption[];
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5";

export function OrderCreatePanel({ branches, items }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createAdminCommerceOrderAction,
    empty,
  );

  return (
    <section className="admin-glass p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">ثبت سفارش داخلی</h2>
          <p className="text-xs text-muted">
            سفارش حضوری دانش‌آموز با محل دریافت و اطلاعات تحصیلی
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-h-10 rounded-xl border border-border px-4 text-sm text-primary"
        >
          {open ? "بستن فرم" : "سفارش جدید"}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-5 space-y-6">
          {state.formError ? (
            <p className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
              {state.formError}
            </p>
          ) : null}

          <fieldset className="grid gap-3 rounded-2xl border border-border/80 bg-surface/70 p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-primary">اطلاعات سفارش</legend>
            <Field label="محصول / جزوه">
              <select name="itemId" required className={inputClass}>
                <option value="">انتخاب محصول</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="روش پرداخت">
              <select name="bookletPaymentMethod" className={inputClass} defaultValue="CASH">
                {COMMERCE_BOOKLET_PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {COMMERCE_BOOKLET_PAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="کد تخفیف">
              <input name="discountCode" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="urgentDelivery" className="size-4 rounded border-border" />
              نیاز به تحویل فوری
            </label>
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-border/80 bg-surface/70 p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-primary">اطلاعات دانش‌آموز</legend>
            <Field label="نام">
              <input name="buyerFirstName" required className={inputClass} />
            </Field>
            <Field label="نام خانوادگی">
              <input name="buyerLastName" required className={inputClass} />
            </Field>
            <Field label="موبایل">
              <input name="buyerMobile" required dir="ltr" className={inputClass} />
            </Field>
            <Field label="کد ملی (اختیاری)">
              <input name="buyerNationalCode" dir="ltr" maxLength={10} className={inputClass} />
            </Field>
            <Field label="نام والد / همراه">
              <input name="parentName" className={inputClass} />
            </Field>
            <Field label="معرف">
              <input name="referredBy" className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-border/80 bg-surface/70 p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-primary">اطلاعات تحصیلی</legend>
            <StudentAcademicFields />
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-border/80 bg-surface/70 p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-primary">شعبه و دریافت</legend>
            <Field label="شعبه محصول">
              <select name="branchId" className={inputClass}>
                <option value="">از روی محصول</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                    {branch.address ? ` — ${branch.address}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="محل دریافت جزوه">
              <select name="pickupBranchId" required className={inputClass}>
                <option value="">انتخاب محل دریافت</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.shortName}
                    {branch.address ? ` — ${branch.address}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تاریخ دریافت ترجیحی">
              <input type="date" name="preferredPickupAt" className={inputClass} />
            </Field>
            <Field label="از کجا با ما آشنا شدید؟">
              <select name="acquisitionSource" className={inputClass}>
                <option value="">انتخاب نشده</option>
                {COMMERCE_ACQUISITION_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {COMMERCE_ACQUISITION_SOURCE_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-border/80 bg-surface/70 p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-semibold text-primary">یادداشت و فایل</legend>
            <Field label="توضیحات">
              <textarea name="notes" rows={3} className={inputClass} />
            </Field>
            <Field label="یادداشت ویژه عملیات">
              <textarea name="specialNotes" rows={3} className={inputClass} />
            </Field>
            <p className="text-xs leading-6 text-muted sm:col-span-2">
              پیوست فایل از طریق یادداشت داخلی سفارش ثبت می‌شود؛ آپلود جداگانه در این ماژول فعال نیست.
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={pending || items.length === 0}
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "در حال ثبت…" : "ثبت سفارش"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
