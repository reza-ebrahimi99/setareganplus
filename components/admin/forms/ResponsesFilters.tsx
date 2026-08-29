import Link from "next/link";
import { JalaliDateField } from "@/components/datetime/JalaliDateField";
import { FORM_SUBMISSION_STATUS_OPTIONS } from "@/lib/forms/form-submission-status-labels";
import type { ResponseListFilters } from "@/lib/forms/load-form-responses";

type ResponsesFiltersProps = {
  formId: string;
  filters: ResponseListFilters;
};

export function ResponsesFilters({ formId, filters }: ResponsesFiltersProps) {
  return (
    <form
      method="get"
      className="admin-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      <div className="sm:col-span-2 xl:col-span-2">
        <label htmlFor="filter-q" className="text-xs font-medium text-muted">
          جستجو
        </label>
        <input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="موبایل یا ایمیل"
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
      </div>

      <div>
        <label
          htmlFor="filter-mobile"
          className="text-xs font-medium text-muted"
        >
          موبایل
        </label>
        <input
          id="filter-mobile"
          name="mobile"
          type="text"
          defaultValue={filters.mobile ?? ""}
          dir="ltr"
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
      </div>

      <div>
        <label
          htmlFor="filter-status"
          className="text-xs font-medium text-muted"
        >
          وضعیت
        </label>
        <select
          id="filter-status"
          name="status"
          defaultValue={filters.status ?? ""}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <option value="">همه</option>
          {FORM_SUBMISSION_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-from" className="text-xs font-medium text-muted">
          از تاریخ
        </label>
        <JalaliDateField
          id="filter-from"
          name="from"
          defaultValue={filters.from ?? null}
        />
      </div>

      <div>
        <label htmlFor="filter-to" className="text-xs font-medium text-muted">
          تا تاریخ
        </label>
        <JalaliDateField
          id="filter-to"
          name="to"
          defaultValue={filters.to ?? null}
        />
      </div>

      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3 xl:col-span-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="duplicate"
            value="1"
            defaultChecked={Boolean(filters.duplicateOnly)}
            className="size-4 rounded border-border"
          />
          فقط تکراری‌ها
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/92"
        >
          اعمال فیلتر
        </button>
        <Link
          href={`/admin/forms/${formId}/responses`}
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-background"
        >
          پاک‌کردن
        </Link>
      </div>
    </form>
  );
}
