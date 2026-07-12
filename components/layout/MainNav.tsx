import Link from "next/link";
import { navLinks } from "@/content/site";

export function MainNav() {
  return (
    <>
      <nav
        className="hidden items-center gap-1 md:flex"
        aria-label="ناوبری اصلی"
      >
        <ul className="flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <details className="relative md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="flex flex-col gap-1">
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
            <span className="block h-0.5 w-4 rounded bg-primary" />
          </span>
          <span>منو</span>
        </summary>
        <nav
          className="absolute left-0 top-full z-20 mt-2 min-w-44 rounded-lg border border-border bg-surface p-2 shadow-sm"
          aria-label="ناوبری موبایل"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
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
