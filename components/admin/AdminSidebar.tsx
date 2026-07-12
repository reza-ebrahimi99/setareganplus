import Link from "next/link";
import { siteConfig } from "@/content/site";
import { AdminNavigation } from "./AdminNavigation";

export function AdminSidebar() {
  return (
    <>
      <aside
        className="admin-sidebar hidden w-72 shrink-0 lg:flex lg:flex-col"
        aria-label="ناوبری مدیریت"
      >
        <div className="border-b border-white/10 px-5 py-5">
          <Link
            href="/admin"
            className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <p className="text-lg font-bold text-white">{siteConfig.name}</p>
            <p className="mt-1 text-xs text-slate-400">پیش‌نمایش مدیریت</p>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <AdminNavigation />
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <Link
            href="/"
            className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            بازگشت به وب‌سایت عمومی
          </Link>
        </div>
      </aside>

      <details className="admin-mobile-nav border-b border-border bg-primary px-4 py-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
          <span>منوی مدیریت</span>
          <span aria-hidden="true" className="text-slate-400">
            ▾
          </span>
        </summary>
        <nav className="mt-3 rounded-xl border border-white/10 bg-primary p-2">
          <AdminNavigation />
        </nav>
      </details>
    </>
  );
}
