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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.06),_transparent_55%)]"
      />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-[0.18em] text-secondary">
              {toPersianDigits(atrinHomeContent.eyebrow)}
            </p>
            <h2
              id={headingId}
              className="mt-4 text-3xl font-bold text-primary sm:text-4xl"
            >
              {toPersianDigits(atrinHomeContent.heading)}
            </h2>
            <p className="mt-5 max-w-md text-base leading-9 text-muted">
              {toPersianDigits(atrinHomeContent.description)}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={atrinHomeContent.primary.href}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {toPersianDigits(atrinHomeContent.primary.label)}
              </Link>
              <Link
                href={atrinHomeContent.secondary.href}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-6 text-sm font-medium text-foreground transition hover:border-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                {toPersianDigits(atrinHomeContent.secondary.label)}
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              {toPersianDigits(
                "آترین روی صفحات عمومی از دکمه شناور نیز در دسترس است.",
              )}
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-1 xl:grid-cols-3">
            {atrinHomeContent.capabilities.map((item) => (
              <li key={item.title} className="atrin-capability-card">
                <h3 className="text-base font-bold text-primary">
                  {toPersianDigits(item.title)}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {toPersianDigits(item.body)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
