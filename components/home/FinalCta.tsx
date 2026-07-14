import { Container } from "@/components/ui/Container";
import {
  PhoneIcon,
  PhoneIconLinks,
  SocialIconLinks,
} from "@/components/ui/ContactIcons";
import { CtaPanel } from "@/components/ui/CtaPanel";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { finalCtaContent } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "final-cta-heading";

export function FinalCta() {
  const { contact } = finalCtaContent;

  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={finalCtaContent.eyebrow}
          heading={finalCtaContent.heading}
          description={finalCtaContent.description}
          headingId={headingId}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="premium-card p-6 lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-sm">
                <PhoneIcon className="size-4" />
              </span>
              <h3 className="text-lg font-semibold text-primary">تماس مستقیم</h3>
            </div>
            <PhoneIconLinks
              phones={contact.phones}
              formatValue={toPersianDigits}
            />
            <div className="mt-6 space-y-1 text-sm leading-7 text-muted">
              <p>{toPersianDigits(contact.hours.daily)}</p>
              <p>{toPersianDigits(contact.hours.thursday)}</p>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-medium tracking-wide text-secondary">
                شبکه‌های اجتماعی
              </p>
              <SocialIconLinks items={contact.social} className="mt-3 flex flex-wrap items-center gap-2.5" />
            </div>
          </div>

          <div className="premium-card p-6 lg:col-span-7">
            <h3 className="text-lg font-semibold text-primary">شعب مجموعه</h3>
            <ul className="mt-4 space-y-4">
              {contact.branches.map((branch) => (
                <li key={branch.name}>
                  <p className="text-sm font-semibold text-primary">
                    {branch.name}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-muted">
                    {toPersianDigits(branch.address)}
                  </p>
                  <a
                    href={branch.mapUrl}
                    className="mt-2 inline-block text-sm font-medium text-secondary transition-colors hover:text-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    مشاهده روی نقشه
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <CtaPanel
            heading={finalCtaContent.slogan}
            description="برای پیش‌ثبت‌نام، مشاوره تحصیلی یا بازدید از شعب، همین امروز با ما در ارتباط باشید."
            primary={{
              label: finalCtaContent.primaryLabel,
              href: finalCtaContent.primaryHref,
              variant: "secondary",
            }}
            secondary={{
              label: finalCtaContent.secondaryLabel,
              href: finalCtaContent.secondaryHref,
              variant: "outline",
            }}
          />
        </div>
      </Container>
    </Section>
  );
}
