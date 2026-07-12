import type { Metadata } from "next";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { consultationContent } from "@/content/consultation";

export const metadata: Metadata = {
  title: consultationContent.title,
  description: consultationContent.subtitle,
};

export default function ConsultationPage() {
  return (
    <InnerPageLayout
      activePath="/consultation"
      breadcrumbs={consultationContent.breadcrumbs}
      title={consultationContent.title}
      subtitle={consultationContent.subtitle}
      eyebrow="در حال توسعه"
      cta={{
        heading: "نیاز به راهنمایی دارید؟",
        description:
          "تا زمان فعال‌سازی درخواست آنلاین، صفحات پیش‌ثبت‌نام و تماس راهنمای فعلی شما هستند.",
        primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
        secondary: { label: "تماس", href: "/contact" },
      }}
    >
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
    </InnerPageLayout>
  );
}
