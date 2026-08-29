"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PortalMobileDock } from "@/components/portal/chrome/PortalMobileDock";
import { PortalSidebar } from "@/components/portal/chrome/PortalSidebar";
import { PortalTopBar } from "@/components/portal/chrome/PortalTopBar";
import {
  getStudentPortalDockItems,
  type PortalOsNavSection,
} from "@/components/portal/nav/types";
import { GUIDANCE_PLATFORM_BRAND } from "@/lib/guidance/portal-nav";

const SIDEBAR_COLLAPSED_KEY = "staros.portal.sidebar.collapsed";
const GUIDANCE_PATH_PREFIX = "/portal/student/services/guidance";

type StudentPortalChromeProps = {
  children: React.ReactNode;
  sections: readonly PortalOsNavSection[];
  /** When set, replaces student nav under the Guidance path. */
  guidanceSections?: readonly PortalOsNavSection[] | null;
  userDisplayName: string;
  organizationName: string;
  showAccountSwitcher?: boolean;
};

/**
 * Student Portal OS chrome (sidebar + top bar + mobile dock).
 * Path-aware: under Guidance routes, swaps to Guidance Platform nav/branding.
 */
export function StudentPortalChrome({
  children,
  sections,
  guidanceSections = null,
  userDisplayName,
  organizationName,
  showAccountSwitcher = false,
}: StudentPortalChromeProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const inGuidancePlatform =
    Boolean(guidanceSections?.length) &&
    pathname.startsWith(GUIDANCE_PATH_PREFIX);

  const activeSections = inGuidancePlatform
    ? (guidanceSections as readonly PortalOsNavSection[])
    : sections;
  const dockItems = getStudentPortalDockItems(activeSections).slice(0, 5);

  useEffect(() => {
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (raw === "true") setCollapsed(true);
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
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
        inGuidancePlatform ? "portal-os-shell--guidance-platform" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-portal-product={inGuidancePlatform ? "guidance" : "student"}
    >
      <Suspense fallback={null}>
        <PortalSidebar
          sections={activeSections}
          organizationName={organizationName}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          brandEyebrow={
            inGuidancePlatform
              ? GUIDANCE_PLATFORM_BRAND.eyebrow
              : "پرتال دانش‌آموز"
          }
          ariaLabel={
            inGuidancePlatform
              ? GUIDANCE_PLATFORM_BRAND.ariaLabel
              : "ناوبری پرتال دانش‌آموز"
          }
          goalEyebrow={
            inGuidancePlatform
              ? GUIDANCE_PLATFORM_BRAND.goalEyebrow
              : "ماموریت امروز"
          }
          goalTitle={
            inGuidancePlatform
              ? GUIDANCE_PLATFORM_BRAND.goalTitle
              : "یک قدم کوچک، یک پیشرفت بزرگ"
          }
          exitHref={
            inGuidancePlatform ? GUIDANCE_PLATFORM_BRAND.exitHref : undefined
          }
          exitLabel={
            inGuidancePlatform ? GUIDANCE_PLATFORM_BRAND.exitLabel : undefined
          }
        />
      </Suspense>

      <div className="portal-os-frame">
        <PortalTopBar
          userDisplayName={userDisplayName}
          organizationName={organizationName}
          showAccountSwitcher={showAccountSwitcher}
          onToggleSidebar={toggleCollapsed}
          productTitle={
            inGuidancePlatform
              ? GUIDANCE_PLATFORM_BRAND.productTitle
              : undefined
          }
        />
        <main className="portal-os-main">
          <Container className="portal-os-main__container">{children}</Container>
        </main>
      </div>

      <Suspense fallback={null}>
        <PortalMobileDock
          items={dockItems}
          ariaLabel={
            inGuidancePlatform
              ? GUIDANCE_PLATFORM_BRAND.dockAriaLabel
              : "میانبرهای پرتال"
          }
        />
      </Suspense>
    </div>
  );
}
