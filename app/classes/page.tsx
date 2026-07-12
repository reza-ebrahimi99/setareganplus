import type { Metadata } from "next";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { classesContent } from "@/content/classes";

export const metadata: Metadata = {
  title: classesContent.title,
  description: classesContent.subtitle,
};

export default function ClassesPage() {
  return (
    <InnerPageLayout
      activePath="/classes"
      breadcrumbs={classesContent.breadcrumbs}
      title={classesContent.title}
      subtitle={classesContent.subtitle}
      eyebrow="در حال توسعه"
      cta={{
        heading: "مرحله بعدی ثبت‌نام",
        description:
          "برای آشنایی با مسیر پیش‌ثبت‌نام و پرسش‌های رایج، صفحات مرتبط را ببینید.",
        primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
        secondary: { label: "سوالات متداول", href: "/faq" },
      }}
    >
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
    </InnerPageLayout>
  );
}
