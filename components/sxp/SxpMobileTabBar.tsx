"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import type { PortalNavItem } from "@/components/portal/PortalNav";

type TabItem = {
  href: string;
  label: string;
};

type SxpMobileTabBarProps = {
  homeHref: string;
  timelineHref: string;
  cardHref: string;
  filesHref?: string;
  moreItems: PortalNavItem[];
};

function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabIcon({ name }: { name: "home" | "timeline" | "files" | "card" | "more" }) {
  const className = "size-5";
  if (name === "home") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 11 12 4l8 7v8H4v-8Z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "timeline") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 5v14M5 8h10M5 12h14M5 16h8" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "files") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4h7l4 4v12H7V4Z" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "card") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function SxpMobileTabBar({
  homeHref,
  timelineHref,
  cardHref,
  filesHref,
  moreItems,
}: SxpMobileTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTitleId = useId();

  const tabs: Array<TabItem & { icon: "home" | "timeline" | "files" | "card"; exact?: boolean }> = [
    { href: homeHref, label: "تجربه", icon: "home" },
    { href: timelineHref, label: "روند", icon: "timeline" },
    ...(filesHref
      ? [{ href: filesHref, label: "فایل‌ها", icon: "files" as const }]
      : []),
    { href: cardHref, label: "کارت", icon: "card" },
  ];

  return (
    <>
      <nav
        aria-label="ناوبری تجربه"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-sm sm:hidden"
      >
        <ul
          className={`mx-auto grid max-w-lg px-2 ${
            filesHref ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium ${
                    active ? "text-primary" : "text-muted"
                  }`}
                >
                  <TabIcon name={tab.icon} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-11 w-full touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] font-medium text-muted"
            >
              <TabIcon name="more" />
              بیشتر
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="بستن"
            className="absolute inset-0 bg-primary/40"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={moreTitleId}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <h2 id={moreTitleId} className="text-base font-semibold text-primary">
              بیشتر
            </h2>
            <ul className="mt-4 space-y-2">
              {moreItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-11 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="mt-4 min-h-11 w-full rounded-xl border border-border bg-background text-sm font-medium text-muted"
            >
              بستن
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
