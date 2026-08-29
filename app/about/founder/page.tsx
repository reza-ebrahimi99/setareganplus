import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SiteShell } from "@/components/layout/SiteShell";
import { PageHero } from "@/components/ui/PageHero";
import { founderPageContent } from "@/content/about-page";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("aboutFounder");

export default function FounderPage() {
  const content = founderPageContent;

  return (
    <SiteShell activePath="/about/founder">
      <PageHero
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        subtitle={content.hero.subtitle}
        breadcrumbs={[...content.breadcrumbs]}
      />

      <section className="section-rhythm-light border-y border-border/60">
        <Container className="py-12 sm:py-16">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <figure className="premium-card overflow-hidden lg:col-span-4">
              <div className="relative aspect-[4/5] bg-primary/[0.03]">
                {hasMediaUrl(content.portrait) ? (
                  <Image
                    src={content.portrait.url!}
                    alt={content.portrait.alt}
                    fill
                    unoptimized
                    priority
                    className="object-cover object-top"
                    sizes="(max-width: 1024px) 100vw, 320px"
                  />
                ) : null}
              </div>
              <figcaption className="space-y-3 px-5 py-5">
                <p className="text-lg font-bold text-primary">
                  {toPersianDigits(content.name)}
                </p>
                <ul className="space-y-2">
                  {content.roles.map((role) => (
                    <li
                      key={role}
                      className="text-sm leading-7 text-muted"
                    >
                      {toPersianDigits(role)}
                    </li>
                  ))}
                </ul>
              </figcaption>
            </figure>

            <div className="space-y-8 lg:col-span-8">
              <article className="premium-card p-6 sm:p-8">
                <p className="text-xs font-medium tracking-[0.16em] text-secondary">
                  معرفی
                </p>
                <p className="mt-4 text-base leading-9 text-muted sm:text-lg">
                  {toPersianDigits(content.bio)}
                </p>
              </article>

              <div className="grid gap-5 md:grid-cols-2">
                {[content.vision, content.mission, content.philosophy, content.whyCreated].map(
                  (block) => (
                    <article key={block.title} className="premium-card p-6">
                      <p className="text-xs font-medium tracking-[0.16em] text-secondary">
                        {toPersianDigits(block.eyebrow)}
                      </p>
                      <h2 className="mt-3 text-xl font-bold text-primary">
                        {toPersianDigits(block.title)}
                      </h2>
                      <p className="mt-3 text-sm leading-8 text-muted">
                        {toPersianDigits(block.body)}
                      </p>
                    </article>
                  ),
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="section-rhythm-gradient border-y border-border/50">
        <Container className="py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.16em] text-secondary">
              {toPersianDigits(content.journey.eyebrow)}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-primary">
              {toPersianDigits(content.journey.title)}
            </h2>
            <p className="mt-4 text-base leading-9 text-muted">
              {toPersianDigits(content.journey.description)}
            </p>
          </div>
          <ol className="why-timeline mt-10">
            {content.journey.milestones.map((item, index) => (
              <li key={item.title} className="why-timeline-item why-timeline-item--alive">
                <div className="why-timeline-rail" aria-hidden="true">
                  <span className="why-timeline-node">
                    {toPersianDigits(String(index + 1).padStart(2, "0"))}
                  </span>
                  {index < content.journey.milestones.length - 1 ? (
                    <span className="why-timeline-line" />
                  ) : null}
                </div>
                <div className="why-timeline-copy">
                  <div className="why-timeline-card">
                    <h3 className="text-lg font-bold text-primary sm:text-xl">
                      {toPersianDigits(item.title)}
                    </h3>
                    <p className="mt-2 text-sm leading-8 text-muted">
                      {toPersianDigits(item.description)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="section-rhythm-light">
        <Container className="py-12 sm:py-16">
          <article className="premium-card mx-auto max-w-3xl p-8 text-center sm:p-10">
            <p className="text-xs font-medium tracking-[0.16em] text-secondary">
              {toPersianDigits(content.future.eyebrow)}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-primary sm:text-3xl">
              {toPersianDigits(content.future.title)}
            </h2>
            <p className="mt-4 text-base leading-9 text-muted">
              {toPersianDigits(content.future.body)}
            </p>
            <blockquote className="mt-8 border-t border-border/70 pt-6 text-lg font-medium leading-9 text-primary">
              «{toPersianDigits(content.quote)}»
            </blockquote>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={content.cta.primary.href}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-secondary transition hover:bg-primary/92"
              >
                {content.cta.primary.label}
              </Link>
              <Link
                href={content.cta.secondary.href}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 text-sm font-medium text-primary transition hover:border-secondary/40"
              >
                {content.cta.secondary.label}
              </Link>
            </div>
          </article>
        </Container>
      </section>
    </SiteShell>
  );
}
