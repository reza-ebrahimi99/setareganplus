import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { enrollmentJourneyContent, enrollmentSteps } from "@/content/home";

export function EnrollmentJourneySection() {
  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby="journey-heading"
    >
      <Container>
        <div className="max-w-3xl">
          <h2
            id="journey-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {enrollmentJourneyContent.heading}
          </h2>
          <p className="mt-3 text-base leading-8 text-muted">
            {enrollmentJourneyContent.description}
          </p>
        </div>
        <ol className="mt-10 grid gap-4 lg:grid-cols-5">
          {enrollmentSteps.map((step, index) => (
            <li key={step.title} className="journey-step premium-card p-5">
              <div className="mb-4 flex size-10 items-center justify-center rounded-full border border-secondary/30 bg-secondary/10 text-sm font-bold text-primary">
                {index + 1}
              </div>
              <h3 className="text-sm font-semibold text-primary">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
