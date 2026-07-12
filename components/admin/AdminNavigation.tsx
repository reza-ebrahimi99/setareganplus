"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/content/admin";

function getLinkClassName(isActive: boolean) {
  const base =
    "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

  if (isActive) {
    return `${base} bg-primary text-white font-semibold`;
  }

  return `${base} text-slate-300 hover:bg-white/5 hover:text-white`;
}

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {adminNavItems.map((item) => {
        if ("href" in item && item.enabled) {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={getLinkClassName(isActive)}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{item.label}</span>
              </Link>
            </li>
          );
        }

        return (
          <li key={item.label}>
            <span
              aria-disabled="true"
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500"
            >
              <span>{item.label}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                در نقشه توسعه
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
