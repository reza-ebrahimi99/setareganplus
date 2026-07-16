import type { Metadata } from "next";
import { EmbeddedPublicForm } from "@/components/forms/EmbeddedPublicForm";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { preRegistrationContent } from "@/content/pre-registration";
import { getPreRegistrationFormSlug } from "@/lib/site/page-integrations";

export const metadata: Metadata = {
  title: preRegistrationContent.title,
  description: preRegistrationContent.subtitle,
};

export default function PreRegistrationPage() {
  const formSlug = getPreRegistrationFormSlug();

  return (
    <InnerPageLayout
      activePath="/pre-registration"
      breadcrumbs={preRegistrationContent.breadcrumbs}
      title={preRegistrationContent.title}
      subtitle={preRegistrationContent.subtitle}
      eyebrow="مسیر ثبت‌نام"
      cta={
        formSlug
          ? {
              heading: "فرم آنلاین پیش‌ثبت‌نام",
              description:
                "از بخش پایین همین صفحه می‌توانید اطلاعات خود را ثبت کنید.",
              primary: { label: "رفتن به فرم", href: "#online-form" },
              secondary: { label: "تماس", href: "/contact" },
            }
          : {
              heading: "فرم آنلاین هنوز فعال نیست",
              description:
                "تا زمان آماده‌سازی زیرساخت، برای پرسش یا پیگیری از صفحه تماس استفاده کنید.",
              primary: { label: "تماس", href: "/contact" },
              secondary: { label: "سوالات متداول", href: "/faq" },
            }
      }
    >
      <div className="space-y-6">
        {preRegistrationContent.sections.map((section) => (
          <ContentCard
            key={section.heading}
            heading={section.heading}
            body={section.body}
          />
        ))}

        {formSlug ? (
          <section id="online-form" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold text-primary">
              ثبت‌نام آنلاین
            </h2>
            <EmbeddedPublicForm
              slug={formSlug}
              displayMode="embedded"
              showPoster={false}
              instanceId="pre-registration-embed"
            />
          </section>
        ) : (
          <ContentCard
            heading="فرم آنلاین"
            body="شناسه فرم پیش‌ثبت‌نام هنوز در پیکربندی سرور تنظیم نشده است. محتوای فعلی صفحه حفظ شده و به‌محض فعال‌سازی فرم، همین‌جا نمایش داده می‌شود."
            variant="notice"
          />
        )}

        <ContentCard
          heading={registrationNotice.heading}
          body={registrationNotice.body}
          variant="notice"
        />
      </div>
    </InnerPageLayout>
  );
}
