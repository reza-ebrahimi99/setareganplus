import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { faqPreviewContent, faqPreviewItems } from "@/content/home";

export function FaqPreview() {
  return (
    <Section ariaLabelledby="faq-preview-heading">
      <Container>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2
              id="faq-preview-heading"
              className="text-2xl font-bold text-primary sm:text-3xl"
            >
              {faqPreviewContent.heading}
            </h2>
            <p className="mt-3 text-base leading-8 text-muted">
              {faqPreviewContent.description}
            </p>
          </div>
          <Button href="/faq" variant="outline" className="w-full sm:w-auto">
            همه سوالات
          </Button>
        </div>
        <div className="mt-8 space-y-4">
          {faqPreviewItems.map((item) => (
            <article key={item.question} className="premium-card p-5">
              <h3 className="text-base font-semibold text-primary">
                {item.question}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted">{item.answer}</p>
            </article>
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
