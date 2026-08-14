import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { consultationCtaContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "consultation-cta-heading";

export function ConsultationCtaSection() {
  return (
    <section
      aria-labelledby={headingId}
      className="consultation-cta relative overflow-hidden border-y border-primary/20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.22),_transparent_60%)]"
      />
      <Container className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-secondary">
            {toPersianDigits(consultationCtaContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-4 text-3xl font-bold text-white sm:text-4xl"
          >
            {toPersianDigits(consultationCtaContent.heading)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-9 text-white/80 sm:text-lg">
            {toPersianDigits(consultationCtaContent.description)}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={consultationCtaContent.primary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-secondary px-7 text-sm font-semibold text-primary shadow-[0_12px_40px_-12px_rgba(212,175,55,0.65)] transition hover:bg-secondary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
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
