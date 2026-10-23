/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { PageHero, SectionHead, Star, Eyebrow } from "@/components/site/Star";
import { StatsBand } from "@/components/site/cards";

export const metadata: Metadata = { title: "درباره ما", description: "داستان، مأموریت، چشم‌انداز و ارزش‌های مؤسسه علمی ستارگان نسیم‌شهر." };

export default async function About() {
  const { about, stats } = await getSettings();
  const f = about.founder;
  return (
    <>
      <PageHero eyebrow="درباره مؤسسه علمی ستارگان" title="بیش از یک دهه همراه دانش‌آموزان در مسیر موفقیت" text={about.intro} />
      <section className="container-x py-14">
        <StatsBand stats={stats} />
      </section>

      <section className="container-x grid gap-6 pb-14 md:grid-cols-2">
        <div className="card p-7">
          <Eyebrow>مأموریت</Eyebrow>
          <p className="mt-3 text-xl leading-10 font-bold text-navy">{about.mission}</p>
        </div>
        <div className="card bg-navy p-7 text-white">
          <Eyebrow tone="light">چشم‌انداز</Eyebrow>
          <p className="mt-3 text-xl leading-10 font-bold">{about.vision}</p>
        </div>
      </section>

      <section className="border-y border-line bg-paper py-16">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHead eyebrow="مسیر شکل‌گیری" title="داستان ستارگان" />
            <ol className="relative space-y-8 border-r-2 border-line pr-8">
              {about.timeline.map((t) => (
                <li key={t.year + t.title} className="relative">
                  <Star className="absolute top-1 -right-[2.62rem] size-5 bg-paper text-gold" />
                  <p className="text-sm font-bold text-gold-ink">{t.year}</p>
                  <p className="mt-1 text-lg font-extrabold text-navy">{t.title}</p>
                  {t.text && <p className="mt-1 leading-8 text-muted">{t.text}</p>}
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-2 gap-3 self-start">
            {about.images.slice(0, 4).map((im, i) => (
              <img key={im.src} src={im.src} alt={im.alt} loading="lazy" className={`w-full rounded-2xl object-cover ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16">
        <SectionHead eyebrow="ارزش‌ها" title="ارزش‌های بنیادین" text="اصولی که تصمیم‌گیری، آموزش و ارتباط ما با خانواده‌ها را شکل می‌دهد." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {about.values.map((v) => (
            <div key={v.title} className="card p-6">
              <p className="flex items-center gap-2 text-lg font-extrabold text-navy"><Star className="size-4 text-gold" />{v.title}</p>
              <p className="mt-2 leading-8 text-muted">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {f.name && (
        <section id="founder" className="container-x scroll-mt-24 pb-6">
          <div className="card grid items-center gap-8 overflow-hidden md:grid-cols-[0.7fr_1.3fr]">
            {f.photo && <img src={f.photo} alt={`پرتره ${f.name}`} loading="lazy" className="aspect-[4/5] size-full object-cover md:aspect-auto" />}
            <div className="p-7 md:py-10 md:pl-10 md:pr-0">
              <Eyebrow>مؤسس</Eyebrow>
              <h2 className="h-section mt-2">{f.name}</h2>
              <p className="mt-1 font-semibold text-edu">{f.title}</p>
              <p className="mt-4 leading-9">{f.bio}</p>
              <ul className="mt-5 space-y-2">
                {f.points.map((p) => <li key={p} className="flex gap-2"><Star className="mt-1.5 size-3.5 shrink-0 text-gold" />{p}</li>)}
              </ul>
              <Link href="/team" className="btn-ghost mt-7 text-sm">آشنایی با تیم</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
