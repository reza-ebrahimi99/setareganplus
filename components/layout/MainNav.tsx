import Link from "next/link";
import { navLinks } from "@/content/site";

type MainNavProps = {
  activePath?: string;
};

function getLinkClassName(href: string, activePath?: string) {
  const baseClassName =
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  const isActive = activePath === href;

  if (isActive) {
    return `${baseClassName} bg-background font-semibold text-primary`;
  }

  return `${baseClassName} text-foreground hover:bg-background hover:text-primary`;
}

export function MainNav({ activePath }: MainNavProps) {
  return (
    <>
      <nav
        className="hidden items-center gap-1 lg:flex"
        aria-label="ناوبری اصلی"
      >
        <ul className="flex flex-wrap items-center justify-end gap-1">
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
      </nav>

      <details className="relative lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
          </span>
          <span>منو</span>
        </summary>
        <nav
          className="absolute start-0 top-full z-20 mt-2 min-w-48 rounded-lg border border-border bg-surface p-2 shadow-sm"
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
        </nav>
      </details>
    </>
  );
}
