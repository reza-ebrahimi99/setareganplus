import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { heroMedia } from "@/content/home";
import { headerCtas } from "@/content/public-nav";
import { siteConfig } from "@/content/site";
import { hasMediaUrl } from "@/lib/media";
import { MainNav } from "./MainNav";

type SiteHeaderProps = {
  activePath?: string;
};

const headerTagline = "سکوی آموزشی دیجیتال";

function HeaderLogo({
  media,
  priority,
  clear = false,
  size = "md",
}: {
  media: (typeof heroMedia)["logo"] | (typeof heroMedia)["ghalamchiLogo"];
  priority?: boolean;
  clear?: boolean;
  size?: "md" | "sm";
}) {
  if (!hasMediaUrl(media)) {
    return null;
  }

  const frame =
    size === "sm"
      ? "brand-logo-frame brand-logo-frame--header-sm"
      : "brand-logo-frame brand-logo-frame--header";

  return (
    <span
      className={`${frame}${clear ? " brand-logo-frame--clear" : ""}`}
    >
      <MediaImage
        media={media}
        width={size === "sm" ? 44 : 72}
        height={size === "sm" ? 44 : 72}
        className="h-full w-full object-contain p-1"
        priority={priority}
      />
    </span>
  );
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/95 shadow-sm backdrop-blur-md">
      <Container className="flex min-w-0 items-center justify-between gap-2 py-2 sm:gap-3 sm:py-2.5 lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-2.5"
          >
            <HeaderLogo media={heroMedia.logo} priority clear />
            <span className="flex min-w-0 flex-col justify-center">
              <span className="truncate text-base font-bold leading-tight text-primary transition-colors group-hover:text-primary/80 sm:text-lg">
                {siteConfig.name}
              </span>
              <span className="hidden truncate text-[0.7rem] leading-snug text-muted sm:block sm:text-xs xl:max-w-[12rem]">
                {headerTagline}
              </span>
            </span>
          </Link>

          {/* Ghalamchi stays secondary — never equal to primary brand */}
          <div
            className="hidden items-center gap-2 border-s border-border/80 ps-3 opacity-75 xl:flex"
            title="نمایندگی رسمی قلم‌چی"
          >
            <HeaderLogo media={heroMedia.ghalamchiLogo} size="sm" />
            <p className="max-w-[7.5rem] text-[0.65rem] font-medium leading-4 text-muted">
              نمایندگی رسمی قلم‌چی
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <MainNav
            activePath={activePath}
            mobileExtra={
              <div className="flex flex-col gap-2">
                <Button href={headerCtas.primary.href} variant="secondary">
                  {headerCtas.primary.label}
                </Button>
                <Button href={headerCtas.secondary.href} variant="outline">
                  {headerCtas.secondary.label}
                </Button>
              </div>
            }
          />
          <Button
            href={headerCtas.secondary.href}
            variant="outline"
            className="hidden min-h-10 px-3 text-xs sm:inline-flex lg:text-sm"
          >
            <span aria-hidden="true" className="me-1.5">
              👤
            </span>
            {headerCtas.secondary.label}
          </Button>
          <Button
            href={headerCtas.primary.href}
            variant="secondary"
            className="hidden min-h-10 sm:inline-flex"
          >
            <span aria-hidden="true" className="me-1.5">
              🟨
            </span>
            {headerCtas.primary.label}
          </Button>
        </div>
      </Container>
    </header>
  );
}
