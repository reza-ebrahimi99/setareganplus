"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const headerTagline = "اکوسیستم آموزشی ستارگان";

function HeaderLogo({
  media,
  priority,
  clear = false,
  size = "md",
  onDark = false,
}: {
  media: (typeof heroMedia)["logo"] | (typeof heroMedia)["ghalamchiLogo"];
  priority?: boolean;
  clear?: boolean;
  size?: "md" | "sm" | "xs";
  onDark?: boolean;
}) {
  if (!hasMediaUrl(media)) {
    return null;
  }

  const frame =
    size === "xs"
      ? "brand-logo-frame brand-logo-frame--header-xs"
      : size === "sm"
        ? "brand-logo-frame brand-logo-frame--header-sm"
        : "brand-logo-frame brand-logo-frame--header";

  return (
    <span
      className={`${frame}${clear ? " brand-logo-frame--clear" : ""}${
        onDark ? " brand-logo-frame--on-dark" : ""
      }`}
    >
      <MediaImage
        media={media}
        width={size === "xs" ? 36 : size === "sm" ? 44 : 72}
        height={size === "xs" ? 36 : size === "sm" ? 44 : 72}
        className="h-full w-full object-contain p-1"
        priority={priority}
      />
    </span>
  );
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  const isHome = activePath === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 28);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overHero = isHome && !scrolled;
  const compact = scrolled;

  return (
    <header
      className={`site-header fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
        overHero
          ? "site-header--over-hero border-b border-transparent bg-transparent"
          : "site-header--solid border-b border-border/70 bg-surface/80 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      }${compact ? " site-header--compact" : ""}`}
    >
      <Container
        className={`flex min-w-0 items-center justify-between gap-2 transition-[padding] duration-300 sm:gap-3 lg:gap-4 ${
          compact ? "py-1.5 sm:py-2" : "py-2.5 sm:py-3"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-2.5"
          >
            <HeaderLogo
              media={heroMedia.logo}
              priority
              clear
              size={compact ? "sm" : "md"}
              onDark={overHero}
            />
            <span className="flex min-w-0 flex-col justify-center">
              <span
                className={`truncate font-bold leading-tight transition-colors sm:text-lg ${
                  compact ? "text-sm sm:text-base" : "text-base"
                } ${
                  overHero
                    ? "text-white group-hover:text-white/90"
                    : "text-primary group-hover:text-primary/80"
                }`}
              >
                {siteConfig.name}
              </span>
              <span
                className={`hidden truncate text-[0.7rem] leading-snug sm:block sm:text-xs xl:max-w-[14rem] ${
                  overHero ? "text-white/65" : "text-muted"
                }${compact ? " sm:hidden" : ""}`}
              >
                {headerTagline}
              </span>
            </span>
          </Link>

          <div
            className={`hidden items-center gap-2 border-s ps-3 opacity-80 xl:flex ${
              overHero ? "border-white/20" : "border-border/80"
            }`}
            title="نمایندگی رسمی قلم‌چی"
          >
            <HeaderLogo
              media={heroMedia.ghalamchiLogo}
              size="xs"
              onDark={overHero}
            />
            <p
              className={`max-w-[7.5rem] text-[0.65rem] font-medium leading-4 ${
                overHero ? "text-white/60" : "text-muted"
              }`}
            >
              نمایندگی رسمی قلم‌چی
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <MainNav
            activePath={activePath}
            overHero={overHero}
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
            className={`hidden min-h-10 px-3 text-xs sm:inline-flex lg:text-sm ${
              overHero
                ? "border-white/25 bg-white/5 text-white hover:bg-white/10"
                : ""
            }`}
          >
            {headerCtas.secondary.label}
          </Button>
          <Button
            href={headerCtas.primary.href}
            variant="secondary"
            className="hidden min-h-10 sm:inline-flex"
          >
            {headerCtas.primary.label}
          </Button>
        </div>
      </Container>
    </header>
  );
}
