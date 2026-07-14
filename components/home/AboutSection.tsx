import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { aboutContent, institutionEntities } from "@/content/home";
import { toPersianDigits } from "@/lib/persian";

const headingId = "about-heading";

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
    <section
      aria-labelledby={headingId}
      className="relative w-full border-y border-slate-200 bg-[#F8FAFC] py-14 sm:py-20"
    >
      <Container>
        <SectionHeader
          eyebrow={aboutContent.eyebrow}
          heading="دبستان غیردولتی ستارگان آینده"
          description={aboutContent.description}
          headingId={headingId}
        />

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
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
            <div className="rounded-2xl border border-border bg-slate-50 px-5 py-5 sm:px-6">
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
    </section>
  );
}
