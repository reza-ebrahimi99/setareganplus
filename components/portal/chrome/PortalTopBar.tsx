"use client";

import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";
import { PortalNotificationBell } from "@/components/portal/chrome/PortalNotificationBell";

type PortalTopBarProps = {
  userDisplayName: string;
  organizationName: string;
  showAccountSwitcher?: boolean;
  onToggleSidebar?: () => void;
  /** Whether the mobile/tablet drawer is open (for aria). */
  mobileNavOpen?: boolean;
  /** Optional id of the overlay control for aria-controls. */
  sidebarControlsId?: string;
  /** Optional product line under StarOS (e.g. Guidance Platform). */
  productTitle?: string;
};

/**
 * Student OS top bar — identity, notification architecture, account actions.
 */
export function PortalTopBar({
  userDisplayName,
  organizationName,
  showAccountSwitcher = false,
  onToggleSidebar,
  mobileNavOpen = false,
  sidebarControlsId,
  productTitle,
}: PortalTopBarProps) {
  return (
    <header className="portal-topbar">
      <div className="portal-topbar__start">
        {onToggleSidebar ? (
          <button
            type="button"
            className="portal-topbar__icon-btn portal-topbar__sidebar-toggle"
            onClick={onToggleSidebar}
            aria-expanded={mobileNavOpen}
            aria-controls={sidebarControlsId}
            aria-label={mobileNavOpen ? "بستن منو" : "باز کردن منو"}
          >
            <PortalIcon name="panel" className="size-5" />
          </button>
        ) : null}
        <div className="min-w-0">
          <p className="portal-topbar__eyebrow">
            {productTitle ? productTitle : "ستارگان پلاس"}
          </p>
          <p className="portal-topbar__org truncate" title={organizationName}>
            {organizationName}
          </p>
        </div>
      </div>

      <div className="portal-topbar__end">
        <PortalNotificationBell />
        <span className="portal-topbar__user" title={userDisplayName}>
          <PortalIcon name="user" className="size-4" />
          <span className="truncate">{userDisplayName}</span>
        </span>
        {showAccountSwitcher ? (
          <Link href="/portal/select-account" className="portal-topbar__text-btn">
            تغییر حساب
          </Link>
        ) : null}
        <form action="/portal/logout" method="post">
          <button type="submit" className="portal-topbar__text-btn">
            <PortalIcon name="logout" className="size-4" />
            <span>خروج</span>
          </button>
        </form>
      </div>
    </header>
  );
}
