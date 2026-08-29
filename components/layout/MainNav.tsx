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
  /** Light-on-dark links when header overlays the hero */
  overHero?: boolean;
  /** Optional filtered nav (e.g. feature-flagged modules). Defaults to full public nav. */
  items?: readonly PublicNavItem[];
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

function topLinkClass(active: boolean, overHero: boolean) {
  const base =
    "inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary xl:px-2.5";
  if (overHero) {
    if (active) {
      return `${base} bg-white/10 font-semibold text-white`;
    }
    return `${base} text-white/85 hover:bg-white/10 hover:text-white`;
  }
  if (active) {
    return `${base} bg-primary/5 font-semibold text-primary`;
  }
  return `${base} text-foreground hover:bg-background hover:text-primary`;
}

function childLinkClass(active: boolean) {
  const base =
    "block rounded-xl px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  if (active) {
    return `${base} bg-primary/5`;
  }
  return `${base} hover:bg-background`;
}

function DesktopMegaItem({
  item,
  activePath,
  overHero,
}: {
  item: PublicNavItem;
  activePath?: string;
  overHero: boolean;
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
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => {
    return () => clearClose();
  }, []);

  if (children.length === 0) {
    return (
      <li className="shrink-0">
        <Link
          href={item.href}
          className={topLinkClass(active, overHero)}
          aria-current={activePath === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  const wide = children.length >= 4;

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
        className={topLinkClass(active, overHero)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
        <span
          aria-hidden="true"
          className={`text-[0.65rem] ${overHero ? "text-white/55" : "text-muted"}`}
        >
          ▾
        </span>
      </button>
      <div
        id={panelId}
        role="menu"
        hidden={!open}
        className={`site-mega-panel absolute start-0 top-full z-40 mt-2 ${
          wide ? "w-[min(36rem,70vw)]" : "w-[min(22rem,70vw)]"
        }`}
      >
        {item.description ? (
          <p className="mb-3 border-b border-border/70 pb-3 text-xs leading-6 text-muted">
            {item.description}
          </p>
        ) : null}
        <ul
          className={`grid gap-1 ${wide ? "sm:grid-cols-2" : "grid-cols-1"}`}
        >
          {children.map((child) => (
            <li key={`${child.href}-${child.label}`} role="none">
              <Link
                role="menuitem"
                href={child.href}
                className={childLinkClass(isActivePath(child.href, activePath))}
                onClick={() => setOpen(false)}
              >
                <span className="block text-sm font-semibold text-primary">
                  {child.label}
                </span>
                {child.description ? (
                  <span className="mt-0.5 block text-xs leading-5 text-muted">
                    {child.description}
                  </span>
                ) : null}
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
          className={topLinkClass(active, false)}
          aria-current={activePath === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <details className="group rounded-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <span>{item.label}</span>
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
                <span className="block text-sm font-medium text-primary">
                  {child.label}
                </span>
                {child.description ? (
                  <span className="mt-0.5 block text-xs text-muted">
                    {child.description}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function MainNav({
  activePath,
  mobileExtra,
  overHero = false,
  items = publicNavItems,
}: MainNavProps) {
  const desktopItems = items.filter((item) => item.href !== "/");

  return (
    <>
      <nav
        className="hidden items-center gap-0.5 lg:flex xl:gap-0.5"
        aria-label="ناوبری اصلی"
      >
        <ul className="flex flex-nowrap items-center justify-end gap-0.5">
          {desktopItems.map((item) => (
            <DesktopMegaItem
              key={item.label}
              item={item}
              activePath={activePath}
              overHero={overHero}
            />
          ))}
        </ul>
      </nav>

      <details className="relative lg:hidden">
        <summary
          className={`flex cursor-pointer list-none items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden ${
            overHero
              ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
              : "border-border bg-surface text-foreground hover:bg-background"
          }`}
        >
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span
              className={`block h-0.5 w-4 rounded ${overHero ? "bg-white" : "bg-primary"}`}
            />
            <span
              className={`block h-0.5 w-4 rounded ${overHero ? "bg-white" : "bg-primary"}`}
            />
            <span
              className={`block h-0.5 w-4 rounded ${overHero ? "bg-white" : "bg-primary"}`}
            />
          </span>
          <span>منو</span>
        </summary>
        <nav
          className="absolute end-0 top-full z-40 mt-2 max-h-[70vh] min-w-72 overflow-y-auto rounded-2xl border border-border bg-surface/95 p-2 shadow-lg backdrop-blur-xl"
          aria-label="ناوبری موبایل"
        >
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
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
