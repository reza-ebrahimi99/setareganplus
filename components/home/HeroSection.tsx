import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { heroContent } from "@/content/home";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="border-b border-border bg-surface"
    >
      <Container className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="mb-4 inline-block rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted">
            در حال توسعه
          </p>
          <h1
            id="hero-heading"
            className="text-4xl font-bold tracking-tight text-primary sm:text-5xl"
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
            <Button href="/contact" variant="primary">
              تماس و پیش‌ثبت‌نام
            </Button>
            <Button href="/about" variant="outline">
              بیشتر بدانید
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
