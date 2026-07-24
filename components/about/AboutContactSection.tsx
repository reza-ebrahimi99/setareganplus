import Link from "next/link";
import { ScrollReveal } from "@/components/about/ScrollReveal";
import {
  BaleMark,
  InstagramIcon,
  MapLinkButton,
  MapPinIcon,
  PhoneIcon,
  PhoneIconLinks,
  SocialIconLinks,
} from "@/components/ui/ContactIcons";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MessageIcon } from "@/components/icons";
import { aboutContactSectionContent } from "@/content/about-page";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-contact-heading";

export function AboutContactSection() {
  const { eyebrow, heading, description, cards, emailNote, contact } =
    aboutContactSectionContent;

  return (
    <Section className="section-muted" ariaLabelledby={headingId}>
      <Container>
        <ScrollReveal>
          <SectionHeader
            eyebrow={eyebrow}
            heading={heading}
            description={description}
            headingId={headingId}
          />
        </ScrollReveal>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ScrollReveal as="li" delayMs={0}>
            <article className="premium-card flex h-full flex-col p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <PhoneIcon className="size-4" />
                </span>
                <h3 className="text-base font-semibold text-primary">
                  {cards[0].title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">
                {cards[0].description}
              </p>
              <PhoneIconLinks
                phones={contact.phones}
                formatValue={toPersianDigits}
              />
              <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm leading-7 text-muted">
                <p>{toPersianDigits(contact.hours.daily)}</p>
                <p>{toPersianDigits(contact.hours.thursday)}</p>
              </div>
            </article>
          </ScrollReveal>

          <ScrollReveal as="li" delayMs={70}>
            <article className="premium-card flex h-full flex-col p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <MapPinIcon className="size-4" />
                </span>
                <h3 className="text-base font-semibold text-primary">
                  {cards[1].title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">
                {cards[1].description}
              </p>
              <ul className="mt-4 space-y-4">
                {contact.branches.map((branch) => (
                  <li key={branch.name}>
                    <p className="text-sm font-semibold text-primary">
                      {branch.name}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {toPersianDigits(branch.address)}
                    </p>
                    <MapLinkButton href={branch.mapUrl} />
                  </li>
                ))}
              </ul>
            </article>
          </ScrollReveal>

          <ScrollReveal as="li" delayMs={140}>
            <article className="premium-card flex h-full flex-col p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <InstagramIcon className="size-4" />
                </span>
                <h3 className="text-base font-semibold text-primary">
                  {cards[2].title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">
                {cards[2].description}
              </p>
              <SocialIconLinks
                items={contact.social}
                className="mt-4 flex flex-wrap items-center gap-2.5"
              />
              {emailNote ? (
                <p className="mt-5 text-sm leading-7 text-muted">
                  {toPersianDigits(emailNote)}
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2 pt-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  <InstagramIcon className="size-3.5" />
                  Instagram
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  <BaleMark className="text-primary" />
                </span>
              </div>
            </article>
          </ScrollReveal>

          <ScrollReveal as="li" delayMs={210}>
            <article className="premium-card flex h-full flex-col p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <MessageIcon className="size-4" />
                </span>
                <h3 className="text-base font-semibold text-primary">
                  {cards[3].title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">
                {cards[3].description}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/consultation"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  درخواست مشاوره
                </Link>
                <Link
                  href="/pre-registration"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:border-secondary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  پیش‌ثبت‌نام
                </Link>
              </div>
            </article>
          </ScrollReveal>
        </ul>
      </Container>
    </Section>
  );
}
