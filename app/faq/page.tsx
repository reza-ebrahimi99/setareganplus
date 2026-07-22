import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { ContentCard } from "@/components/ui/ContentCard";
import { registrationNotice } from "@/content/site";
import { faqContent } from "@/content/faq";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("faq");

export default function FaqPage() {
  return (
    <InnerPageLayout
      activePath="/faq"
      breadcrumbs={faqContent.breadcrumbs}
      title={faqContent.title}
      subtitle={faqContent.subtitle}
      eyebrow="پشتیبانی اطلاعاتی"
      cta={{
        heading: "سؤال دیگری دارید؟",
        description:
          "برای آشنایی با مسیر پیش‌ثبت‌نام یا ارتباط با مرکز، صفحات مرتبط را ببینید.",
        primary: { label: "پیش‌ثبت‌نام", href: "/pre-registration" },
        secondary: { label: "تماس", href: "/contact" },
      }}
    >
      <div className="space-y-4">
        {faqContent.items.map((item) => (
          <details key={item.question} className="premium-card group">
            <summary className="cursor-pointer list-none px-6 py-4 text-base font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
              {item.question}
            </summary>
            <div className="border-t border-border px-6 py-4">
              <p className="text-base leading-8 text-muted">{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
      <div className="mt-8">
        <ContentCard
          heading={registrationNotice.heading}
          body={registrationNotice.body}
          variant="notice"
        />
      </div>
    </InnerPageLayout>
  );
}
