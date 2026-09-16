"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  publicNavItems,
  type PublicNavItem,
} from "@/content/public-nav";

type MainNavProps = {
  activePath?: string;
  /** Light-on-dark links when header overlays the hero */
  overHero?: boolean;
  /** Optional filtered nav (e.g. feature-flagged modules). Defaults to full public nav. */
  items?: readonly PublicNavItem[];
};

type MobileMenuProps = {
  activePath?: string;
  mobileExtra?: ReactNode;
  /** Light-on-dark trigger when header overlays the hero */
  overHero?: boolean;
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
          className={`flex items-center rounded-xl px-3 py-3 text-base font-semibold transition-colors ${
            active
              ? "bg-primary/5 text-primary"
              : "text-foreground hover:bg-background"
          }`}
          aria-current={activePath === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <details className="group overflow-hidden rounded-xl border border-border/70">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-base font-semibold text-foreground transition-colors hover:bg-background [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 break-words">{item.label}</span>
          <span
            aria-hidden="true"
            className="text-xs text-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <ul className="space-y-0.5 border-t border-border/60 bg-background/40 p-2">
          {children.map((child) => (
            <li key={`${child.href}-${child.label}`}>
              <Link
                href={child.href}
                className={childLinkClass(isActivePath(child.href, activePath))}
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
      </details>
    </li>
  );
}

/** Desktop-only horizontal navigation (hidden below lg). */
export function MainNav({
  activePath,
  overHero = false,
  items = publicNavItems,
}: MainNavProps) {
  const desktopItems = items.filter((item) => item.href !== "/");

  return (
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
  );
}

/**
 * Mobile menu trigger + full-screen overlay (hidden at lg+).
 *
 * The panel is a real fixed, full-viewport overlay (inset-0 / 100dvh / 100vw)
 * with an opaque background above every page element, an internal scroll
 * region, body-scroll lock while open, and tap-to-toggle nested sections.
 * It intentionally does NOT rely on absolute positioning inside the header.
 */
export function MobileMenu({
  activePath,
  mobileExtra,
  overHero = false,
  items = publicNavItems,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close automatically whenever the route actually changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock the page behind the overlay and support Escape-to-close.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="باز کردن منو"
        onClick={() => setOpen(true)}
        className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
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
      </button>

      {mounted && open
        ? createPortal(
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="ناوبری موبایل"
          className="fixed inset-0 z-[120] flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-surface lg:hidden"
          onClick={(event) => {
            // Any navigation link tap closes the menu (nested <summary> toggles do not).
            if ((event.target as HTMLElement).closest("a")) {
              setOpen(false);
            }
          }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <span className="text-base font-bold text-primary">منو</span>
            <button
              type="button"
              aria-label="بستن منو"
              onClick={() => setOpen(false)}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ✕
              </span>
            </button>
          </div>

          <nav
            className="flex-1 px-4 py-4"
            aria-label="فهرست ناوبری"
          >
            <ul className="flex flex-col gap-1.5">
              {items.map((item) => (
                <MobileNavGroup
                  key={item.label}
                  item={item}
                  activePath={activePath}
                />
              ))}
            </ul>
            {mobileExtra ? (
              <div className="mt-5 border-t border-border pt-5">
                {mobileExtra}
              </div>
            ) : null}
          </nav>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
