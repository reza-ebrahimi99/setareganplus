import Link from "next/link";
import { siteConfig } from "@/content/site";
import { AdminNavigation } from "./AdminNavigation";

export function AdminSidebar({ permissions }: { permissions: readonly string[] }) {
  return (
    <>
      <aside
        className="admin-sidebar hidden w-64 shrink-0 xl:w-72 lg:flex lg:flex-col"
        aria-label="ناوبری مدیریت"
      >
        <div className="border-b border-white/10 px-4 py-5">
          <Link
            href="/admin"
            className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <p className="text-base font-bold text-white">{siteConfig.name}</p>
            <p className="mt-1 text-xs text-slate-400">پنل مدیریت</p>
            <p className="mt-0.5 text-[11px] text-slate-500">پیش‌نمایش توسعه</p>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <AdminNavigation permissions={permissions} />
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="mb-2 text-[11px] leading-5 text-slate-500">
            کاربر مدیر پس از ورود نمایش داده می‌شود
          </p>
          <Link
            href="/"
            className="text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            بازگشت به وب‌سایت عمومی
          </Link>
        </div>
      </aside>

      <details className="admin-mobile-nav border-b border-white/10 bg-primary lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
          <span>منوی پنل مدیریت</span>
          <span aria-hidden="true" className="text-slate-400">
            ▾
          </span>
        </summary>
        <nav className="border-t border-white/10 px-2 py-3">
          <AdminNavigation permissions={permissions} />
        </nav>
      </details>
    </>
  );
}
