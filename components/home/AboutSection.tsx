import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
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
      className="relative w-full border-y border-slate-300 bg-[#EAF2F8] py-16 sm:py-24"
    >
      <Container>
        <header className="max-w-3xl">
          <p className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium tracking-wide text-primary shadow-sm">
            {toPersianDigits(aboutContent.eyebrow)}
          </p>
          <h2
            id={headingId}
            className="mt-4 text-2xl font-bold text-primary sm:text-3xl"
          >
            {toPersianDigits(aboutContent.heading)}
          </h2>
          <div
            aria-hidden="true"
            className="mt-4 h-1 w-14 rounded-full bg-primary/70"
          />
          <p className="mt-4 text-base leading-8 text-muted">
            {toPersianDigits(aboutContent.description)}
          </p>
        </header>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-medium tracking-wide text-primary/70">
                {setareganAyandeh.role}
              </p>
              <h3 className="mt-2 text-xl font-bold text-primary sm:text-2xl">
                {toPersianDigits(setareganAyandeh.name)}
              </h3>
              <p className="mt-4 text-sm leading-8 text-muted sm:text-base">
                {toPersianDigits(aboutContent.lead)}
              </p>

              <dl className="mt-7 grid grid-cols-3 gap-3 border-y border-slate-200 py-5">
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
                <p className="text-xs font-medium tracking-wide text-primary/70">
                  امکانات دبستان
                </p>
                <ul className="mt-3 space-y-3">
                  {stats.facilities.map((facility) => (
                    <li
                      key={facility.title}
                      className="border-s-2 border-primary/35 ps-3"
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

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
              <p className="text-xs font-medium tracking-wide text-primary/70">
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
                    <dd className="mt-1 text-3xl font-bold text-primary">
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
