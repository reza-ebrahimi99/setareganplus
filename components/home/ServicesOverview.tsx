import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { introductionContent, serviceCategories } from "@/content/home";

export function ServicesOverview() {
  return (
    <>
      <Section ariaLabelledby="introduction-heading">
        <Container>
          <h2
            id="introduction-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            {introductionContent.heading}
          </h2>
          <div className="mt-6 max-w-3xl space-y-4">
            {introductionContent.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </Section>

      <Section
        className="border-y border-border bg-surface"
        ariaLabelledby="services-heading"
      >
        <Container>
          <h2
            id="services-heading"
            className="text-2xl font-bold text-primary sm:text-3xl"
          >
            حوزه‌های خدماتی
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-8 text-muted">
            موارد زیر حوزه‌های برنامه‌ریزی‌شده برای سکو هستند و به‌تدریج در
            نسخه‌های آینده پیاده‌سازی می‌شوند.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCategories.map((service) => (
              <li
                key={service.title}
                className="rounded-xl border border-border bg-background p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-primary">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {service.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
