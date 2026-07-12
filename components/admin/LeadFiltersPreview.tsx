import { leadStatusFilterPreview } from "@/content/admin";
import { LeadStatusBadge } from "./LeadStatusBadge";

export function LeadFiltersPreview() {
  return (
    <div className="admin-card space-y-4 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label
            htmlFor="lead-search-preview"
            className="mb-2 block text-sm font-medium text-primary"
          >
            جستجو
          </label>
          <input
            id="lead-search-preview"
            type="search"
            disabled
            aria-disabled="true"
            placeholder="جستجو بر اساس نام یا موبایل — پیش‌نمایش"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted"
          />
          <p className="mt-2 text-xs text-muted">
            جستجو پس از اتصال پایگاه داده فعال می‌شود.
          </p>
        </div>

        <div>
          <label
            htmlFor="branch-filter-preview"
            className="mb-2 block text-sm font-medium text-primary"
          >
            شعبه
          </label>
          <select
            id="branch-filter-preview"
            disabled
            aria-disabled="true"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted"
          >
            <option>همه شعب — پیش‌نمایش</option>
          </select>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-primary">فیلتر وضعیت</p>
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
        <p className="mt-3 text-xs text-muted">
          نمونه برچسب‌های وضعیت برای پیش‌نمایش رابط — بدون داده واقعی.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <LeadStatusBadge label="پیش‌نمایش فیلتر" tone="info" />
        <LeadStatusBadge label="بدون داده" tone="neutral" />
      </div>
    </div>
  );
}
