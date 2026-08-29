"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalIcon } from "@/components/portal/icons";
import {
  isPortalNavActive,
  type PortalOsNavSection,
} from "@/components/portal/nav/types";

type PortalSidebarProps = {
  sections: readonly PortalOsNavSection[];
  organizationName: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

/**
 * Desktop RTL sidebar — renders solely from nav config arrays.
 */
export function PortalSidebar({
  sections,
  organizationName,
  collapsed = false,
  onToggleCollapsed,
}: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "portal-sidebar",
        collapsed ? "portal-sidebar--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="ناوبری پرتال دانش‌آموز"
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className="portal-sidebar__brand">
        <p className="portal-sidebar__eyebrow">پرتال دانش‌آموز</p>
        {!collapsed ? (
          <p className="portal-sidebar__org" title={organizationName}>
            {organizationName}
          </p>
        ) : null}
        {onToggleCollapsed ? (
          <button
            type="button"
            className="portal-sidebar__collapse"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
          >
            <PortalIcon name="panel" className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="portal-sidebar__nav">
        {sections.map((section) => (
          <div key={section.id} className="portal-sidebar__section">
            {section.label && !collapsed ? (
              <p className="portal-sidebar__section-label">{section.label}</p>
            ) : null}
            <ul className="portal-sidebar__list">
              {section.items.map((item) => {
                const active = isPortalNavActive(pathname, item);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.label}
                      data-portal-accent={item.accent}
                      className={
                        active
                          ? "portal-sidebar__link portal-sidebar__link--active"
                          : "portal-sidebar__link"
                      }
                    >
                      <PortalIcon name={item.icon} className="size-5" />
                      {!collapsed ? (
                        <span className="portal-sidebar__link-label">
                          {item.label}
                        </span>
                      ) : (
                        <span className="sr-only">{item.label}</span>
                      )}
                      {!collapsed && item.statusLabel ? (
                        <span className="portal-sidebar__link-status">
                          {item.statusLabel}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
