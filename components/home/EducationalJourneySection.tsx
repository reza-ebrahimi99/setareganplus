import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  educationalJourney,
  educationalJourneyContent,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "educational-journey-heading";

export function EducationalJourneySection() {
  return (
    <Section
      className="section-muted border-y border-border/70"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={educationalJourneyContent.eyebrow}
          heading={educationalJourneyContent.heading}
          description={educationalJourneyContent.description}
          headingId={headingId}
        />

        <div className="journey-rail mt-12">
          <ul className="journey-track flex gap-4 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory md:grid md:grid-cols-5 md:gap-5 md:overflow-visible md:pb-0">
            {educationalJourney.map((step, index) => (
              <li
                key={step.id}
                className="journey-card relative min-w-[78%] snap-start sm:min-w-[16rem] md:min-w-0"
              >
                {index < educationalJourney.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="journey-connector hidden md:block"
                  />
                ) : null}
                <Link
                  href={step.href}
                  className="journey-card-inner group flex h-full flex-col rounded-[1.35rem] border border-border/80 bg-surface/90 p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_22px_60px_-34px_rgba(15,23,42,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  <span
                    aria-hidden="true"
                    className="journey-mark mb-5 flex size-12 items-center justify-center rounded-2xl border border-secondary/30 bg-primary text-sm font-bold text-secondary"
                  >
                    {toPersianDigits(step.mark)}
                  </span>
                  <h3 className="text-lg font-bold text-primary">
                    {toPersianDigits(step.title)}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted">
                    {toPersianDigits(step.description)}
                  </p>
                  <span className="mt-5 text-sm font-medium text-secondary">
                    ادامه مسیر
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
