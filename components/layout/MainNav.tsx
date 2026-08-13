"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  publicNavItems,
  type PublicNavItem,
} from "@/content/public-nav";

type MainNavProps = {
  activePath?: string;
  mobileExtra?: ReactNode;
};

function isActivePath(href: string, activePath?: string) {
  if (!activePath) return false;
  const base = href.split("#")[0] || href;
  if (base === "/") return activePath === "/";
  return activePath === base || activePath.startsWith(`${base}/`);
}

function itemIsActive(item: PublicNavItem, activePath?: string) {
  if (isActivePath(item.href, activePath)) return true;
  return Boolean(
    item.children?.some((child) => isActivePath(child.href, activePath)),
  );
}

function topLinkClass(active: boolean) {
  const base =
    "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary xl:px-2.5";
  if (active) {
    return `${base} bg-primary/5 font-semibold text-primary`;
  }
  return `${base} text-foreground hover:bg-background hover:text-primary`;
}

function childLinkClass(active: boolean) {
  const base =
    "block rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  if (active) {
    return `${base} bg-primary/5 font-semibold text-primary`;
  }
  return `${base} text-foreground/90 hover:bg-background hover:text-primary`;
}

function DesktopDropdown({
  item,
  activePath,
}: {
  item: PublicNavItem;
  activePath?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const panelId = useId();
  const active = itemIsActive(item, activePath);
  const children = item.children ?? [];

  function clearClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    return () => clearClose();
  }, []);

  if (children.length === 0) {
    return (
      <li className="shrink-0">
        <Link
          href={item.href}
          className={topLinkClass(active)}
          aria-current={activePath === item.href ? "page" : undefined}
        >
          {item.icon ? (
            <span aria-hidden="true" className="text-[0.85rem]">
              {item.icon}
            </span>
          ) : null}
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li
      className="relative shrink-0"
      onMouseEnter={() => {
        clearClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        clearClose();
        setOpen(true);
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) {
          return;
        }
        scheduleClose();
      }}
    >
      <button
        type="button"
        className={topLinkClass(active)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {item.icon ? (
          <span aria-hidden="true" className="text-[0.85rem]">
            {item.icon}
          </span>
        ) : null}
        {item.label}
        <span aria-hidden="true" className="text-[0.65rem] text-muted">
          ▾
        </span>
      </button>
      <div
        id={panelId}
        role="menu"
        hidden={!open}
        className="absolute start-0 top-full z-30 mt-1 min-w-[13.5rem] rounded-2xl border border-border/80 bg-surface/95 p-2 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl"
      >
        <ul className="flex flex-col gap-0.5">
          {children.map((child) => (
            <li key={`${child.href}-${child.label}`} role="none">
              <Link
                role="menuitem"
                href={child.href}
                className={childLinkClass(isActivePath(child.href, activePath))}
                onClick={() => setOpen(false)}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function MobileNavGroup({
  item,
  activePath,
}: {
  item: PublicNavItem;
  activePath?: string;
}) {
  const children = item.children ?? [];
  const active = itemIsActive(item, activePath);

  if (children.length === 0) {
    return (
      <li>
        <Link
          href={item.href}
          className={topLinkClass(active)}
          aria-current={activePath === item.href ? "page" : undefined}
        >
          {item.icon ? (
            <span aria-hidden="true" className="me-1 text-[0.85rem]">
              {item.icon}
            </span>
          ) : null}
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <details className="group rounded-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1">
            {item.icon ? (
              <span aria-hidden="true" className="text-[0.85rem]">
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </span>
          <span aria-hidden="true" className="text-xs text-muted">
            ▾
          </span>
        </summary>
        <ul className="mt-1 space-y-0.5 border-s border-border/70 ps-3">
          {children.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <Link
                href={child.href}
                className={childLinkClass(isActivePath(child.href, activePath))}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function MainNav({ activePath, mobileExtra }: MainNavProps) {
  const desktopItems = publicNavItems.filter((item) => item.href !== "/");

  return (
    <>
      <nav
        className="hidden items-center gap-0.5 lg:flex xl:gap-0.5"
        aria-label="ناوبری اصلی"
      >
        <ul className="flex flex-nowrap items-center justify-end gap-0.5">
          {desktopItems.map((item) => (
            <DesktopDropdown
              key={item.label}
              item={item}
              activePath={activePath}
            />
          ))}
        </ul>
      </nav>

      <details className="relative lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
          </span>
          <span>منو</span>
        </summary>
        <nav
          className="absolute end-0 top-full z-30 mt-2 max-h-[70vh] min-w-64 overflow-y-auto rounded-2xl border border-border bg-surface/95 p-2 shadow-lg backdrop-blur-xl"
          aria-label="ناوبری موبایل"
        >
          <ul className="flex flex-col gap-1">
            {publicNavItems.map((item) => (
              <MobileNavGroup
                key={item.label}
                item={item}
                activePath={activePath}
              />
            ))}
          </ul>
          {mobileExtra ? (
            <div className="mt-2 border-t border-border pt-3">{mobileExtra}</div>
          ) : null}
        </nav>
      </details>
    </>
  );
}
