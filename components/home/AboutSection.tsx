import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ContentCard } from "@/components/ui/ContentCard";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { hasMediaUrl } from "@/lib/media";
import {
  aboutContent,
  institutionEntities,
} from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-heading";

function formatEntityBody(role: string, description: string) {
  return `${role}. ${description}`;
}

function AboutCampusFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary/8 via-background to-secondary/12 px-6 text-center"
    >
      <div className="rounded-full border border-secondary/30 bg-surface px-4 py-1 text-xs font-medium text-secondary shadow-sm">
        فضای آموزشی
      </div>
      <p className="mt-4 max-w-xs text-sm font-medium leading-7 text-primary">
        {toPersianDigits(label)}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2 opacity-80">
        <span className="h-2 rounded-full bg-secondary/50" />
        <span className="h-2 rounded-full bg-primary/20" />
        <span className="h-2 rounded-full bg-secondary/30" />
      </div>
    </div>
  );
}

export function AboutSection() {
  const { setareganPlus, ghalamchiBranch, setareganAyandeh } =
    institutionEntities;
  const { schoolSection } = aboutContent;
  const { stats } = schoolSection;

  const schoolStatItems = [
    { label: "سال تأسیس", value: toPersianDigits(stats.foundedYear) },
    { label: "کلاس درس", value: toPersianDigits(stats.classrooms) },
    { label: "دبیر", value: toPersianDigits(stats.teachers) },
    { label: "فارغ‌التحصیل", value: toPersianDigits(stats.graduates) },
    { label: "قبولی تیزهوشان", value: toPersianDigits(stats.giftedAdmissions) },
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

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <ContentCard
            heading={setareganPlus.name}
            body={formatEntityBody(setareganPlus.role, setareganPlus.description)}
            media={aboutContent.cover}
            imageFallback={
              hasMediaUrl(aboutContent.cover) ? undefined : (
                <AboutCampusFallback label={aboutContent.cover.alt} />
              )
            }
          />
          <ContentCard
            heading={ghalamchiBranch.name}
            body={formatEntityBody(
              ghalamchiBranch.role,
              ghalamchiBranch.description,
            )}
          />
        </div>

        <section
          aria-labelledby="school-section-heading"
          className="mt-10 rounded-2xl border border-border bg-background p-6 sm:p-8"
        >
          <header className="max-w-3xl">
            <h3
              id="school-section-heading"
              className="text-xl font-bold text-primary sm:text-2xl"
            >
              {schoolSection.heading}
            </h3>
            <p className="mt-3 text-base leading-8 text-muted">
              {toPersianDigits(schoolSection.description)}
            </p>
          </header>

          <div className="mt-6">
            <ContentCard
              heading={setareganAyandeh.name}
              body={formatEntityBody(
                setareganAyandeh.role,
                setareganAyandeh.description,
              )}
            />
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {schoolStatItems.map((item) => (
              <div key={item.label} className="premium-card p-4">
                <dt className="text-xs font-medium text-muted">{item.label}</dt>
                <dd className="mt-2 text-2xl font-bold text-secondary">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {stats.facilities.map((facility) => (
              <li key={facility.title}>
                <ContentCard
                  heading={facility.title}
                  body={facility.description}
                />
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          <Button href={aboutContent.cta.href} variant="outline">
            {aboutContent.cta.label}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
