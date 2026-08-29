import { recentActivityEmpty } from "@/content/admin";

export function AdminTimelineEmpty() {
  return (
    <div className="admin-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-primary sm:text-lg">
        {recentActivityEmpty.title}
      </h2>
      <div className="mt-5 space-y-4" role="status">
        <div className="flex gap-3">
          <div
            aria-hidden="true"
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-background"
          >
            <span className="text-xs text-muted">—</span>
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-dashed border-border bg-background px-4 py-3">
            <p className="text-sm font-medium text-primary">
              {recentActivityEmpty.message}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted">
              {recentActivityEmpty.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
