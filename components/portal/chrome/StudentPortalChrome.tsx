"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { PortalMobileDock } from "@/components/portal/chrome/PortalMobileDock";
import { PortalSidebar } from "@/components/portal/chrome/PortalSidebar";
import { PortalTopBar } from "@/components/portal/chrome/PortalTopBar";
import {
  getStudentPortalDockItems,
  type PortalOsNavSection,
} from "@/components/portal/nav/types";

const SIDEBAR_COLLAPSED_KEY = "staros.portal.sidebar.collapsed";

type StudentPortalChromeProps = {
  children: React.ReactNode;
  sections: readonly PortalOsNavSection[];
  userDisplayName: string;
  organizationName: string;
  showAccountSwitcher?: boolean;
};

/**
 * Student Portal OS chrome (sidebar + top bar + mobile dock).
 * Navigation is entirely data-driven from `sections`.
 */
export function StudentPortalChrome({
  children,
  sections,
  userDisplayName,
  organizationName,
  showAccountSwitcher = false,
}: StudentPortalChromeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const dockItems = getStudentPortalDockItems(sections);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (raw === "true") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div
      className={[
        "portal-os-shell",
        collapsed ? "portal-os-shell--sidebar-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PortalSidebar
        sections={sections}
        organizationName={organizationName}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className="portal-os-frame">
        <PortalTopBar
          userDisplayName={userDisplayName}
          organizationName={organizationName}
          showAccountSwitcher={showAccountSwitcher}
          onToggleSidebar={toggleCollapsed}
        />
        <main className="portal-os-main">
          <Container className="portal-os-main__container">{children}</Container>
        </main>
      </div>

      <PortalMobileDock items={dockItems} />
    </div>
  );
}
