import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Section } from "@/components/ui/Section";
import { contactContent } from "@/content/site";

export const metadata: Metadata = {
  title: contactContent.title,
  description: contactContent.subtitle,
};

export default function ContactPage() {
  return (
    <SiteShell>
      <Section ariaLabelledby="page-heading">
        <Container>
          <PageHeading
            title={contactContent.title}
            subtitle={contactContent.subtitle}
          />
          <div className="space-y-6">
            {contactContent.sections.map((section) => (
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

          <div className="mt-10 rounded-xl border border-dashed border-border bg-background p-6">
            <h2 className="text-lg font-semibold text-primary">
              ثبت آنلاین
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              فرم پیش‌ثبت‌نام آنلاین هنوز فعال نشده است. پس از آماده‌سازی
              زیرساخت لازم، امکان ثبت درخواست از همین صفحه فراهم خواهد شد.
            </p>
            <div className="mt-5">
              <Button href="/about" variant="outline">
                آشنایی با سکو
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </SiteShell>
  );
}
