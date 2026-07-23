"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavGroups } from "@/content/admin";
import { AdminNavIconComponent } from "./AdminIcons";

function getLinkClassName(isActive: boolean, nested = false) {
  const base = nested
    ? "admin-nav-link flex items-center gap-2 rounded-lg py-1.5 pe-3 ps-9 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    : "admin-nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

  if (isActive) {
    return `${base} admin-nav-link-active font-semibold text-white`;
  }

  return `${base} text-slate-300 hover:bg-white/5 hover:text-white`;
}

function isRegistrationsListActive(pathname: string): boolean {
  if (pathname === "/admin/registrations") return true;
  if (!pathname.startsWith("/admin/registrations/")) return false;
  if (pathname.startsWith("/admin/registrations/abandoned")) return false;
  if (pathname.startsWith("/admin/registrations/flows")) return false;
  return true;
}

function isChildNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/registrations") {
    return isRegistrationsListActive(pathname);
  }
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavGroupOpen(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigation({ permissions }: { permissions: readonly string[] }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      {adminNavGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.filter((item) =>
              !item.enabled || !item.permission || permissions.includes(item.permission),
            ).map((item) => {
              if (item.enabled) {
                const children = item.children?.filter(
                  (child) =>
                    !child.permission || permissions.includes(child.permission),
                );

                if (children && children.length > 0) {
                  const groupOpen = isNavGroupOpen(pathname, item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={getLinkClassName(groupOpen && pathname === item.href)}
                        aria-current={
                          groupOpen && pathname === item.href ? "page" : undefined
                        }
                      >
                        <AdminNavIconComponent name={item.icon} className="size-[18px]" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                      {groupOpen ? (
                        <ul className="mt-0.5 space-y-0.5">
                          {children.map((child) => {
                            const childActive = isChildNavActive(pathname, child.href);
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  className={getLinkClassName(childActive, true)}
                                  aria-current={childActive ? "page" : undefined}
                                >
                                  <span className="flex-1">{child.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                }

                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={getLinkClassName(isActive)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <AdminNavIconComponent name={item.icon} className="size-[18px]" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.label}>
                  <span
                    aria-disabled="true"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500"
                  >
                    <AdminNavIconComponent
                      name={item.icon}
                      className="size-[18px] opacity-50"
                    />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">
                      در نقشه توسعه
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
