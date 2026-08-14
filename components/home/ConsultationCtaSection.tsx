import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { consultationCtaContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "consultation-cta-heading";

export function ConsultationCtaSection() {
  return (
    <section
      aria-labelledby={headingId}
      className="consultation-cta relative overflow-hidden border-y border-primary/25"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.28),_transparent_58%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-secondary/50 to-transparent"
      />
      <Container className="relative py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-secondary">
            {toPersianDigits(consultationCtaContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.15]"
          >
            {toPersianDigits(consultationCtaContent.heading)}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-9 text-white/82 sm:text-lg sm:leading-10">
            {toPersianDigits(consultationCtaContent.description)}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={consultationCtaContent.primary.href}
              className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-secondary px-8 text-base font-semibold text-primary shadow-[0_16px_48px_-12px_rgba(212,175,55,0.75)] transition hover:bg-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              {consultationCtaContent.primary.label}
            </Link>
            <Link
              href={consultationCtaContent.secondary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/5 px-7 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              {consultationCtaContent.secondary.label}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
