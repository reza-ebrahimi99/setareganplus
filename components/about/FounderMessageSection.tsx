import Image from "next/image";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutFounderContent } from "@/content/about-page";
import { hasMediaUrl } from "@/lib/media";
import { toPersianDigits } from "@/lib/persian";

const headingId = "founder-message-heading";

function PortraitFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[22rem] flex-col items-center justify-center bg-gradient-to-br from-primary/[0.05] via-surface to-secondary/10 p-8 text-center"
    >
      <div className="flex size-24 items-center justify-center rounded-full border border-secondary/35 bg-surface text-2xl font-bold text-primary">
        ر.ا
      </div>
      <p className="mt-4 text-sm font-semibold text-primary">
        {aboutFounderContent.name}
      </p>
    </div>
  );
}

export function FounderMessageSection() {
  const {
    eyebrow,
    heading,
    name,
    roles,
    portrait,
    message,
    signature,
    signatureRole,
  } = aboutFounderContent;

  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <ScrollReveal>
          <SectionHeader
            eyebrow={eyebrow}
            heading={heading}
            headingId={headingId}
          />
        </ScrollReveal>

        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-12 lg:gap-10">
          <ScrollReveal className="lg:col-span-5" delayMs={60}>
            <figure className="founder-portrait-frame relative h-full overflow-hidden rounded-2xl border border-border bg-white">
              <div className="relative aspect-[4/5] w-full lg:aspect-auto lg:h-full lg:min-h-[28rem]">
                {hasMediaUrl(portrait) ? (
                  <Image
                    src={portrait.url}
                    alt={portrait.alt}
                    fill
                    className="object-cover object-top transition-transform duration-700 ease-out hover:scale-[1.03] motion-reduce:hover:scale-100"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                ) : (
                  <PortraitFallback />
                )}
              </div>
              <figcaption className="border-t border-border bg-surface px-5 py-4">
                <p className="font-semibold text-primary">
                  {toPersianDigits(name)}
                </p>
                <ul className="mt-2 space-y-1">
                  {roles.map((role) => (
                    <li key={role} className="text-xs leading-6 text-muted">
                      {toPersianDigits(role)}
                    </li>
                  ))}
                </ul>
              </figcaption>
            </figure>
          </ScrollReveal>

          <ScrollReveal className="lg:col-span-7" delayMs={120}>
            <div className="premium-card flex h-full flex-col justify-between p-6 sm:p-8">
              <div className="space-y-5">
                {message.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 28)}
                    className="text-base leading-8 text-muted sm:text-lg sm:leading-9"
                  >
                    {toPersianDigits(paragraph)}
                  </p>
                ))}
              </div>

              <footer className="mt-10 border-t border-border pt-6">
                <p
                  className="text-2xl font-semibold text-primary"
                  style={{ fontFamily: "var(--font-vazirmatn), Vazirmatn, Tahoma, sans-serif" }}
                >
                  {toPersianDigits(signature)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {toPersianDigits(signatureRole)}
                </p>
              </footer>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </Section>
  );
}
