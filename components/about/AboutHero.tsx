import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { aboutPageContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

export function AboutHero() {
  const { hero, breadcrumbs } = aboutPageContent;

  return (
    <section
      aria-labelledby="about-hero-heading"
      className="hero-surface border-b border-border"
    >
      <Container className="py-14 sm:py-20 lg:py-24">
        <Breadcrumbs items={breadcrumbs} />
        <div className="mt-8 max-w-3xl">
          <Eyebrow className="border border-secondary/30 bg-white/80 text-primary shadow-sm">
            {hero.eyebrow}
          </Eyebrow>
          <h1
            id="about-hero-heading"
            className="hero-reveal mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl lg:text-5xl lg:leading-[1.15]"
          >
            {toPersianDigits(hero.title)}
          </h1>
          <p className="hero-reveal hero-reveal-delay mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
            {toPersianDigits(hero.subtitle)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href={hero.primaryCta.href} variant="secondary" className="px-6 py-3 text-base">
              {hero.primaryCta.label}
            </Button>
            <Button href={hero.secondaryCta.href} variant="outline" className="px-6 py-3 text-base">
              {hero.secondaryCta.label}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
