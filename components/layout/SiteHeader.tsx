import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/content/site";
import { MainNav } from "./MainNav";

type SiteHeaderProps = {
  activePath?: string;
};

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-sm backdrop-blur-sm">
      <Container className="flex items-center justify-between gap-4 py-3 sm:py-4">
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
        <div className="flex items-center gap-2 sm:gap-3">
          <MainNav activePath={activePath} />
          <Button
            href="/pre-registration"
            variant="secondary"
            className="hidden sm:inline-flex"
          >
            پیش‌ثبت‌نام
          </Button>
        </div>
      </Container>
    </header>
  );
}
