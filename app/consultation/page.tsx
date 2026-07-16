import type { Metadata } from "next";
import { EmbeddedBooking } from "@/components/booking/EmbeddedBooking";
import { EmbeddedPublicForm } from "@/components/forms/EmbeddedPublicForm";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { consultationContent } from "@/content/consultation";
import {
  getConsultationBookingServiceSlug,
  getConsultationFormSlug,
} from "@/lib/site/page-integrations";

export const metadata: Metadata = {
  title: consultationContent.title,
  description: consultationContent.subtitle,
};

export default function ConsultationPage() {
  const formSlug = getConsultationFormSlug();
  const bookingSlug = getConsultationBookingServiceSlug();
  const hasIntegration = Boolean(formSlug || bookingSlug);

  return (
    <InnerPageLayout
      activePath="/consultation"
      breadcrumbs={consultationContent.breadcrumbs}
      title={consultationContent.title}
      subtitle={consultationContent.subtitle}
      eyebrow={hasIntegration ? "مشاوره" : "در حال توسعه"}
      cta={{
        heading: "نیاز به راهنمایی دارید؟",
        description: hasIntegration
          ? "از بخش‌های پایین صفحه می‌توانید فرم مشاوره را پر کنید یا نوبت رزرو کنید."
          : "تا زمان فعال‌سازی درخواست آنلاین، صفحات پیش‌ثبت‌نام و تماس راهنمای فعلی شما هستند.",
        primary: formSlug
          ? { label: "فرم مشاوره", href: "#consultation-form" }
          : bookingSlug
            ? { label: "رزرو نوبت", href: "#consultation-booking" }
            : { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
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

        {formSlug ? (
          <section id="consultation-form" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold text-primary">
              فرم درخواست مشاوره
            </h2>
            <EmbeddedPublicForm
              slug={formSlug}
              displayMode="embedded"
              showPoster={false}
              instanceId="consultation-form-embed"
            />
          </section>
        ) : null}

        {bookingSlug ? (
          <section id="consultation-booking" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold text-primary">
              رزرو نوبت مشاوره
            </h2>
            <EmbeddedBooking
              serviceSlug={bookingSlug}
              displayMode="card"
              buttonText="رزرو مشاوره"
            />
          </section>
        ) : null}

        {!formSlug && !bookingSlug ? (
          <ContentCard
            heading="خدمات آنلاین مشاوره"
            body="فرم یا خدمت نوبت‌دهی مشاوره هنوز در پیکربندی سرور تنظیم نشده است. محتوای راهنما حفظ شده و پس از تنظیم شناسه‌ها، همین صفحه به‌روز می‌شود."
            variant="notice"
          />
        ) : null}

        <ContentCard
          heading={registrationNotice.heading}
          body={registrationNotice.body}
          variant="notice"
        />
      </div>
    </InnerPageLayout>
  );
}
