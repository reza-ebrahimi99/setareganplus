"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavGroups } from "@/content/admin";
import { AdminNavIconComponent } from "./AdminIcons";

function getLinkClassName(isActive: boolean) {
  const base =
    "admin-nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

  if (isActive) {
    return `${base} admin-nav-link-active font-semibold text-white`;
  }

  return `${base} text-slate-300 hover:bg-white/5 hover:text-white`;
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
