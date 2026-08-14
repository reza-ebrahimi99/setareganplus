import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { atrinHomeContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "atrin-home-heading";

export function AtrinHomeSection() {
  return (
    <Section
      className="relative overflow-hidden border-t border-border/70"
      ariaLabelledby={headingId}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.12),_transparent_55%)]"
      />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium tracking-wide text-secondary">
            {toPersianDigits(atrinHomeContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {toPersianDigits(atrinHomeContent.heading)}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-8 text-muted">
            {toPersianDigits(atrinHomeContent.description)}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={atrinHomeContent.primary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-6 text-sm font-semibold text-primary shadow-sm transition hover:bg-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              {toPersianDigits(atrinHomeContent.primary.label)}
            </Link>
            <Link
              href={atrinHomeContent.secondary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface/80 px-6 text-sm font-medium text-foreground backdrop-blur-md transition hover:border-secondary/40 hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              {toPersianDigits(atrinHomeContent.secondary.label)}
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted">
            {toPersianDigits(
              "آترین روی همه صفحات عمومی در دسترس است — از دکمه شناور پایین صفحه هم می‌توانید شروع کنید.",
            )}
          </p>
        </div>
      </Container>
    </Section>
  );
}
