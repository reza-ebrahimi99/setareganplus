import { Container } from "@/components/ui/Container";
import {
  whySetareganContent,
  whySetareganPillars,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "why-setaregan-heading";

export function WhySetareganSection() {
  return (
    <section
      aria-labelledby={headingId}
      className="section-rhythm-light relative overflow-hidden"
    >
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-secondary">
            {toPersianDigits(whySetareganContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl"
          >
            {toPersianDigits(whySetareganContent.heading)}
          </h2>
          <p className="mt-4 text-base leading-9 text-muted sm:text-lg sm:leading-10">
            {toPersianDigits(whySetareganContent.description)}
          </p>
        </div>

        <ol className="why-timeline mt-14">
          {whySetareganPillars.map((pillar, index) => (
            <li key={pillar.id} className="why-timeline-item">
              <div className="why-timeline-rail" aria-hidden="true">
                <span className="why-timeline-node">
                  {toPersianDigits(String(index + 1).padStart(2, "0"))}
                </span>
                {index < whySetareganPillars.length - 1 ? (
                  <span className="why-timeline-line" />
                ) : null}
              </div>
              <div className="why-timeline-copy">
                <h3 className="text-2xl font-bold text-primary sm:text-3xl">
                  {toPersianDigits(pillar.title)}
                </h3>
                <p className="mt-3 max-w-xl text-base leading-9 text-muted sm:text-lg sm:leading-10">
                  {toPersianDigits(pillar.description)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
