import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MediaImage } from "@/components/ui/MediaImage";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { hasMediaUrl } from "@/lib/media";
import type { MediaAsset } from "@/lib/media";
import { aboutContent, institutionEntities } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-heading";
const branchesHeadingId = "qalamchi-branches-heading";

function BranchImageFallback({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[14rem] flex-col items-center justify-center bg-primary/[0.04] px-6 text-center"
    >
      <p className="text-xs font-medium tracking-wide text-secondary">
        نمایندگی قلم‌چی
      </p>
      <p className="mt-3 text-sm font-medium leading-7 text-primary">
        {toPersianDigits(label)}
      </p>
    </div>
  );
}

function BranchCard({
  title,
  description,
  media,
}: {
  title: string;
  description: string;
  media: MediaAsset;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_12px_28px_rgb(15_23_42_/_0.06)]">
      <div className="relative aspect-[16/11] overflow-hidden bg-primary/[0.03]">
        {hasMediaUrl(media) ? (
          <MediaImage
            media={media}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <BranchImageFallback label={media.alt} />
        )}
      </div>
      <div className="flex flex-1 flex-col border-t border-border px-5 py-4 sm:px-6 sm:py-5">
        <p className="text-[0.7rem] font-medium tracking-wide text-secondary sm:text-xs">
          نمایندگی رسمی
        </p>
        <h4 className="mt-1.5 text-lg font-bold text-primary sm:text-xl">
          {toPersianDigits(title)}
        </h4>
        <p className="mt-2 text-sm leading-7 text-muted">
          {toPersianDigits(description)}
        </p>
      </div>
    </article>
  );
}

export function AboutSection() {
  const { setareganAyandeh } = institutionEntities;
  const { schoolSection, branches } = aboutContent;
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

        <section aria-labelledby={branchesHeadingId} className="mt-10">
          <header className="max-w-2xl">
            <h3
              id={branchesHeadingId}
              className="text-xl font-bold text-primary sm:text-2xl"
            >
              {toPersianDigits(branches.heading)}
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted sm:text-base sm:leading-8">
              {toPersianDigits(branches.description)}
            </p>
          </header>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            {branches.items.map((branch) => (
              <BranchCard
                key={branch.title}
                title={branch.title}
                description={branch.description}
                media={branch.media}
              />
            ))}
          </div>
        </section>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
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

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border bg-surface px-5 py-5 sm:px-6">
              <p className="text-xs font-medium tracking-wide text-secondary">
                {schoolSection.heading}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {toPersianDigits(schoolSection.description)}
              </p>
              <dl className="mt-5 flex flex-wrap gap-6 sm:gap-10">
                {outcomeFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs font-medium text-muted">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-3xl font-bold text-secondary">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="mt-5 text-sm leading-8 text-muted">
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
