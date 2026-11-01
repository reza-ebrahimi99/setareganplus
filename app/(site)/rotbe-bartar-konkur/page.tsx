/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageMeta, abs } from "@/lib/seo";
import { fa, toEn } from "@/lib/format";
import { sized } from "@/lib/img";
import { FIELDS, FIELD_ORDER, HONOR_TABS, byField, faText, honorTab, honorTabHref, latestHonors, toppers, type HonorTabKey } from "@/lib/honors";
import { PageHero, Icon, Star, Sparkle } from "@/components/site/Star";
import { JsonLd } from "@/components/site/JsonLd";
import { PhotoLightbox } from "@/components/site/PhotoLightbox";
import { AchievementTile, FieldHead, FieldIcon, HonorTabs, RankRow, TopperRow, FIELD_STYLE, type HonorAchievement } from "@/components/site/honors";

type SP = Promise<{ tab?: string | string[] }>;
type DbCat = "KONKUR" | "GIFTED";

const TAB_TEXT: Record<Exclude<HonorTabKey, "konkur">, { eyebrow: string; title: string; text: string; seoTitle: string; heading: string }> = {
  ghabooli: {
    eyebrow: "قبولی‌های دانشگاه",
    title: "قبولی‌های کنکور سال‌های قبل",
    text: "دانش‌آموزان ستارگان که با تلاش، برنامه‌ریزی و آزمون‌های منظم در رشته و دانشگاه دلخواهشان پذیرفته شدند.",
    seoTitle: "قبولی‌های کنکور دانش‌آموزان ستارگان نسیم‌شهر",
    heading: "رشته و دانشگاه قبولی",
  },
  tizhooshan: {
    eyebrow: "مدارس تیزهوشان و نمونه دولتی",
    title: "قبولی‌های تیزهوشان و نمونه دولتی",
    text: "دانش‌آموزان ستارگان که در آزمون ورودی مدارس تیزهوشان و نمونه دولتی پذیرفته شدند.",
    seoTitle: "قبولی‌های تیزهوشان و نمونه دولتی ستارگان نسیم‌شهر",
    heading: "مدرسهٔ قبولی",
  },
};

const catOf = (t: HonorTabKey) => HONOR_TABS.find((x) => x.key === t)?.category as DbCat | undefined;

/** Same order as /achievements: featured first, then the admin's sortOrder. */
function loadItems(category: DbCat, take?: number): Promise<HonorAchievement[]> {
  return prisma.achievement.findMany({
    where: { published: true, category },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, category: true, grade: true, detail: true, year: true, photo: true, featured: true },
    ...(take ? { take } : {}),
  });
}

async function loadCounts(): Promise<Record<DbCat, number>> {
  const rows = await prisma.achievement.groupBy({ by: ["category"], where: { published: true, category: { in: ["KONKUR", "GIFTED"] } }, _count: true });
  const n = (c: DbCat) => rows.find((r) => r.category === c)?._count ?? 0;
  return { KONKUR: n("KONKUR"), GIFTED: n("GIFTED") };
}

/** Groups by the admin "year" text (e.g. ۱۴۰۴-۱۴۰۵), newest first; entries without a year go last. */
function byYear(items: HonorAchievement[]): { year: string; items: HonorAchievement[] }[] {
  const m = new Map<string, HonorAchievement[]>();
  for (const a of items) {
    const k = faText(a.year);
    m.set(k, [...(m.get(k) ?? []), a]);
  }
  return [...m]
    .map(([year, items]) => ({ year, items }))
    .sort((a, b) => (a.year === "" ? 1 : b.year === "" ? -1 : toEn(b.year).localeCompare(toEn(a.year))));
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const tab = honorTab((await searchParams).tab);
  const cat = catOf(tab);
  if (tab === "konkur" || !cat) {
    const y = latestHonors();
    const img = y.banner ? [{ url: y.banner.large, width: y.banner.width, height: y.banner.height, alt: `رتبه‌های برتر کنکور ${fa(y.year)} قلم‌چی نسیم‌شهر` }] : undefined;
    return pageMeta("rotbeBartar", img ? { images: img } : {});
  }
  const t = TAB_TEXT[tab];
  const [items, counts] = await Promise.all([loadItems(cat, 3), loadCounts()]);
  const n = counts[cat];
  const sample = items.map((a) => faText(a.detail)).filter(Boolean).slice(0, 2).join("، ");
  const description =
    tab === "ghabooli"
      ? `${fa(n)} قبولی کنکور دانش‌آموزان مؤسسه علمی ستارگان نسیم‌شهر${sample ? `؛ از جمله ${sample}` : ""}.`
      : `${fa(n)} قبولی مدارس تیزهوشان و نمونه دولتی دانش‌آموزان مؤسسه علمی ستارگان نسیم‌شهر${sample ? `؛ از جمله ${sample}` : ""}.`;
  const photo = items.find((a) => a.photo)?.photo;
  return pageMeta("rotbeBartar", {
    title: t.seoTitle,
    description,
    path: honorTabHref(tab),
    ...(photo ? { images: [{ url: sized(photo, 960), alt: t.seoTitle }] } : {}),
  });
}

export default async function TopRanks({ searchParams }: { searchParams: SP }) {
  const tab = honorTab((await searchParams).tab);
  const cat = catOf(tab);
  const y = latestHonors();
  const top = toppers(y);
  const best = top.reduce((m, s) => (s.rank < m.rank ? s : m), top[0]);
  const fields = FIELD_ORDER.map((f) => ({ f, list: byField(y, f) })).filter((x) => x.list.length > 0);

  const [counts, items] = await Promise.all([loadCounts(), cat ? loadItems(cat) : Promise.resolve([] as HonorAchievement[])]);
  const tabCounts: Record<HonorTabKey, number> = { konkur: y.students.length, ghabooli: counts.KONKUR, tizhooshan: counts.GIFTED };
  const groups = byYear(items);
  const tt = tab === "konkur" ? null : TAB_TEXT[tab];

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: tt ? tt.seoTitle : `رتبه‌های برتر کنکور ${fa(y.year)} ${y.center}`,
    url: abs(honorTabHref(tab)),
    numberOfItems: tt ? items.length : y.students.length,
    itemListElement: tt
      ? items.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Person",
            name: a.name,
            ...(a.photo ? { image: abs(a.photo) } : {}),
            ...(a.detail ? { award: `قبولی ${faText(a.detail)}` } : {}),
            affiliation: { "@type": "EducationalOrganization", name: "مؤسسه علمی ستارگان نسیم‌شهر" },
          },
        }))
      : fields.flatMap(({ list }) => list).map((s, i) => ({
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

  // Computed from the data; a stat is hidden when its count is zero.
  const stats = [
    { v: fa(y.students.length), l: `رتبهٔ برتر کنکور ${fa(y.year)}`, n: y.students.length },
    { v: fa(best?.rank ?? ""), l: `بهترین رتبه (${best ? FIELDS[best.field].label : ""})`, n: best ? 1 : 0 },
    { v: fa(counts.KONKUR), l: "قبولی دانشگاه", n: counts.KONKUR },
    { v: fa(counts.GIFTED), l: "قبولی تیزهوشان و نمونه", n: counts.GIFTED },
  ].filter((s) => s.n > 0);

  // Photo cluster at the side of the hero (xl+, first tab only; DB photos are wide posters).
  const cluster = tt ? [] : top.slice(0, 3).map((s) => ({ key: s.name, src: s.photo ?? "", grad: FIELD_STYLE[s.field].grad, badge: `رتبهٔ ${fa(s.rank)}` }));

  return (
    <>
      <JsonLd data={ld} />
      <PageHero
        eyebrow={tt ? tt.eyebrow : `درخشش کانونی‌ها · کنکور ${fa(y.year)}`}
        crumbs={tt ? tt.title : "رتبه‌های برتر کنکور"}
        trail={[{ name: "افتخارات", href: "/achievements" }]}
        title={tt ? tt.title : `رتبه‌های برتر کنکور ${fa(y.year)} قلم‌چی نسیم‌شهر`}
        text={tt ? tt.text : `افتخار می‌کنیم به دانش‌آموزانی که با تلاش، برنامه‌ریزی و آزمون‌های منظم ${y.center} به رتبه‌های برتر کنکور رسیدند.`}
      >
        <dl className={`mt-8 grid max-w-3xl grid-cols-2 gap-3 ${stats.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          {stats.map((s) => (
            <div key={s.l} className="glass flex flex-col rounded-2xl px-4 py-3">
              <dt className="order-last text-[0.75rem] leading-5 text-white/65">{s.l}</dt>
              <dd className="text-[1.9rem] leading-tight font-black text-white">{s.v}</dd>
            </div>
          ))}
        </dl>
        {cluster.length === 3 && (
          <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-0 hidden -translate-y-1/2 xl:block 2xl:left-10">
            <div className="relative h-[17rem] w-[19rem]">
              {cluster.map((c, i) => (
                <div key={c.key} className={`absolute ${["top-0 right-20 z-10 w-36", "top-14 right-0 w-28 rotate-[5deg]", "top-14 left-0 w-28 -rotate-[5deg]"][i]}`}>
                  <div className={`rounded-[1.4rem] bg-gradient-to-br p-[3px] shadow-2xl shadow-black/40 ${c.grad}`}>
                    {c.src && <img src={c.src} alt="" width={480} height={600} className="aspect-[4/5] w-full rounded-[1.2rem] object-cover" />}
                  </div>
                  {c.badge && <span className={`absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-l px-3 py-1 text-sm font-black text-white shadow-lg ${c.grad}`}>{c.badge}</span>}
                </div>
              ))}
              <Sparkle className="animate-twinkle absolute -top-4 left-10 size-4 text-gold" />
            </div>
          </div>
        )}
        {!tt && (
          <nav aria-label="گروه‌های آزمایشی" className="mt-5 mb-4 flex flex-wrap gap-2">
            {fields.map(({ f }) => (
              <a key={f} href={`#${f}`} className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l px-3.5 py-1.5 text-sm font-bold text-white shadow-lg ${FIELD_STYLE[f].grad}`}>
                <FieldIcon field={f} className="size-4" /> {FIELDS[f].label}
              </a>
            ))}
          </nav>
        )}
      </PageHero>

      <HonorTabs active={tab} counts={tabCounts} />

      {tt ? (
        /* ───────── DB tabs: live from the admin panel ───────── */
        <section aria-labelledby="tab-title" className="container-x pt-12 sm:pt-16">
          <h2 id="tab-title" className="sr-only">{tt.title}</h2>
          {groups.length === 0 ? (
            <div className="card mx-auto max-w-lg p-10 text-center">
              <Star className="mx-auto size-12 text-royal/20" />
              <p className="mt-4 font-bold text-navy">به‌زودی فهرست این بخش منتشر می‌شود.</p>
            </div>
          ) : (
            <div className="grid gap-12 sm:gap-16">
              {groups.map((g) => (
                <div key={g.year || "other"}>
                  <div className="mb-5 flex items-center gap-3 sm:mb-7">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffc83d] to-gold text-navy shadow-lg">
                      <Icon name={tab === "ghabooli" ? "cap" : "trophy"} className="size-6" />
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-navy sm:text-2xl">{g.year ? <>سال تحصیلی <bdi dir="ltr">{g.year}</bdi></> : "سایر سال‌ها"}</h3>
                      <p className="text-xs font-semibold text-muted">{fa(g.items.length)} قبولی · {tt.heading}</p>
                    </div>
                    <span className="ms-auto hidden h-1.5 w-16 rounded-full bg-gold sm:block" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                    {g.items.map((a) => <AchievementTile key={a.id} a={a} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ───────── Toppers of each field ───────── */}
          <section aria-labelledby="toppers" className="container-x relative pt-12 sm:pt-16">
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
        </>
      )}

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
        <nav aria-label="سایر بخش‌ها" className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
          {HONOR_TABS.filter((t) => t.key !== tab).map((t) => (
            <Link key={t.key} href={honorTabHref(t.key)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 font-bold text-royal shadow-[var(--shadow-soft)] hover:border-royal/30">
              {t.label} <span className="text-muted">({fa(tabCounts[t.key])})</span> <Icon name="arrow" className="size-3.5" />
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
