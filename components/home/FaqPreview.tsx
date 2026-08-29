import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { faqPreviewContent, faqPreviewItems } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "faq-preview-heading";

export function FaqPreview() {
  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={faqPreviewContent.eyebrow}
          heading={faqPreviewContent.heading}
          description={faqPreviewContent.description}
          headingId={headingId}
          action={
            <Button href="/faq" variant="outline" className="w-full sm:w-auto">
              همه سوالات
            </Button>
          }
        />

        <div className="mt-8 space-y-4">
          {faqPreviewItems.map((item) => (
            <details key={item.question} className="premium-card group">
              <summary className="cursor-pointer list-none px-6 py-4 text-base font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
                {toPersianDigits(item.question)}
              </summary>
              <div className="border-t border-border px-6 py-4">
                <p className="text-base leading-8 text-muted">
                  {toPersianDigits(item.answer)}
                </p>
              </div>
            </details>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted">
          <Link
            href="/faq"
            className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            مشاهده صفحه سوالات متداول
          </Link>
        </p>
      </Container>
    </Section>
  );
}
