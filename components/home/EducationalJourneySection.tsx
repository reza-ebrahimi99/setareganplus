import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  educationalJourney,
  educationalJourneyContent,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "educational-journey-heading";

type JourneyIcon = (typeof educationalJourney)[number]["icon"];

function JourneyStageIcon({ name }: { name: JourneyIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "book":
      return (
        <svg {...common}>
          <path d="M5 5.5A2.5 2.5 0 017.5 3H19v16H7.5A2.5 2.5 0 005 16.5v-11z" />
          <path d="M5 16.5A2.5 2.5 0 017.5 19H19" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 4l8 4-8 4-8-4 8-4z" />
          <path d="M4 12l8 4 8-4" />
          <path d="M4 16l8 4 8-4" />
        </svg>
      );
    case "route":
      return (
        <svg {...common}>
          <circle cx="6.5" cy="6.5" r="2" />
          <circle cx="17.5" cy="17.5" r="2" />
          <path d="M8.2 7.8c2.4 1 4 3.4 4.3 6.1.2 1.5.9 2.7 2.2 3.3" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15v-4M12 15V8M16 15v-6" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
          <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
        </svg>
      );
    default:
      return null;
  }
}

export function EducationalJourneySection() {
  return (
    <section
      aria-labelledby={headingId}
      className="section-rhythm-gradient border-y border-border/60"
    >
      <Container className="py-12 sm:py-16">
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

        <div className="journey-rail mt-10">
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
                  />
                ) : null}
                <Link
                  href={step.href}
                  className={`journey-card-inner journey-card--${step.accent} group flex h-full flex-col`}
                >
                  <span className="journey-mark" aria-hidden="true">
                    <JourneyStageIcon name={step.icon} />
                  </span>
                  <p className="mt-4 text-[0.7rem] font-semibold tracking-[0.14em] text-secondary">
                    {toPersianDigits(step.mark)}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-primary">
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
