import type { Metadata } from "next";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { contactContent, registrationNotice } from "@/content/site";

export const metadata: Metadata = {
  title: contactContent.title,
  description: contactContent.subtitle,
};

export default function ContactPage() {
  return (
    <InnerPageLayout
      activePath="/contact"
      breadcrumbs={contactContent.breadcrumbs}
      title={contactContent.title}
      subtitle={contactContent.subtitle}
      eyebrow="ارتباط با مرکز"
      cta={{
        heading: "پیش از انتشار اطلاعات تماس",
        description:
          "تا زمان انتشار جزئیات رسمی، صفحه پیش‌ثبت‌نام و سوالات متداول می‌توانند راهنمای شما باشند.",
        primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
        secondary: { label: "سوالات متداول", href: "/faq" },
      }}
    >
      <div className="space-y-6">
        {contactContent.sections.map((section) => (
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
