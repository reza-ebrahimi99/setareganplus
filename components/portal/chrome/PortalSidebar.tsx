"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  /** Product eyebrow — defaults to Student Portal. */
  brandEyebrow?: string;
  /** Accessible name for the aside. */
  ariaLabel?: string;
  /** Bottom goal widget eyebrow. */
  goalEyebrow?: string;
  /** Bottom goal widget title. */
  goalTitle?: string;
  /** Optional exit link under the goal widget. */
  exitHref?: string;
  exitLabel?: string;
};

/**
 * Desktop RTL sidebar — renders solely from nav config arrays.
 */
export function PortalSidebar({
  sections,
  organizationName,
  collapsed = false,
  onToggleCollapsed,
  brandEyebrow = "پرتال دانش‌آموز",
  ariaLabel = "ناوبری پرتال دانش‌آموز",
  goalEyebrow = "ماموریت امروز",
  goalTitle = "یک قدم کوچک، یک پیشرفت بزرگ",
  exitHref,
  exitLabel,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  return (
    <aside
      className={[
        "portal-sidebar",
        collapsed ? "portal-sidebar--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className="portal-sidebar__brand">
        <p className="portal-sidebar__eyebrow">{brandEyebrow}</p>
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
                const active = isPortalNavActive(pathname, item, search);
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

      {!collapsed ? (
        <div className="portal-sidebar__goal">
          <p className="portal-sidebar__goal-eyebrow">{goalEyebrow}</p>
          <p className="portal-sidebar__goal-title">{goalTitle}</p>
          <div
            className="portal-sidebar__goal-bar"
            role="presentation"
            aria-hidden="true"
          >
            <span />
          </div>
          {exitHref && exitLabel ? (
            <Link href={exitHref} className="portal-sidebar__exit">
              {exitLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
