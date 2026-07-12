import { AdminNotice } from "./AdminNotice";

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-surface px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">پیش‌نمایش رابط مدیریت</p>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted">
            بدون احراز هویت
          </span>
        </div>
        <AdminNotice />
      </div>
    </header>
  );
}
