import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  educationalJourney,
  educationalJourneyContent,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "educational-journey-heading";

export function EducationalJourneySection() {
  return (
    <section
      aria-labelledby={headingId}
      className="section-rhythm-gradient border-y border-border/60"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-secondary">
            {toPersianDigits(educationalJourneyContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl"
          >
            {toPersianDigits(educationalJourneyContent.heading)}
          </h2>
          <p className="mt-4 text-base leading-9 text-muted sm:text-lg">
            {toPersianDigits(educationalJourneyContent.description)}
          </p>
        </div>

        <div className="journey-rail mt-12">
          <ul className="journey-track flex gap-4 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:pb-0">
            {educationalJourney.map((step, index) => (
              <li
                key={step.id}
                className="journey-card relative min-w-[78%] snap-start sm:min-w-[16rem] md:min-w-0"
              >
                {index < educationalJourney.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="journey-connector hidden md:block"
                  >
                    ↓
                  </span>
                ) : null}
                <Link
                  href={step.href}
                  className="journey-card-inner group flex h-full flex-col"
                >
                  <span aria-hidden="true" className="journey-mark">
                    {toPersianDigits(step.mark)}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-primary">
                    {toPersianDigits(step.title)}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted">
                    {toPersianDigits(step.description)}
                  </p>
                  <span className="mt-5 text-sm font-medium text-secondary transition group-hover:translate-x-[-2px]">
                    ادامه مسیر ←
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
