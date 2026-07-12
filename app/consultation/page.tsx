import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { registrationNotice } from "@/content/site";
import { consultationContent } from "@/content/consultation";

export const metadata: Metadata = {
  title: consultationContent.title,
  description: consultationContent.subtitle,
};

export default function ConsultationPage() {
  return (
    <SiteShell activePath="/consultation">
      <Section ariaLabelledby="page-heading">
        <Container>
          <Breadcrumbs items={consultationContent.breadcrumbs} />
          <PageHeading
            title={consultationContent.title}
            subtitle={consultationContent.subtitle}
          />
          <div className="space-y-6">
            {consultationContent.sections.map((section) => (
              <ContentCard
                key={section.heading}
                heading={section.heading}
                body={section.body}
              />
            ))}
            <ContentCard
              heading={registrationNotice.heading}
              body={registrationNotice.body}
              variant="notice"
            />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href="/pre-registration" variant="primary">
              پیش‌ثبت‌نام
            </Button>
            <Button href="/contact" variant="outline">
              تماس
            </Button>
          </div>
        </Container>
      </Section>
    </SiteShell>
  );
}
