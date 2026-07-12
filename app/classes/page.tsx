import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { registrationNotice } from "@/content/site";
import { classesContent } from "@/content/classes";

export const metadata: Metadata = {
  title: classesContent.title,
  description: classesContent.subtitle,
};

export default function ClassesPage() {
  return (
    <SiteShell activePath="/classes">
      <Section ariaLabelledby="page-heading">
        <Container>
          <Breadcrumbs items={classesContent.breadcrumbs} />
          <PageHeading
            title={classesContent.title}
            subtitle={classesContent.subtitle}
          />
          <div className="space-y-6">
            {classesContent.sections.map((section) => (
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
