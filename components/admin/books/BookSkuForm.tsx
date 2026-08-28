"use client";

import { useActionState } from "react";
import type { BookSkuActionState } from "@/app/admin/(dashboard)/books/catalog/actions";

const initialState: BookSkuActionState = { status: "idle", message: "" };

export type BookTaxonomyOption = { id: string; label: string };

type BookSkuFormProps = {
  mode: "create" | "edit";
  skuId?: string;
  action: (prev: BookSkuActionState, formData: FormData) => Promise<BookSkuActionState>;
  bookTypes: BookTaxonomyOption[];
  grades: BookTaxonomyOption[];
  subjects: BookTaxonomyOption[];
  majors: BookTaxonomyOption[];
  publishers: BookTaxonomyOption[];
  defaultValues: {
    title: string;
    description: string;
    keywords: string;
    publisherId: string;
    bookTypeId: string;
    gradeId: string;
    subjectId: string;
    majorId: string;
    internalCode: string;
    barcode: string;
    editionLabel: string;
    editionYear: string;
    status: string;
    listPriceRials: string;
    salePriceRials: string;
    tagNames: string;
  };
};

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: BookTaxonomyOption[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-primary" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
      >
        <option value="">— انتخاب نشده —</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  required,
  dir,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-primary" htmlFor={name}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        dir={dir}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
      />
    </div>
  );
}

export function BookSkuForm({
  mode,
  skuId,
  action,
  bookTypes,
  grades,
  subjects,
  majors,
  publishers,
  defaultValues,
}: BookSkuFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="admin-card space-y-6 p-5 sm:p-6" noValidate>
      {skuId ? <input type="hidden" name="skuId" value={skuId} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" label="عنوان کتاب" defaultValue={defaultValues.title} required />
        <TextField
          name="internalCode"
          label="کد داخلی"
          defaultValue={defaultValues.internalCode}
          required
          dir="ltr"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select name="publisherId" label="ناشر" defaultValue={defaultValues.publisherId} options={publishers} />
        <Select name="bookTypeId" label="نوع کتاب" defaultValue={defaultValues.bookTypeId} options={bookTypes} />
        <div>
          <label className="mb-1 block text-sm font-medium text-primary" htmlFor="status">
            وضعیت
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues.status}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
          >
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
            <option value="DISCONTINUED">متوقف‌شده</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select name="gradeId" label="پایه" defaultValue={defaultValues.gradeId} options={grades} />
        <Select name="subjectId" label="درس" defaultValue={defaultValues.subjectId} options={subjects} />
        <Select name="majorId" label="رشته" defaultValue={defaultValues.majorId} options={majors} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="editionLabel" label="چاپ/ویرایش" defaultValue={defaultValues.editionLabel} />
        <TextField name="editionYear" label="سال چاپ" defaultValue={defaultValues.editionYear} dir="ltr" />
        <TextField name="barcode" label="بارکد / شابک" defaultValue={defaultValues.barcode} dir="ltr" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="listPriceRials"
          label="قیمت فهرست (ریال)"
          defaultValue={defaultValues.listPriceRials}
          type="number"
          required
          dir="ltr"
        />
        <TextField
          name="salePriceRials"
          label="قیمت فروش ویژه (ریال، اختیاری)"
          defaultValue={defaultValues.salePriceRials}
          type="number"
          dir="ltr"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="keywords">
          کلیدواژه‌ها
        </label>
        <input
          id="keywords"
          name="keywords"
          defaultValue={defaultValues.keywords}
          placeholder="برای بهبود جستجو، با ویرگول جدا کنید"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="tagNames">
          برچسب‌ها
        </label>
        <input
          id="tagNames"
          name="tagNames"
          defaultValue={defaultValues.tagNames}
          placeholder="مثلاً: پرفروش، تابستان (با ویرگول جدا کنید)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary" htmlFor="description">
          توضیحات
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues.description}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "در حال ذخیره…" : mode === "create" ? "افزودن کتاب" : "ذخیره تغییرات"}
        </button>
        {state.status === "error" ? (
          <span className="text-sm text-danger">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}
