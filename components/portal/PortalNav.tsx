"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PortalNavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

type PortalNavProps = {
  items: PortalNavItem[];
};

function isActive(pathname: string, item: PortalNavItem): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PortalNav({ items }: PortalNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ناوبری پرتال"
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "shrink-0 rounded-xl border border-secondary/30 bg-secondary/10 px-3.5 py-2 text-sm font-medium text-primary"
                : "shrink-0 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted hover:text-primary"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
