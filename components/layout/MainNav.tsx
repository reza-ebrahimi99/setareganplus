import type { ReactNode } from "react";
import Link from "next/link";
import { publicNavLinks } from "@/content/public-nav";

type MainNavProps = {
  activePath?: string;
  mobileExtra?: ReactNode;
};

function getLinkClassName(href: string, activePath?: string) {
  const baseClassName =
    "rounded-lg px-1.5 py-2 text-[0.8rem] font-medium leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary xl:px-2.5 xl:text-sm";
  const isActive =
    href === "/"
      ? activePath === "/"
      : Boolean(activePath?.startsWith(href));

  if (isActive) {
    return `${baseClassName} bg-primary/5 font-semibold text-primary`;
  }

  return `${baseClassName} text-foreground hover:bg-background hover:text-primary`;
}

/**
 * Desktop + mobile share `publicNavLinks` — no separate whitelist / slice.
 * Do not filter out `/about`; every entry must render as an `<a href="…">`.
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
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                className={getLinkClassName(link.href, activePath)}
                aria-current={
                  (link.href === "/"
                    ? activePath === "/"
                    : Boolean(activePath?.startsWith(link.href)))
                    ? "page"
                    : undefined
                }
              >
                {link.label}
              </Link>
            </li>
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
          className="absolute end-0 top-full z-20 mt-2 min-w-56 rounded-xl border border-border bg-surface p-2 shadow-lg"
          aria-label="ناوبری موبایل"
        >
          <ul className="flex list-none flex-col gap-1">
            {publicNavLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={getLinkClassName(link.href, activePath)}
                  aria-current={
                    (link.href === "/"
                      ? activePath === "/"
                      : Boolean(activePath?.startsWith(link.href)))
                      ? "page"
                      : undefined
                  }
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
