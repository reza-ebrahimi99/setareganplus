import { Container } from "@/components/ui/Container";
import {
  whySetareganContent,
  whySetareganPillars,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "why-setaregan-heading";

type WhyIcon = (typeof whySetareganPillars)[number]["icon"];

function WhyPillarIcon({ name }: { name: WhyIcon }) {
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
    case "experience":
      return (
        <svg {...common}>
          <path d="M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z" />
        </svg>
      );
    case "mentoring":
      return (
        <svg {...common}>
          <path d="M16 19v-1.2A3.8 3.8 0 0012.2 14H8.8A3.8 3.8 0 005 17.8V19" />
          <circle cx="10.5" cy="8.5" r="2.7" />
          <path d="M18.5 19v-.9a3 3 0 00-2.1-2.8" />
          <path d="M15.2 5.8a2.5 2.5 0 010 4.6" />
        </svg>
      );
    case "planning":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
          <path d="M9 14h2.5M9 17h6" />
        </svg>
      );
    case "results":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15l3.2-3.8 2.6 2.2L18 8" />
        </svg>
      );
    case "technology":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="11" rx="2" />
          <path d="M9 19h6M12 16v3" />
          <path d="M8 10h2M12 10h4" />
        </svg>
      );
    default:
      return null;
  }
}

export function WhySetareganSection() {
  return (
    <section
      aria-labelledby={headingId}
      className="section-rhythm-light relative overflow-hidden"
    >
      <Container className="py-12 sm:py-16">
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

        <ol className="why-timeline mt-10">
          {whySetareganPillars.map((pillar, index) => (
            <li key={pillar.id} className="why-timeline-item why-timeline-item--alive">
              <div className="why-timeline-rail" aria-hidden="true">
                <span className="why-timeline-node why-timeline-node--icon">
                  <WhyPillarIcon name={pillar.icon} />
                </span>
                {index < whySetareganPillars.length - 1 ? (
                  <span className="why-timeline-line" />
                ) : null}
              </div>
              <div className="why-timeline-copy">
                <div className="why-timeline-card">
                  <p className="why-timeline-step">
                    {toPersianDigits(String(index + 1).padStart(2, "0"))}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-primary sm:text-2xl">
                    {toPersianDigits(pillar.title)}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-8 text-muted sm:text-base sm:leading-9">
                    {toPersianDigits(pillar.description)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
