import type { Metadata } from "next";
import { SitePlacementSection } from "@/components/site/SitePlacementSection";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { preRegistrationContent } from "@/content/pre-registration";
import { loadResolvedSitePlacement } from "@/lib/site/load-site-placement";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: preRegistrationContent.title,
  description: preRegistrationContent.subtitle,
};

export default async function PreRegistrationPage() {
  const placement = await loadResolvedSitePlacement("PRE_REGISTRATION_FORM");
  const hasForm = placement.kind === "form";

  return (
    <InnerPageLayout
      activePath="/pre-registration"
      breadcrumbs={preRegistrationContent.breadcrumbs}
      title={preRegistrationContent.title}
      subtitle={preRegistrationContent.subtitle}
      eyebrow="مسیر ثبت‌نام"
      cta={
        hasForm
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

        <SitePlacementSection
          placement={placement}
          sectionId="online-form"
          fallbackHeading="ثبت‌نام آنلاین"
          instanceId="pre-registration-embed"
          showUnsetNotice
          unsetNoticeBody="فرم پیش‌ثبت‌نام هنوز در پنل مدیریت (جایگاه‌های سایت) تنظیم نشده است. محتوای راهنما حفظ شده است."
        />

        <ContentCard
          heading={registrationNotice.heading}
          body={registrationNotice.body}
          variant="notice"
        />
      </div>
    </InnerPageLayout>
  );
}
