import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { aboutContent } from "@/content/site";

export const metadata: Metadata = {
  title: aboutContent.title,
  description: aboutContent.subtitle,
};

export default function AboutPage() {
  return (
    <SiteShell>
      <Section ariaLabelledby="page-heading">
        <Container>
          <PageHeading
            title={aboutContent.title}
            subtitle={aboutContent.subtitle}
          />
          <div className="space-y-10">
            {aboutContent.sections.map((section) => (
              <article
                key={section.heading}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              >
                <h2 className="text-xl font-semibold text-primary">
                  {section.heading}
                </h2>
                <p className="mt-3 text-base leading-8 text-muted">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </Section>
    </SiteShell>
  );
}
