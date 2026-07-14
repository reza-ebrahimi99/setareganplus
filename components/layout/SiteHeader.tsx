import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { heroMedia } from "@/content/home";
import { siteConfig } from "@/content/site";
import { hasMediaUrl } from "@/lib/media";
import { MainNav } from "./MainNav";

type SiteHeaderProps = {
  activePath?: string;
};

function GhalamchiAffiliation({ compact = false }: { compact?: boolean }) {
  if (!hasMediaUrl(heroMedia.ghalamchiLogo)) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2"
          : "flex max-w-[13.5rem] items-center gap-2.5"
      }
    >
      <span
        className={
          compact
            ? "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm"
            : "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm sm:h-11 sm:w-11"
        }
      >
        <MediaImage
          media={heroMedia.ghalamchiLogo}
          width={72}
          height={72}
          className="h-full w-full object-contain p-1"
        />
      </span>
      <p
        className={
          compact
            ? "min-w-0 text-[0.7rem] font-medium leading-5 text-muted"
            : "min-w-0 text-[0.68rem] font-medium leading-5 text-muted sm:text-xs sm:leading-5"
        }
      >
        نمایندگی رسمی قلم‌چی نسیم‌شهر
      </p>
    </div>
  );
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-sm backdrop-blur-sm">
      <Container className="flex items-center justify-between gap-3 py-2 sm:gap-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-3"
          >
            {hasMediaUrl(heroMedia.logo) ? (
              <span className="flex h-[2.875rem] w-[2.375rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm sm:h-[3.4rem] sm:w-[2.8rem]">
                <MediaImage
                  media={heroMedia.logo}
                  width={90}
                  height={110}
                  className="h-full w-full object-contain p-0.5 sm:p-1"
                  priority
                />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col justify-center">
              <span className="truncate text-base font-bold leading-tight text-primary transition-colors group-hover:text-primary/80 sm:text-lg">
                {siteConfig.name}
              </span>
              <span className="truncate text-[0.7rem] leading-snug text-muted sm:text-xs">
                {siteConfig.tagline}
              </span>
            </span>
          </Link>

          <div
            aria-hidden="true"
            className="hidden h-10 w-px shrink-0 bg-border lg:block"
          />

          <div className="hidden lg:block">
            <GhalamchiAffiliation />
          </div>
        </div>

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

      <div className="border-t border-border/70 bg-surface/90 lg:hidden">
        <Container className="py-2">
          <GhalamchiAffiliation compact />
        </Container>
      </div>
    </header>
  );
}
