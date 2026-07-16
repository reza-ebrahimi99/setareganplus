import type { Metadata } from "next";
import { SitePlacementSection } from "@/components/site/SitePlacementSection";
import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { consultationContent } from "@/content/consultation";
import { loadResolvedSitePlacement } from "@/lib/site/load-site-placement";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: consultationContent.title,
  description: consultationContent.subtitle,
};

export default async function ConsultationPage() {
  const [formPlacement, bookingPlacement] = await Promise.all([
    loadResolvedSitePlacement("CONSULTATION_FORM"),
    loadResolvedSitePlacement("CONSULTATION_BOOKING"),
  ]);

  const hasForm = formPlacement.kind === "form";
  const hasBooking = bookingPlacement.kind === "booking";
  const hasInvalid =
    (formPlacement.kind === "none" && formPlacement.reason === "invalid") ||
    (bookingPlacement.kind === "none" &&
      bookingPlacement.reason === "invalid");
  const hasIntegration = hasForm || hasBooking || hasInvalid;

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
        primary: hasForm
          ? { label: "فرم مشاوره", href: "#consultation-form" }
          : hasBooking
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

        <SitePlacementSection
          placement={formPlacement}
          sectionId="consultation-form"
          fallbackHeading="فرم درخواست مشاوره"
          instanceId="consultation-form-embed"
        />

        <SitePlacementSection
          placement={bookingPlacement}
          sectionId="consultation-booking"
          fallbackHeading="رزرو نوبت مشاوره"
          instanceId="consultation-booking-embed"
        />

        {!hasForm && !hasBooking && !hasInvalid ? (
          <ContentCard
            heading="خدمات آنلاین مشاوره"
            body="فرم یا خدمت نوبت‌دهی مشاوره هنوز در پنل مدیریت (جایگاه‌های سایت) تنظیم نشده است. محتوای راهنما حفظ شده است."
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
