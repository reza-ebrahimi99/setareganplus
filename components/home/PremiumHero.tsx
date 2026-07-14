import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MediaImage } from "@/components/ui/MediaImage";
import { hasMediaUrl } from "@/lib/media";
import {
  founderContent,
  heroContent,
  heroCtas,
  heroDisplayStats,
  heroMedia,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

function HeroLogoFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[7.5rem] items-center justify-center px-3 text-center"
    >
      <div>
        <p className="text-base font-bold text-primary">{heroContent.title}</p>
        <p className="mt-1 text-xs text-muted">{heroContent.subtitle}</p>
      </div>
    </div>
  );
}

function HeroBackgroundFallback() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -start-24 top-0 size-72 rounded-full bg-secondary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 bottom-0 size-96 rounded-full bg-primary/5 blur-3xl"
      />
    </>
  );
}

function FounderPortraitFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary/8 via-surface to-secondary/15 p-6 text-center"
    >
      <div className="flex size-24 items-center justify-center rounded-full border-2 border-secondary/40 bg-surface text-2xl font-bold tracking-wide text-primary shadow-sm">
        ر.ا
      </div>
      <p className="mt-4 text-sm font-semibold text-primary">
        {founderContent.name}
      </p>
      <p className="mt-1 text-xs text-muted">مؤسس و مدیر مجموعه</p>
    </div>
  );
}

function BrandMark({
  media,
  size,
  fallback,
}: {
  media: (typeof heroMedia)["logo"] | (typeof heroMedia)["ghalamchiLogo"];
  size: "primary" | "secondary";
  fallback: ReactNode;
}) {
  const shell =
    size === "primary"
      ? "h-[7.5rem] w-[6.25rem] sm:h-[8.75rem] sm:w-[7.25rem]"
      : "h-[4.5rem] w-[4.75rem] sm:h-[5.25rem] sm:w-[5.5rem]";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm ${shell}`}
    >
      {hasMediaUrl(media) ? (
        <MediaImage
          media={media}
          width={size === "primary" ? 160 : 120}
          height={size === "primary" ? 200 : 140}
          className="h-full w-full object-contain p-2 sm:p-2.5"
          priority
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export function PremiumHero() {
  const hasBackground = hasMediaUrl(heroMedia.background);
  const hasPortrait = hasMediaUrl(founderContent.portrait);

  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-surface relative overflow-hidden border-b border-border"
    >
      {hasBackground ? (
        <div
          aria-hidden="true"
          className="hero-media-fade pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.28] sm:opacity-[0.32]"
          style={{ backgroundImage: `url(${heroMedia.background.url})` }}
        />
      ) : (
        <HeroBackgroundFallback />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-surface/88 to-background"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-l from-surface/95 via-surface/70 to-transparent"
      />

      <Container className="relative py-12 sm:py-16 lg:py-20">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="hero-reveal max-w-2xl lg:col-span-7">
            <div className="mb-7 flex flex-wrap items-end gap-4 sm:gap-5">
              <BrandMark
                media={heroMedia.logo}
                size="primary"
                fallback={<HeroLogoFallback />}
              />

              <div
                aria-hidden="true"
                className="mb-6 hidden h-16 w-px bg-border sm:block"
              />

              <div className="flex min-w-0 flex-col gap-2">
                <p className="max-w-[11rem] text-[0.7rem] font-medium leading-5 text-muted sm:max-w-[13rem] sm:text-xs sm:leading-6">
                  با همراهی نمایندگی قلم‌چی نسیم‌شهر
                </p>
                <BrandMark
                  media={heroMedia.ghalamchiLogo}
                  size="secondary"
                  fallback={
                    <span className="px-2 text-center text-[0.65rem] font-semibold leading-4 text-primary">
                      قلم‌چی
                    </span>
                  }
                />
              </div>
            </div>

            <Eyebrow>{heroContent.eyebrow}</Eyebrow>

            <h1
              id="hero-heading"
              className="mt-3 text-[2rem] font-bold tracking-tight text-primary sm:text-5xl lg:text-[3.15rem] lg:leading-[1.15]"
            >
              {toPersianDigits(heroContent.title)}
            </h1>

            <p className="mt-2 text-lg font-semibold text-primary/90 sm:text-xl">
              {toPersianDigits(heroContent.subtitle)}
            </p>

            <p className="mt-4 text-base font-medium text-secondary sm:text-lg">
              {toPersianDigits(heroContent.slogan)}
            </p>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
              {toPersianDigits(heroContent.description)}
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {heroDisplayStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-surface/95 px-3 py-3 shadow-sm"
                >
                  <dt className="text-[0.7rem] font-medium leading-4 text-muted sm:text-xs">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-secondary sm:text-2xl">
                    {toPersianDigits(stat.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button href={heroCtas.primary.href} variant="primary">
                {heroCtas.primary.label}
              </Button>
              <Button href={heroCtas.secondary.href} variant="outline">
                {heroCtas.secondary.label}
              </Button>
              <Button
                href={heroCtas.tertiary.href}
                variant="outline"
                className="border-transparent bg-transparent text-muted shadow-none hover:border-transparent hover:bg-transparent hover:text-primary"
              >
                {heroCtas.tertiary.label}
              </Button>
            </div>
          </div>

          <aside
            aria-labelledby="founder-heading"
            className="hero-reveal hero-reveal-delay premium-card p-5 sm:p-7 lg:col-span-5"
          >
            <div className="relative mb-5 aspect-[4/5] max-h-72 overflow-hidden rounded-xl border border-border bg-background sm:max-h-80">
              {hasPortrait ? (
                <MediaImage
                  media={founderContent.portrait}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 420px"
                  priority
                />
              ) : (
                <FounderPortraitFallback />
              )}
            </div>

            <p className="text-xs font-medium tracking-wide text-secondary">
              مؤسس و مدیر مجموعه
            </p>
            <h2
              id="founder-heading"
              className="mt-1.5 text-xl font-bold text-primary sm:text-2xl"
            >
              {founderContent.name}
            </h2>

            <ul className="mt-3 space-y-1.5">
              {founderContent.roles.map((role) => (
                <li
                  key={role}
                  className="text-sm leading-7 text-muted before:me-2 before:text-secondary before:content-['•']"
                >
                  {toPersianDigits(role)}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm leading-7 text-muted sm:leading-8">
              {toPersianDigits(founderContent.bio)}
            </p>
          </aside>
        </div>
      </Container>
    </section>
  );
}
