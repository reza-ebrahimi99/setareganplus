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

const headerTagline = "سکوی آموزشی دیجیتال";
const ghalamchiLabel = "نمایندگی رسمی قلم‌چی";

function HeaderLogo({
  media,
  priority,
}: {
  media: (typeof heroMedia)["logo"] | (typeof heroMedia)["ghalamchiLogo"];
  priority?: boolean;
}) {
  if (!hasMediaUrl(media)) {
    return null;
  }

  return (
    <span className="brand-logo-frame brand-logo-frame--header">
      <MediaImage
        media={media}
        width={72}
        height={72}
        className="h-full w-full object-contain p-1"
        priority={priority}
      />
    </span>
  );
}

function GhalamchiAffiliation({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : "flex min-w-0 items-center gap-2.5"}>
      <HeaderLogo media={heroMedia.ghalamchiLogo} />
      <p
        className={
          compact
            ? "min-w-0 text-[0.7rem] font-medium leading-5 text-muted"
            : "hidden min-w-0 text-[0.7rem] font-medium leading-5 text-muted xl:block xl:max-w-[8.5rem] xl:text-xs"
        }
      >
        {ghalamchiLabel}
      </p>
    </div>
  );
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-sm backdrop-blur-sm">
      <Container className="flex min-w-0 items-center justify-between gap-2 py-2 sm:gap-3 sm:py-2.5 lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:gap-3 xl:gap-4">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-2.5"
          >
            <HeaderLogo media={heroMedia.logo} priority />
            <span className="flex min-w-0 flex-col justify-center">
              <span className="truncate text-base font-bold leading-tight text-primary transition-colors group-hover:text-primary/80 sm:text-lg">
                {siteConfig.name}
              </span>
              <span className="hidden truncate text-[0.7rem] leading-snug text-muted sm:block sm:text-xs xl:max-w-[11rem]">
                {headerTagline}
              </span>
            </span>
          </Link>

          <div
            aria-hidden="true"
            className="hidden h-9 w-px shrink-0 bg-border lg:block"
          />

          <div className="hidden shrink-0 lg:block">
            <GhalamchiAffiliation />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
