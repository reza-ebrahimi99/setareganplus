import type { Metadata } from "next";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { examsContent } from "@/content/exams";

export const metadata: Metadata = {
  title: examsContent.title,
  description: examsContent.subtitle,
};

export default function ExamsPage() {
  return (
    <InnerPageLayout
      activePath="/exams"
      breadcrumbs={examsContent.breadcrumbs}
      title={examsContent.title}
      subtitle={examsContent.subtitle}
      eyebrow="اطلاعات خدمات"
      cta={{
        heading: "مرحله بعدی ثبت‌نام",
        description:
          "برای آشنایی با مسیر پیش‌ثبت‌نام و پرسش‌های رایج، صفحات مرتبط را ببینید.",
        primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
        secondary: { label: "سوالات متداول", href: "/faq" },
      }}
    >
      <div className="space-y-6">
        {examsContent.sections.map((section) => (
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
    </InnerPageLayout>
  );
}
