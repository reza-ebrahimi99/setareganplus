"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  isPublicNavChildActive,
  isPublicNavPathActive,
  publicNavLinks,
  type PublicNavLink,
} from "@/content/public-nav";

type MainNavProps = {
  activePath?: string;
  mobileExtra?: ReactNode;
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function topLinkClassName(active: boolean) {
  const baseClassName =
    "inline-flex items-center gap-1 rounded-lg px-1.5 py-2 text-[0.8rem] font-medium leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary xl:px-2.5 xl:text-sm";

  if (active) {
    return `${baseClassName} bg-primary/5 font-semibold text-primary`;
  }

  return `${baseClassName} text-foreground hover:bg-background hover:text-primary`;
}

function childLinkClassName(active: boolean) {
  const baseClassName =
    "block rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

  if (active) {
    return `${baseClassName} bg-primary/5 font-semibold text-primary`;
  }

  return `${baseClassName} text-foreground hover:bg-background hover:text-primary`;
}

function DesktopNavItem({
  link,
  activePath,
}: {
  link: PublicNavLink;
  activePath?: string;
}) {
  const parentActive = isPublicNavPathActive(link, activePath);
  const children = link.children;

  if (!children || children.length === 0) {
    return (
      <li className="shrink-0">
        <Link
          href={link.href}
          className={topLinkClassName(parentActive)}
          aria-current={parentActive ? "page" : undefined}
        >
          {link.label}
        </Link>
      </li>
    );
  }

  return (
    <li className="group/nav relative shrink-0">
      <Link
        href={link.href}
        className={topLinkClassName(parentActive)}
        aria-haspopup="menu"
        aria-current={parentActive ? "page" : undefined}
      >
        <span>{link.label}</span>
        <ChevronDownIcon className="size-3.5 opacity-70 transition-transform duration-200 group-hover/nav:rotate-180 group-focus-within/nav:rotate-180" />
      </Link>

      <ul
        role="menu"
        aria-label={link.label}
        className="invisible absolute top-full end-0 z-50 mt-1 min-w-[14.5rem] translate-y-1 list-none rounded-xl border border-border bg-surface p-1.5 opacity-0 shadow-[0_12px_40px_rgb(15_23_42_/_0.12)] transition-[opacity,transform,visibility] duration-150 group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100"
      >
        {children.map((child) => {
          const childActive = isPublicNavChildActive(child.href, activePath);
          return (
            <li key={`${child.href}:${child.label}`} role="none">
              <Link
                href={child.href}
                role="menuitem"
                className={childLinkClassName(childActive)}
                aria-current={childActive ? "page" : undefined}
              >
                {child.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function MobileNavItem({
  link,
  activePath,
}: {
  link: PublicNavLink;
  activePath?: string;
}) {
  const panelId = useId();
  const parentActive = isPublicNavPathActive(link, activePath);
  const children = link.children;
  const [open, setOpen] = useState(parentActive);

  if (!children || children.length === 0) {
    return (
      <li>
        <Link
          href={link.href}
          className={topLinkClassName(parentActive)}
          aria-current={parentActive ? "page" : undefined}
        >
          {link.label}
        </Link>
      </li>
    );
  }

  return (
    <li className="rounded-lg">
      <div className="flex items-center gap-1">
        <Link
          href={link.href}
          className={`min-w-0 flex-1 ${topLinkClassName(parentActive)}`}
          aria-current={parentActive ? "page" : undefined}
        >
          {link.label}
        </Link>
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${open ? "بستن" : "باز کردن"} زیرمنوی ${link.label}`}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDownIcon
            className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open ? (
        <ul
          id={panelId}
          className="mt-1 space-y-0.5 border-s border-border/80 py-1 ps-3"
        >
          {children.map((child) => {
            const childActive = isPublicNavChildActive(child.href, activePath);
            return (
              <li key={`${child.href}:${child.label}`}>
                <Link
                  href={child.href}
                  className={childLinkClassName(childActive)}
                  aria-current={childActive ? "page" : undefined}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Desktop + mobile share `publicNavLinks`.
 * Items with `children` render as dropdown (desktop) / accordion (mobile).
 */
export function MainNav({ activePath, mobileExtra }: MainNavProps) {
  return (
    <>
      <nav
        className="main-nav-desktop hidden min-w-0 max-w-full flex-1 items-center justify-end lg:flex"
        aria-label="ناوبری اصلی"
      >
        <ul className="flex max-w-full list-none flex-wrap items-center justify-end gap-x-0.5 gap-y-1 xl:gap-x-1">
          {publicNavLinks.map((link) => (
            <DesktopNavItem
              key={link.href}
              link={link}
              activePath={activePath}
            />
          ))}
        </ul>
      </nav>

      <details className="relative shrink-0 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
          </span>
          <span>منو</span>
        </summary>
        <nav
          className="absolute end-0 top-full z-50 mt-2 min-w-56 rounded-xl border border-border bg-surface p-2 shadow-lg"
          aria-label="ناوبری موبایل"
        >
          <ul className="flex list-none flex-col gap-1">
            {publicNavLinks.map((link) => (
              <MobileNavItem
                key={link.href}
                link={link}
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
