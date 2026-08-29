"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PortalIcon } from "@/components/portal/icons";
import {
  isPortalNavActive,
  type PortalOsNavItem,
} from "@/components/portal/nav/types";

type PortalMobileDockProps = {
  items: readonly PortalOsNavItem[];
  ariaLabel?: string;
};

/**
 * Mobile bottom dock — data-driven from nav items with `dock: true`.
 */
export function PortalMobileDock({
  items,
  ariaLabel = "میانبرهای پرتال",
}: PortalMobileDockProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="portal-dock" aria-label={ariaLabel}>
      <ul className="portal-dock__list">
        {items.map((item) => {
          const active = isPortalNavActive(pathname, item, search);
          return (
            <li key={item.id} className="portal-dock__item">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-portal-accent={item.accent}
                className={
                  active
                    ? "portal-dock__link portal-dock__link--active"
                    : "portal-dock__link"
                }
              >
                <PortalIcon name={item.icon} className="size-5" />
                <span className="portal-dock__label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
