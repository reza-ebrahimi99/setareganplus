import Link from "next/link";
import { siteConfig } from "@/content/site";
import { MainNav } from "./MainNav";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 flex-col rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <span className="truncate text-lg font-bold text-primary transition-colors group-hover:text-primary/80 sm:text-xl">
            {siteConfig.name}
          </span>
          <span className="truncate text-xs text-muted sm:text-sm">
            {siteConfig.tagline}
          </span>
        </Link>
        <MainNav />
      </div>
    </header>
  );
}
