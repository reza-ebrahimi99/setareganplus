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
  /** Mobile/tablet off-canvas open state (ignored on desktop layout). */
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
  /** Called when a nav/exit link is activated (closes drawer on mobile). */
  onNavigate?: () => void;
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
 * Portal sidebar — sticky rail on desktop; slide-in drawer below 1024px.
 */
export function PortalSidebar({
  sections,
  organizationName,
  collapsed = false,
  mobileOpen = false,
  onToggleCollapsed,
  onCloseMobile,
  onNavigate,
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
  /** Drawer always shows full labels; desktop rail may collapse. */
  const showLabels = !collapsed || mobileOpen;
  const railCollapsed = collapsed && !mobileOpen;

  return (
    <aside
      id="portal-sidebar-nav"
      className={[
        "portal-sidebar",
        railCollapsed ? "portal-sidebar--collapsed" : "",
        mobileOpen ? "portal-sidebar--drawer-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
      data-collapsed={railCollapsed ? "true" : "false"}
      data-drawer={mobileOpen ? "open" : "closed"}
    >
      <div className="portal-sidebar__brand">
        <p className="portal-sidebar__eyebrow">{brandEyebrow}</p>
        {showLabels ? (
          <p className="portal-sidebar__org" title={organizationName}>
            {organizationName}
          </p>
        ) : null}
        {onToggleCollapsed ? (
          <button
            type="button"
            className="portal-sidebar__collapse portal-sidebar__collapse--desktop"
            onClick={onToggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
          >
            <PortalIcon name="panel" className="size-4" />
          </button>
        ) : null}
        {onCloseMobile ? (
          <button
            type="button"
            className="portal-sidebar__close portal-sidebar__close--mobile"
            onClick={onCloseMobile}
            aria-label="بستن منو"
          >
            <span aria-hidden="true" className="portal-sidebar__close-glyph">
              ×
            </span>
            <span>بستن</span>
          </button>
        ) : null}
      </div>

      <nav className="portal-sidebar__nav">
        {sections.map((section) => (
          <div key={section.id} className="portal-sidebar__section">
            {section.label && showLabels ? (
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
                      onClick={onNavigate}
                      className={
                        active
                          ? "portal-sidebar__link portal-sidebar__link--active"
                          : "portal-sidebar__link"
                      }
                    >
                      <PortalIcon name={item.icon} className="size-5" />
                      {showLabels ? (
                        <span className="portal-sidebar__link-label">
                          {item.label}
                        </span>
                      ) : (
                        <span className="sr-only">{item.label}</span>
                      )}
                      {showLabels && item.statusLabel ? (
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

      {showLabels ? (
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
            <Link
              href={exitHref}
              className="portal-sidebar__exit"
              onClick={onNavigate}
            >
              {exitLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
