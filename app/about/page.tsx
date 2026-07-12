import type { Metadata } from "next";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { aboutContent } from "@/content/site";

export const metadata: Metadata = {
  title: aboutContent.title,
  description: aboutContent.subtitle,
};

export default function AboutPage() {
  return (
    <InnerPageLayout
      activePath="/about"
      breadcrumbs={aboutContent.breadcrumbs}
      title={aboutContent.title}
      subtitle={aboutContent.subtitle}
      eyebrow="درباره سکو"
      cta={{
        heading: "آشنایی با مسیر ثبت‌نام",
        description:
          "برای آشنایی با مراحل پیش‌ثبت‌نام و خدمات مرکز، صفحات مرتبط را ببینید.",
        primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
        secondary: { label: "سوالات متداول", href: "/faq" },
      }}
    >
      <div className="space-y-6">
        {aboutContent.sections.map((section) => (
          <ContentCard
            key={section.heading}
            heading={section.heading}
            body={section.body}
          />
        ))}
      </div>
    </InnerPageLayout>
  );
}
