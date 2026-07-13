import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { officialSlogan, partnershipContent } from "@/content/home";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";

const headingId = "partnership-heading";

function LogoFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-16 items-center justify-center rounded-xl border border-border bg-surface px-4 text-center text-xs font-semibold text-primary"
    >
      {label}
    </div>
  );
}

export function PartnershipSection() {
  const { logos } = partnershipContent;

  return (
    <Section
      className="section-muted border-y border-border"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow={partnershipContent.eyebrow}
          heading={partnershipContent.heading}
          description={partnershipContent.description}
          headingId={headingId}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <div className="premium-card p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                {hasMediaUrl(logos.institution) ? (
                  <MediaImage
                    media={logos.institution}
                    width={160}
                    height={64}
                    className="mx-auto h-14 w-auto object-contain"
                  />
                ) : (
                  <LogoFallback label="ستارگان پلاس" />
                )}
                {hasMediaUrl(logos.ghalamchi) ? (
                  <MediaImage
                    media={logos.ghalamchi}
                    width={160}
                    height={64}
                    className="mx-auto h-14 w-auto object-contain"
                  />
                ) : (
                  <LogoFallback label="قلم‌چی نسیم‌شهر" />
                )}
              </div>
              <p className="mt-6 text-base leading-8 text-muted">
                {toPersianDigits(partnershipContent.statement)}
              </p>
              <p className="mt-4 text-lg font-medium text-secondary">
                {officialSlogan}
              </p>
              <div className="mt-6">
                <Link
                  href={partnershipContent.externalLink.href}
                  className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {partnershipContent.externalLink.label}
                </Link>
              </div>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {partnershipContent.benefits.map((benefit) => (
              <li key={benefit.title}>
                <FeatureCard
                  title={benefit.title}
                  description={benefit.description}
                  badge={benefit.badge}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <Button href="/about" variant="outline">
            بیشتر درباره مجموعه
          </Button>
        </div>
      </Container>
    </Section>
  );
}
