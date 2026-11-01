/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta, abs } from "@/lib/seo";
import { fa } from "@/lib/format";
import { FIELDS, FIELD_ORDER, HONORS_PATH, byField, latestHonors, toppers } from "@/lib/honors";
import { PageHero, Icon, Star, Sparkle } from "@/components/site/Star";
import { JsonLd } from "@/components/site/JsonLd";
import { PhotoLightbox } from "@/components/site/PhotoLightbox";
import { FieldHead, FieldIcon, RankRow, TopperRow, FIELD_STYLE } from "@/components/site/honors";

export async function generateMetadata(): Promise<Metadata> {
  const y = latestHonors();
  const img = y.banner ? [{ url: y.banner.large, width: y.banner.width, height: y.banner.height, alt: `رتبه‌های برتر کنکور ${fa(y.year)} قلم‌چی نسیم‌شهر` }] : undefined;
  return pageMeta("rotbeBartar", img ? { images: img } : {});
}

export default function TopRanks() {
  const y = latestHonors();
  const top = toppers(y);
  const best = top.reduce((m, s) => (s.rank < m.rank ? s : m), top[0]);
  const fields = FIELD_ORDER.map((f) => ({ f, list: byField(y, f) })).filter((x) => x.list.length > 0);
  const under1000 = y.students.filter((s) => s.rank < 1000).length;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `رتبه‌های برتر کنکور ${fa(y.year)} ${y.center}`,
    url: abs(HONORS_PATH),
    numberOfItems: y.students.length,
    itemListElement: fields.flatMap(({ list }) => list).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: s.name,
        ...(s.photo ? { image: abs(s.photo) } : {}),
        award: `رتبهٔ ${fa(s.rank)} کنکور ${fa(y.year)} گروه ${FIELDS[s.field].label}`,
        affiliation: { "@type": "EducationalOrganization", name: "مؤسسه علمی ستارگان نسیم‌شهر" },
      },
    })),
  };

  const stats = [
    { v: fa(y.students.length), l: "رتبهٔ برتر" },
    { v: fa(best?.rank ?? ""), l: `بهترین رتبه (${best ? FIELDS[best.field].label : ""})` },
    { v: fa(under1000), l: "رتبهٔ زیر ۱۰۰۰" },
    { v: fa(fields.length), l: "گروه آزمایشی" },
  ];

  return (
    <>
      <JsonLd data={ld} />
      <PageHero
        eyebrow={`درخشش کانونی‌ها · کنکور ${fa(y.year)}`}
        crumbs="رتبه‌های برتر کنکور"
        trail={[{ name: "افتخارات", href: "/achievements" }]}
        title={`رتبه‌های برتر کنکور ${fa(y.year)} قلم‌چی نسیم‌شهر`}
        text={`افتخار می‌کنیم به دانش‌آموزانی که با تلاش، برنامه‌ریزی و آزمون‌های منظم ${y.center} به رتبه‌های برتر کنکور رسیدند.`}
      >
        <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="glass flex flex-col rounded-2xl px-4 py-3">
              <dt className="order-last text-[0.75rem] leading-5 text-white/65">{s.l}</dt>
              <dd className="text-[1.9rem] leading-tight font-black text-white">{s.v}</dd>
            </div>
          ))}
        </dl>
        <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-0 hidden -translate-y-1/2 xl:block 2xl:left-10">
          <div className="relative h-[17rem] w-[19rem]">
            {top.slice(0, 3).map((s, i) => (
              <div key={s.name} className={`absolute ${["top-0 right-20 z-10 w-36", "top-14 right-0 w-28 rotate-[5deg]", "top-14 left-0 w-28 -rotate-[5deg]"][i]}`}>
                <div className={`rounded-[1.4rem] bg-gradient-to-br p-[3px] shadow-2xl shadow-black/40 ${FIELD_STYLE[s.field].grad}`}>
                  {s.photo && <img src={s.photo} alt="" width={480} height={600} className="aspect-[4/5] w-full rounded-[1.2rem] object-cover" />}
                </div>
                <span className={`absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-l px-3 py-1 text-sm font-black text-white shadow-lg ${FIELD_STYLE[s.field].grad}`}>رتبهٔ {fa(s.rank)}</span>
              </div>
            ))}
            <Sparkle className="animate-twinkle absolute -top-4 left-10 size-4 text-gold" />
          </div>
        </div>
        <nav aria-label="گروه‌های آزمایشی" className="mt-5 flex flex-wrap gap-2">
          {fields.map(({ f }) => (
            <a key={f} href={`#${f}`} className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l px-3.5 py-1.5 text-sm font-bold text-white shadow-lg ${FIELD_STYLE[f].grad}`}>
              <FieldIcon field={f} className="size-4" /> {FIELDS[f].label}
            </a>
          ))}
        </nav>
      </PageHero>

      {/* ───────── Toppers of each field ───────── */}
      <section aria-labelledby="toppers" className="container-x relative pt-14 sm:pt-20">
        <div className="reveal mb-8 text-center sm:mb-10">
          <span className="eyebrow"><Icon name="trophy" className="size-3.5 text-gold" />برترین‌های هر گروه</span>
          <h2 id="toppers" className="h-section mt-3">ستاره‌های <span className="text-gradient-blue">کنکور {fa(y.year)}</span></h2>
        </div>
        <TopperRow top={top} year={y.year} />
      </section>

      {/* ───────── All ranks by field ───────── */}
      <section aria-label="رتبه‌ها به تفکیک گروه آزمایشی" className="container-x pt-16 sm:pt-24">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-7">
          {fields.map(({ f, list }) => (
            <div key={f} id={f} className="scroll-mt-28">
              <FieldHead field={f} count={list.length} />
              <ol className="grid gap-3">
                {list.map((s, i) => <RankRow key={s.name} s={s} place={i + 1} />)}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Official banner + CTA ───────── */}
      <section className="container-x pt-16 sm:pt-24">
        <div className="reveal bg-hero relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-10 lg:p-12">
          <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" />
          <Star filled={false} className="pointer-events-none absolute -bottom-16 -left-16 size-80 text-white/[0.07]" />
          <Sparkle className="animate-twinkle pointer-events-none absolute top-8 left-[45%] size-3 text-gold" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_minmax(0,440px)] lg:gap-12">
            <div>
              <span className="eyebrow !border-white/15 !bg-white/10 !text-white/85 !shadow-none"><Star className="size-3.5 text-gold" />مسیر بعدی، شاید شما</span>
              <h2 className="mt-3 text-[1.7rem] leading-snug font-black sm:text-[2.3rem]">رتبهٔ برتر <span className="text-gradient">کنکور بعدی</span> را با هم بسازیم</h2>
              <p className="mt-4 max-w-xl leading-8 text-white/75">آزمون‌های منظم قلم‌چی، کلاس‌های کنکور و مشاورهٔ تحصیلی ستارگان در نسیم‌شهر، در دو شعبهٔ جداگانهٔ دختران و پسران.</p>
              <ul className="mt-6 grid gap-2.5 text-sm sm:grid-cols-2">
                {["آزمون‌های جامع و مرحله‌ای قلم‌چی", "تحلیل کارنامه و برنامه‌ریزی", "کلاس کنکور و جمع‌بندی", "جزوه‌های مدرسان ستارگان"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold"><Icon name="check" className="size-3.5" strokeWidth={2.6} /></span>{t}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn-gold px-6 py-3 text-base">پیش‌ثبت‌نام آنلاین</Link>
                <Link href="/ghalamchi" className="btn glass px-5 py-3 text-base text-white hover:bg-white/15"><Icon name="book" className="size-5" />آزمون‌های قلم‌چی</Link>
                <Link href="/shop" className="btn glass px-5 py-3 text-base text-white hover:bg-white/15"><Icon name="bag" className="size-5" />خرید جزوه</Link>
              </div>
            </div>
            {y.banner && (
              <figure className="mx-auto w-full max-w-[440px]">
                <div className="rotate-[1.5deg] rounded-[1.4rem] bg-gradient-to-br from-[#ffe08a] via-gold to-[#c98a00] p-[5px] shadow-2xl shadow-black/40">
                  <div className="overflow-hidden rounded-[1.15rem] bg-white">
                    <PhotoLightbox full={y.banner.large} alt={`پوستر رتبه‌های برتر کنکور ${fa(y.year)} قلم‌چی نسیم‌شهر`} label="مشاهدهٔ بزرگ‌تر پوستر رتبه‌های برتر">
                      <img src={y.banner.src} srcSet={`${y.banner.src} 720w, ${y.banner.large} 1200w`} sizes="(min-width: 1024px) 440px, 92vw" alt={`پوستر «درخشش کانونی‌ها»؛ رتبه‌های برتر کنکور ${fa(y.year)} قلم‌چی نسیم‌شهر`} width={y.banner.width} height={y.banner.height} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                    </PhotoLightbox>
                  </div>
                </div>
                <figcaption className="mt-4 text-center text-xs text-white/60">پوستر رسمی «درخشش کانونی‌ها» · {y.center}</figcaption>
              </figure>
            )}
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          قبولی‌های مدارس تیزهوشان و نمونه دولتی و سایر افتخارات را در <Link href="/achievements" className="font-bold text-royal hover:underline">صفحهٔ افتخارات</Link> ببینید.
        </p>
      </section>
    </>
  );
}
