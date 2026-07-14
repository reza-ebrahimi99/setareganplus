import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { hasMediaUrl } from "@/lib/media";
import { aboutContent, institutionEntities } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-heading";

function AboutCampusFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[16rem] flex-col items-center justify-center bg-primary/[0.04] px-6 text-center"
    >
      <p className="text-xs font-medium tracking-wide text-secondary">
        فضای آموزشی
      </p>
      <p className="mt-3 max-w-sm text-sm font-medium leading-7 text-primary">
        {toPersianDigits(label)}
      </p>
    </div>
  );
}

export function AboutSection() {
  const { setareganAyandeh } = institutionEntities;
  const { schoolSection } = aboutContent;
  const { stats } = schoolSection;

  const highlightFacts = [
    { label: "سال تأسیس", value: toPersianDigits(stats.foundedYear) },
    { label: "کلاس درس", value: toPersianDigits(stats.classrooms) },
    { label: "دبیر", value: toPersianDigits(stats.teachers) },
  ] as const;

  const outcomeFacts = [
    { label: "فارغ‌التحصیل", value: toPersianDigits(stats.graduates) },
    {
      label: "قبولی تیزهوشان",
      value: toPersianDigits(stats.giftedAdmissions),
    },
  ] as const;

  return (
    <Section ariaLabelledby={headingId}>
      <Container>
        <SectionHeader
          eyebrow={aboutContent.eyebrow}
          heading={aboutContent.heading}
          description={aboutContent.description}
          headingId={headingId}
        />

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <figure className="relative overflow-hidden rounded-2xl border border-border bg-primary/[0.03] lg:col-span-7">
            <div className="relative aspect-[16/11] sm:aspect-[16/10]">
              {hasMediaUrl(aboutContent.cover) ? (
                <MediaImage
                  media={aboutContent.cover}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 640px"
                />
              ) : (
                <AboutCampusFallback label={aboutContent.cover.alt} />
              )}
            </div>
            <figcaption className="border-t border-border bg-surface px-4 py-3 text-xs leading-6 text-muted sm:px-5">
              {toPersianDigits(aboutContent.cover.alt)}
            </figcaption>
          </figure>

          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-wide text-secondary">
              {setareganAyandeh.role}
            </p>
            <h3 className="mt-2 text-xl font-bold text-primary sm:text-2xl">
              {toPersianDigits(setareganAyandeh.name)}
            </h3>
            <p className="mt-4 text-sm leading-8 text-muted sm:text-base">
              {toPersianDigits(aboutContent.lead)}
            </p>

            <dl className="mt-7 grid grid-cols-3 gap-3 border-y border-border py-5">
              {highlightFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.7rem] font-medium text-muted sm:text-xs">
                    {fact.label}
                  </dt>
                  <dd className="mt-1.5 text-xl font-bold text-primary sm:text-2xl">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <p className="text-xs font-medium tracking-wide text-secondary">
                امکانات دبستان
              </p>
              <ul className="mt-3 space-y-3">
                {stats.facilities.map((facility) => (
                  <li
                    key={facility.title}
                    className="border-s-2 border-secondary/50 ps-3"
                  >
                    <p className="text-sm font-semibold text-primary">
                      {toPersianDigits(facility.title)}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-muted">
                      {toPersianDigits(facility.description)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <div className="rounded-2xl border border-border bg-surface px-5 py-5 sm:px-6 lg:col-span-7">
            <p className="text-xs font-medium tracking-wide text-secondary">
              {schoolSection.heading}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              {toPersianDigits(schoolSection.description)}
            </p>
            <dl className="mt-5 flex flex-wrap gap-6 sm:gap-10">
              {outcomeFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-medium text-muted">{fact.label}</dt>
                  <dd className="mt-1 text-3xl font-bold text-secondary">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-5">
            <p className="text-sm leading-8 text-muted">
              {toPersianDigits(aboutContent.relatedNote)}
            </p>
            <div className="mt-5">
              <Button href={aboutContent.cta.href} variant="outline">
                {aboutContent.cta.label}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
