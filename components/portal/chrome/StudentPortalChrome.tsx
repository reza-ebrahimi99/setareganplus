"use client";

import { Suspense, useCallback, useEffect, useId, useState } from "react";
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
const DESKTOP_MQ = "(min-width: 1024px)";

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
 * Desktop (≥1024): sticky collapsible sidebar. Below: off-canvas drawer.
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
  const sidebarNavId = "portal-sidebar-nav";
  const overlayId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const inGuidancePlatform =
    Boolean(guidanceSections?.length) &&
    pathname.startsWith(GUIDANCE_PATH_PREFIX);

  const activeSections = inGuidancePlatform
    ? (guidanceSections as readonly PortalOsNavSection[])
    : sections;
  const dockItems = getStudentPortalDockItems(activeSections).slice(0, 5);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

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

  // Close drawer on route changes; nav link onClick covers ?view= swaps.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Body scroll lock + Escape while drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  // If viewport grows to desktop, dismiss drawer state.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    function onChange() {
      if (mq.matches) setMobileNavOpen(false);
    }
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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

  function handleToggleSidebar() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia(DESKTOP_MQ).matches
    ) {
      toggleCollapsed();
      return;
    }
    setMobileNavOpen((open) => !open);
  }

  return (
    <div
      className={[
        "portal-os-shell",
        collapsed ? "portal-os-shell--sidebar-collapsed" : "",
        mobileNavOpen ? "portal-os-shell--nav-open" : "",
        inGuidancePlatform ? "portal-os-shell--guidance-platform" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-portal-product={inGuidancePlatform ? "guidance" : "student"}
      data-mobile-nav={mobileNavOpen ? "open" : "closed"}
    >
      <button
        type="button"
        id={overlayId}
        className={[
          "portal-sidebar-overlay",
          mobileNavOpen ? "portal-sidebar-overlay--open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="بستن منو"
        tabIndex={mobileNavOpen ? 0 : -1}
        aria-hidden={!mobileNavOpen}
        onClick={closeMobileNav}
      />

      <Suspense fallback={null}>
        <PortalSidebar
          sections={activeSections}
          organizationName={organizationName}
          collapsed={collapsed}
          mobileOpen={mobileNavOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={closeMobileNav}
          onNavigate={closeMobileNav}
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
          onToggleSidebar={handleToggleSidebar}
          mobileNavOpen={mobileNavOpen}
          sidebarControlsId={sidebarNavId}
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
