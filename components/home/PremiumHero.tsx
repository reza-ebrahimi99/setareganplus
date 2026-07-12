import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { heroContent } from "@/content/home";
import { PlatformPreview } from "./PlatformPreview";

export function PremiumHero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-surface border-b border-border"
    >
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            <Eyebrow>{heroContent.eyebrow}</Eyebrow>
            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]"
            >
              {heroContent.title}
            </h1>
            <p className="mt-4 text-xl font-medium text-secondary sm:text-2xl">
              {heroContent.subtitle}
            </p>
            <p className="mt-6 text-base leading-8 text-muted sm:text-lg">
              {heroContent.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href="/pre-registration" variant="primary">
                پیش‌ثبت‌نام
              </Button>
              <Button href="/courses" variant="outline">
                دوره‌ها
              </Button>
              <Button href="/consultation" variant="outline">
                مشاوره
              </Button>
            </div>
          </div>
          <PlatformPreview />
        </div>
      </Container>
    </section>
  );
}
