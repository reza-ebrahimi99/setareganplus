import type { Metadata } from "next";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { preRegistrationContent } from "@/content/pre-registration";

export const metadata: Metadata = {
  title: preRegistrationContent.title,
  description: preRegistrationContent.subtitle,
};

export default function PreRegistrationPage() {
  return (
    <InnerPageLayout
      activePath="/pre-registration"
      breadcrumbs={preRegistrationContent.breadcrumbs}
      title={preRegistrationContent.title}
      subtitle={preRegistrationContent.subtitle}
      eyebrow="مسیر ثبت‌نام"
      cta={{
        heading: "فرم آنلاین هنوز فعال نیست",
        description:
          "تا زمان آماده‌سازی زیرساخت، برای پرسش یا پیگیری از صفحه تماس استفاده کنید.",
        primary: { label: "تماس", href: "/contact" },
        secondary: { label: "سوالات متداول", href: "/faq" },
      }}
    >
      <div className="space-y-6">
        {preRegistrationContent.sections.map((section) => (
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
