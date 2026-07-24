import { ParallaxBackground } from "@/components/about/ParallaxBackground";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { aboutHeroContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

export function AboutHero() {
  const { background, eyebrow, title, subtitle, primaryCta, secondaryCta } =
    aboutHeroContent;

  return (
    <section
      aria-labelledby="about-hero-heading"
      className="relative isolate min-h-[100svh] overflow-hidden"
    >
      <ParallaxBackground src={background.url} alt={background.alt} priority />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/72 to-primary/88"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(212_175_55/0.18),transparent_55%)]"
      />

      <Container className="relative flex min-h-[100svh] flex-col justify-end pb-16 pt-28 sm:justify-center sm:pb-20 sm:pt-24 lg:pb-24">
        <div className="max-w-3xl">
          <p className="hero-reveal inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-secondary backdrop-blur-sm">
            {toPersianDigits(eyebrow)}
          </p>
          <h1
            id="about-hero-heading"
            className="hero-reveal hero-reveal-delay mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.2]"
          >
            {toPersianDigits(title)}
          </h1>
          <p className="hero-reveal hero-reveal-delay-2 mt-5 max-w-2xl text-base leading-8 text-white/85 sm:text-lg sm:leading-9">
            {toPersianDigits(subtitle)}
          </p>
          <div className="hero-reveal hero-reveal-delay-3 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              href={primaryCta.href}
              variant="secondary"
              className="min-h-11"
            >
              {primaryCta.label}
            </Button>
            <Button
              href={secondaryCta.href}
              variant="outline"
              className="min-h-11 border-white/30 bg-white/10 text-white hover:border-secondary/50 hover:bg-white/15"
            >
              {secondaryCta.label}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
