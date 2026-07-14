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

function HeroLogoFallback({ label }: { label: string }) {
  return (
    <span className="px-2 text-center text-xs font-semibold text-primary">
      {label}
    </span>
  );
}

function FounderPortraitFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary/[0.04] via-surface to-secondary/10 p-6 text-center"
    >
      <div className="flex size-24 items-center justify-center rounded-full border border-secondary/35 bg-surface text-2xl font-bold tracking-wide text-primary">
        ر.ا
      </div>
      <p className="mt-4 text-sm font-semibold text-primary">
        {founderContent.name}
      </p>
      <p className="mt-1 text-xs text-muted">مؤسس و مدیر مجموعه</p>
    </div>
  );
}

function EqualBrandMark({
  media,
  fallback,
  priority,
  clear = false,
}: {
  media: (typeof heroMedia)["logo"] | (typeof heroMedia)["ghalamchiLogo"];
  fallback: ReactNode;
  priority?: boolean;
  clear?: boolean;
}) {
  return (
    <div
      className={`brand-logo-frame brand-logo-frame--hero${
        clear ? " brand-logo-frame--clear" : ""
      }`}
    >
      {hasMediaUrl(media) ? (
        <MediaImage
          media={media}
          width={160}
          height={160}
          className="h-full w-full object-contain p-2.5"
          priority={priority}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export function PremiumHero() {
  const hasPortrait = hasMediaUrl(founderContent.portrait);

  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-surface relative overflow-hidden border-b border-border"
    >
      <Container className="relative py-14 sm:py-16 lg:py-20">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="hero-reveal max-w-xl lg:col-span-7">
            <Eyebrow>{heroContent.eyebrow}</Eyebrow>

            <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-5">
              <EqualBrandMark
                media={heroMedia.logo}
                priority
                clear
                fallback={<HeroLogoFallback label="ستارگان" />}
              />
              <div
                aria-hidden="true"
                className="hidden h-14 w-px bg-border sm:block"
              />
              <EqualBrandMark
                media={heroMedia.ghalamchiLogo}
                fallback={<HeroLogoFallback label="قلم‌چی" />}
              />
            </div>

            <h1
              id="hero-heading"
              className="mt-8 text-[2rem] font-bold tracking-tight text-primary sm:text-5xl lg:text-[3.1rem] lg:leading-[1.12]"
            >
              {toPersianDigits(heroContent.title)}
            </h1>

            <p className="mt-3 text-lg font-semibold text-primary/85 sm:text-xl">
              {toPersianDigits(heroContent.subtitle)}
            </p>

            <p className="mt-5 max-w-lg text-sm leading-8 text-muted sm:text-base">
              {toPersianDigits(heroContent.description)}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {heroDisplayStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-white px-3 py-3"
                >
                  <dt className="text-[0.65rem] font-medium leading-4 text-muted sm:text-[0.7rem] sm:leading-5">
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 text-xl font-bold text-secondary sm:text-2xl">
                    {toPersianDigits(stat.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Button href={heroCtas.primary.href} variant="secondary">
                {heroCtas.primary.label}
              </Button>
              <Button href={heroCtas.secondary.href} variant="outline">
                {heroCtas.secondary.label}
              </Button>
              <Button href={heroCtas.tertiary.href} variant="outline">
                {heroCtas.tertiary.label}
              </Button>
            </div>
          </div>

          <aside
            aria-labelledby="founder-heading"
            className="hero-reveal hero-reveal-delay lg:col-span-5"
          >
            <div className="founder-portrait-frame overflow-hidden rounded-[1.35rem] border border-border bg-white p-3 sm:p-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-background">
                {hasPortrait ? (
                  <MediaImage
                    media={founderContent.portrait}
                    fill
                    className="object-cover object-[center_18%]"
                    sizes="(max-width: 1024px) 100vw, 440px"
                    priority
                  />
                ) : (
                  <FounderPortraitFallback />
                )}
              </div>

              <div className="px-1 pb-1 pt-5 sm:px-2">
                <p className="text-xs font-medium tracking-wide text-secondary">
                  مؤسس و مدیر مجموعه
                </p>
                <h2
                  id="founder-heading"
                  className="mt-1.5 text-xl font-bold text-primary sm:text-2xl"
                >
                  {founderContent.name}
                </h2>

                <ul className="mt-4 space-y-2">
                  {founderContent.roles.map((role) => (
                    <li
                      key={role}
                      className="text-sm leading-7 text-muted before:me-2 before:text-secondary before:content-['•']"
                    >
                      {toPersianDigits(role)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}
