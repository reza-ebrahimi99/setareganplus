import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { registrationNotice } from "@/content/site";
import { coursesContent } from "@/content/courses";

export const metadata: Metadata = {
  title: coursesContent.title,
  description: coursesContent.subtitle,
};

export default function CoursesPage() {
  return (
    <SiteShell activePath="/courses">
      <Section ariaLabelledby="page-heading">
        <Container>
          <Breadcrumbs items={coursesContent.breadcrumbs} />
          <PageHeading
            title={coursesContent.title}
            subtitle={coursesContent.subtitle}
          />
          <div className="space-y-6">
            {coursesContent.sections.map((section) => (
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
            <Button href="/faq" variant="outline">
              سوالات متداول
            </Button>
          </div>
        </Container>
      </Section>
    </SiteShell>
  );
}
