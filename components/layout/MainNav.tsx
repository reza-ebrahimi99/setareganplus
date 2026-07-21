import type { ReactNode } from "react";
import Link from "next/link";
import { publicNavLinks as navLinks } from "@/content/public-nav";

type MainNavProps = {
  activePath?: string;
  mobileExtra?: ReactNode;
};

function getLinkClassName(href: string, activePath?: string) {
  const baseClassName =
    "rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary xl:px-3";
  const isActive = activePath === href;

  if (isActive) {
    return `${baseClassName} bg-primary/5 font-semibold text-primary`;
  }

  return `${baseClassName} text-foreground hover:bg-background hover:text-primary`;
}

export function MainNav({ activePath, mobileExtra }: MainNavProps) {
  const desktopLinks = navLinks.filter((link) => link.href !== "/");

  return (
    <>
      <nav
        className="hidden items-center gap-0.5 lg:flex xl:gap-1"
        aria-label="ناوبری اصلی"
      >
        <ul className="flex flex-nowrap items-center justify-end gap-0.5 xl:gap-1">
          {desktopLinks.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                className={getLinkClassName(link.href, activePath)}
                aria-current={activePath === link.href ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
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
          className="absolute end-0 top-full z-20 mt-2 min-w-56 rounded-xl border border-border bg-surface p-2 shadow-lg"
          aria-label="ناوبری موبایل"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={getLinkClassName(link.href, activePath)}
                  aria-current={activePath === link.href ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
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
