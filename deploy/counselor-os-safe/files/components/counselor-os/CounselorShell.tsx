"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COUNSELOR_OS_HOME } from "@/lib/counselor-os/constants";

const NAV = [
  { href: COUNSELOR_OS_HOME, label: "داشبورد", exact: true },
  { href: "/admin/counselor/students", label: "دانش‌آموزان" },
  { href: "/admin/counselor/calendar", label: "تقویم" },
  { href: "/admin/counselor/appointments", label: "جلسات" },
  { href: "/admin/counselor/follow-ups", label: "پیگیری‌ها" },
  { href: "/admin/counselor/settings", label: "حساب" },
] as const;

export function CounselorShell({
  displayName,
  children,
}: {
  displayName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="cos-shell" dir="rtl">
      <aside className="cos-shell__sidebar" aria-label="ناوبری مشاور">
        <div className="cos-shell__brand">
          <p className="cos-shell__eyebrow">SetareganPlus</p>
          <strong>سامانه مشاور</strong>
        </div>
        <nav className="cos-shell__nav">
          {NAV.map((item) => {
            const exact = "exact" in item && item.exact === true;
            const active = exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="cos-shell__sidebar-foot">
          <Link href="/admin/guidance" className="cos-shell__legacy">
            میز کار پرونده (قدیم)
          </Link>
        </div>
      </aside>

      <div className="cos-shell__main">
        <header className="cos-shell__header">
          <div>
            <p className="cos-shell__header-eyebrow">اتاق کار مشاور</p>
            <p className="cos-shell__header-user">{displayName}</p>
          </div>
          <form action="/portal/logout" method="post" className="cos-shell__logout">
            <input type="hidden" name="next" value="/guidance" />
            <button type="submit">خروج از حساب</button>
          </form>
        </header>
        <main className="cos-shell__content">{children}</main>
      </div>

      <nav className="cos-shell__mobile-nav" aria-label="میانبر موبایل">
        {NAV.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              (("exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href))
                ? "is-active"
                : undefined)
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
