import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/content/site";
import { MainNav } from "./MainNav";

type SiteHeaderProps = {
  activePath?: string;
};

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="border-b border-border bg-surface shadow-sm">
      <Container className="flex items-center justify-between gap-4 py-4">
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
        <MainNav activePath={activePath} />
      </Container>
    </header>
  );
}
