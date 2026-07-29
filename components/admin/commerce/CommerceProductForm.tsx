"use client";

import { useActionState } from "react";
import {
  createCommerceProductAction,
  updateCommerceProductAction,
  type CommerceProductActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import {
  COMMERCE_BINDING_TYPE_LABELS,
  COMMERCE_BINDING_TYPES,
  COMMERCE_FORMAT_SIZE_LABELS,
  COMMERCE_FORMAT_SIZES,
  COMMERCE_PRINT_TYPE_LABELS,
  COMMERCE_PRINT_TYPES,
} from "@/lib/commerce/booklet";
import { COMMERCE_ITEM_STATUSES } from "@/lib/commerce/types";

const emptyState: CommerceProductActionState = {};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  OUT_OF_STOCK: "ناموجود",
  ARCHIVED: "بایگانی",
};

export type CommerceProductFormDefaults = {
  id?: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  authors: string;
  subject: string;
  gradeLabel: string;
  pageCount: string;
  editionYear: string;
  printType: string;
  bindingType: string;
  formatSize: string;
  featuresText: string;
  basePriceRials: string;
  salePriceRials: string;
  priceStartsAt: string;
  priceEndsAt: string;
  stockQuantity: string;
  status: string;
  isVisible: boolean;
  categoryId: string;
  primaryImageAssetId: string | null;
  imageUrl: string | null;
};

type CategoryOption = { id: string; title: string };

type Props = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  defaults?: CommerceProductFormDefaults;
};

export function CommerceProductForm({ mode, categories, defaults }: Props) {
  const action =
    mode === "create" ? createCommerceProductAction : updateCommerceProductAction;
  const [state, formAction, pending] = useActionState(action, emptyState);

  return (
    <form action={formAction} className="admin-card space-y-5 p-4 sm:p-6">
      {defaults?.id ? (
        <input type="hidden" name="itemId" value={defaults.id} />
      ) : null}

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}
      {state.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {state.successMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام محصول" className="sm:col-span-2">
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={defaults?.title ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="slug">
          <input
            name="slug"
            dir="ltr"
            maxLength={80}
            defaultValue={defaults?.slug ?? ""}
            placeholder="auto از عنوان"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="دسته‌بندی">
          <select
            name="categoryId"
            defaultValue={defaults?.categoryId ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">— انتخاب —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="درس">
          <input
            name="subject"
            defaultValue={defaults?.subject ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="پایه تحصیلی">
          <input
            name="gradeLabel"
            defaultValue={defaults?.gradeLabel ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="مؤلف / مؤلفان" className="sm:col-span-2">
          <input
            name="authors"
            defaultValue={defaults?.authors ?? ""}
            placeholder="نام مؤلفان"
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="تعداد صفحات">
          <input
            name="pageCount"
            type="number"
            min={0}
            defaultValue={defaults?.pageCount ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="سال چاپ / ویرایش">
          <input
            name="editionYear"
            type="number"
            min={1300}
            max={1500}
            defaultValue={defaults?.editionYear ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="نوع چاپ">
          <select
            name="printType"
            defaultValue={defaults?.printType ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">—</option>
            {COMMERCE_PRINT_TYPES.map((v) => (
              <option key={v} value={v}>
                {COMMERCE_PRINT_TYPE_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="نوع صحافی">
          <select
            name="bindingType"
            defaultValue={defaults?.bindingType ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">—</option>
            {COMMERCE_BINDING_TYPES.map((v) => (
              <option key={v} value={v}>
                {COMMERCE_BINDING_TYPE_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="قطع جزوه">
          <select
            name="formatSize"
            defaultValue={defaults?.formatSize ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            <option value="">—</option>
            {COMMERCE_FORMAT_SIZES.map((v) => (
              <option key={v} value={v}>
                {COMMERCE_FORMAT_SIZE_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="وضعیت">
          <select
            name="status"
            defaultValue={defaults?.status ?? "DRAFT"}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          >
            {COMMERCE_ITEM_STATUSES.map((v) => (
              <option key={v} value={v}>
                {STATUS_LABELS[v] ?? v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="قیمت اصلی (ریال)">
          <input
            name="basePriceRials"
            type="number"
            min={0}
            required
            defaultValue={defaults?.basePriceRials ?? "0"}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="قیمت فروش (ریال)">
          <input
            name="salePriceRials"
            type="number"
            min={0}
            defaultValue={defaults?.salePriceRials ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="شروع تخفیف (UTC)">
          <input
            name="priceStartsAt"
            type="datetime-local"
            defaultValue={defaults?.priceStartsAt ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="پایان تخفیف (UTC)">
          <input
            name="priceEndsAt"
            type="datetime-local"
            defaultValue={defaults?.priceEndsAt ?? ""}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="موجودی">
          <input
            name="stockQuantity"
            type="number"
            min={0}
            required
            defaultValue={defaults?.stockQuantity ?? "0"}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="isVisible"
            value="true"
            defaultChecked={defaults?.isVisible ?? true}
            className="size-4 rounded border-border"
          />
          نمایش در فروشگاه
        </label>
        <div className="sm:col-span-2">
          <MediaPickerField
            key={`cover-${defaults?.primaryImageAssetId ?? "none"}`}
            name="primaryImageAssetId"
            label="تصویر جلد"
            value={defaults?.primaryImageAssetId ?? null}
            previewUrl={defaults?.imageUrl ?? null}
            previewTitle={defaults?.title ?? null}
            clearable
            allowUpload
          />
        </div>
        <Field label="توضیح کوتاه" className="sm:col-span-2">
          <textarea
            name="shortDescription"
            rows={2}
            maxLength={500}
            defaultValue={defaults?.shortDescription ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field label="توضیحات کامل" className="sm:col-span-2">
          <textarea
            name="description"
            rows={5}
            defaultValue={defaults?.description ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
        <Field
          label="سرفصل‌ها / ویژگی‌ها (هر خط یک مورد)"
          className="sm:col-span-2"
        >
          <textarea
            name="features"
            rows={5}
            defaultValue={defaults?.featuresText ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
          />
        </Field>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
        روش تحویل ثابت: تحویل حضوری از مؤسسه آموزشی ستارگان (بدون ارسال پستی).
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending
          ? "در حال ذخیره…"
          : mode === "create"
            ? "ایجاد محصول"
            : "ذخیره تغییرات"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block text-muted">{label}</span>
      {children}
    </label>
  );
}
