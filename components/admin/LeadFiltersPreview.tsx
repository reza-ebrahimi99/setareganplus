import { leadStatusFilterPreview } from "@/content/admin";
import { LeadStatusBadge } from "./LeadStatusBadge";

export function LeadFiltersPreview() {
  return (
    <div className="admin-card space-y-5 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-primary">فیلترها</h2>
        <p className="mt-1 text-xs text-muted">
          فیلترها پس از اتصال پایگاه داده فعال می‌شوند. این بخش صرفاً پیش‌نمایش رابط
          است.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-2">
          <label
            htmlFor="lead-search-preview"
            className="mb-2 block text-sm font-medium text-primary"
          >
            جستجو — پیش‌نمایش
          </label>
          <input
            id="lead-search-preview"
            type="search"
            disabled
            aria-disabled="true"
            placeholder="جستجو بر اساس نام یا موبایل"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted"
          />
        </div>

        <div>
          <label
            htmlFor="branch-filter-preview"
            className="mb-2 block text-sm font-medium text-primary"
          >
            شعبه — پیش‌نمایش
          </label>
          <select
            id="branch-filter-preview"
            disabled
            aria-disabled="true"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted"
          >
            <option>همه شعب</option>
          </select>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-primary">وضعیت — پیش‌نمایش</p>
        <div className="flex flex-wrap gap-2">
          {leadStatusFilterPreview.map((status) => (
            <button
              key={status}
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted"
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <LeadStatusBadge label="فیلترها غیرفعال" tone="neutral" />
        <span className="text-xs text-muted">
          خروجی، اختصاص و تغییر وضعیت گروهی — در نقشه توسعه
        </span>
      </div>
    </div>
  );
}
