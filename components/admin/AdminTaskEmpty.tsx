import { todayTasksEmpty } from "@/content/admin";

export function AdminTaskEmpty() {
  return (
    <div className="admin-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-primary sm:text-lg">
          {todayTasksEmpty.title}
        </h2>
        <span
          className="rounded-full border border-border bg-background px-2.5 py-0.5 text-lg font-bold text-muted"
          aria-label="بدون مورد پیگیری"
        >
          —
        </span>
      </div>
      <div
        className="mt-5 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center"
        role="status"
      >
        <p className="text-sm font-medium text-primary">{todayTasksEmpty.message}</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted">
          {todayTasksEmpty.description}
        </p>
      </div>
    </div>
  );
}
