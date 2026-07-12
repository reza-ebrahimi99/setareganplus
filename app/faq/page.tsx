import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { registrationNotice } from "@/content/site";
import { faqContent } from "@/content/faq";

export const metadata: Metadata = {
  title: faqContent.title,
  description: faqContent.subtitle,
};

export default function FaqPage() {
  return (
    <SiteShell activePath="/faq">
      <Section ariaLabelledby="page-heading">
        <Container>
          <Breadcrumbs items={faqContent.breadcrumbs} />
          <PageHeading
            title={faqContent.title}
            subtitle={faqContent.subtitle}
          />
          <div className="space-y-4">
            {faqContent.items.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-border bg-surface shadow-sm"
              >
                <summary className="cursor-pointer list-none px-6 py-4 text-base font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
                  {item.question}
                </summary>
                <div className="border-t border-border px-6 py-4">
                  <p className="text-base leading-8 text-muted">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
          <div className="mt-8">
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
