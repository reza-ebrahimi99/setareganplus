import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MediaImage } from "@/components/ui/MediaImage";
import { hasMediaUrl } from "@/lib/media";
import {
  founderContent,
  heroContent,
  heroCtas,
  heroMedia,
  institutionStats,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

function HeroLogoFallback() {
  return (
    <div
      aria-hidden="true"
      className="mb-6 inline-flex items-center gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-sm backdrop-blur-sm"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-secondary">
        ست
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-primary">
          {heroContent.title}
        </p>
        <p className="truncate text-xs text-muted">{heroContent.subtitle}</p>
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

export function PremiumHero() {
  const hasBackground = hasMediaUrl(heroMedia.background);
  const hasLogo = hasMediaUrl(heroMedia.logo);
  const hasPortrait = hasMediaUrl(founderContent.portrait);

  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-surface relative overflow-hidden border-b border-border"
    >
      {hasBackground ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.12]"
          style={{ backgroundImage: `url(${heroMedia.background.url})` }}
        />
      ) : (
        <HeroBackgroundFallback />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/90 to-background"
      />

      <Container className="relative py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            {hasLogo ? (
              <div className="mb-6">
                <MediaImage
                  media={heroMedia.logo}
                  width={200}
                  height={64}
                  className="h-14 w-auto sm:h-16"
                  priority
                />
              </div>
            ) : (
              <HeroLogoFallback />
            )}

            <Eyebrow>{heroContent.eyebrow}</Eyebrow>

            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]"
            >
              {toPersianDigits(heroContent.title)}
            </h1>

            <p className="mt-3 text-xl font-semibold text-primary sm:text-2xl">
              {toPersianDigits(heroContent.subtitle)}
            </p>

            <p className="mt-2 text-sm font-medium text-muted sm:text-base">
              {toPersianDigits(heroContent.affiliation)}
            </p>

            <p className="mt-4 text-lg font-medium text-secondary sm:text-xl">
              {toPersianDigits(heroContent.slogan)}
            </p>

            <p className="mt-6 text-base leading-8 text-muted sm:text-lg">
              {toPersianDigits(heroContent.description)}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {institutionStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-surface/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <dt className="text-xs font-medium text-muted">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-bold text-secondary sm:text-2xl">
                    {toPersianDigits(stat.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href={heroCtas.primary.href} variant="primary">
                {heroCtas.primary.label}
              </Button>
              {heroCtas.secondary.map((cta) => (
                <Button key={cta.href} href={cta.href} variant="outline">
                  {cta.label}
                </Button>
              ))}
            </div>
          </div>

          <aside
            aria-labelledby="founder-heading"
            className="premium-card p-6 sm:p-8"
          >
            <div className="relative mb-6 aspect-[4/5] max-h-80 overflow-hidden rounded-xl border border-border">
              {hasPortrait ? (
                <MediaImage
                  media={founderContent.portrait}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 480px"
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
              className="mt-2 text-2xl font-bold text-primary"
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

            <p className="mt-5 text-sm leading-8 text-muted">
              {toPersianDigits(founderContent.bio)}
            </p>
          </aside>
        </div>
      </Container>
    </section>
  );
}
