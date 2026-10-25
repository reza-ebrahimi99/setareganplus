import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageMeta } from "@/lib/seo";
import { landingBase, findHl, latestNews } from "@/lib/landing";
import { listProducts } from "@/lib/shop/catalog";
import { AchievementCard } from "@/components/site/cards";
import { ProductCard } from "@/components/shop/ProductCard";
import { NewsCard } from "@/components/site/news";
import { Icon } from "@/components/site/Star";
import { Block, FaqBlock, LandingHero, RelatedGuides, WhereBlock, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("classes");
}

/** Levels are shown only if the education center lists that service (admin → مراکز). */
const LEVELS = [
  { id: "motevasete-aval", hl: "متوسطه اول", title: "کلاس تقویتی متوسطه اول", grades: ["هفتم", "هشتم", "نهم"], ach: null },
  { id: "tizhoshan", hl: "تیزهوشان", title: "آمادگی تیزهوشان و نمونه دولتی", grades: ["نهم"], ach: { category: "GIFTED" as const } },
  { id: "motevasete-dovom", hl: "متوسطه دوم", title: "کلاس تقویتی متوسطه دوم", grades: ["دهم", "یازدهم", "دوازدهم"], ach: null },
  { id: "konkur", hl: "کنکور", title: "کلاس کنکور", grades: ["دوازدهم", "فارغ‌التحصیل"], ach: { category: "KONKUR" as const } },
];

export default async function KelasTaghviati() {
  const { t, contact, hl, phone } = await landingBase("classes");
  const edu = hl("education");
  const levels = LEVELS.map((l) => ({ ...l, h: findHl(edu, l.hl) })).filter((l) => l.h);
  const fetched = await Promise.all(
    levels.map(async (l) => {
      const [books, ach] = await Promise.all([
        Promise.all(l.grades.map((g) => listProducts({ grade: g }, 8).catch(() => []))).then((x) => x.flat()),
        l.ach ? prisma.achievement.findMany({ where: { published: true, ...l.ach }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 3 }) : [],
      ]);
      return { ...l, books, ach };
    }),
  );
  // a booklet is shown once, under the first level it belongs to
  const seen = new Set<string>();
  const data = fetched.map((l) => ({ ...l, books: l.books.filter((b) => !seen.has(b.id) && seen.add(b.id)).slice(0, 4) }));
  const news = await latestNews(["CLASSES"]);

  const faq = [
    levels.length > 0 && { q: "کلاس تقویتی برای چه پایه‌هایی برگزار می‌شود؟", a: `آموزشگاه ستارگان در این بخش‌ها فعال است: ${levels.map((l) => l.h!.title).join("، ")}.` },
    { q: "برنامه و زمان کلاس‌ها را از کجا بدانم؟", a: `برنامهٔ هر دوره در بخش «اخبار و اطلاعیه‌ها» (دستهٔ کلاس‌ها) منتشر می‌شود.${phone ? ` برای اطلاع دقیق می‌توانید با ${phonesSentence(contact)} تماس بگیرید.` : ""}` },
    { q: "چطور ثبت‌نام کنم؟", a: "فرم پیش‌ثبت‌نام آنلاین را پر کنید و پایه و بخش موردنظر را انتخاب کنید؛ همکاران ما برای ادامهٔ مراحل با شما تماس می‌گیرند." },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="classes" title="کلاس تقویتی در نسیم‌شهر به تفکیک پایه" intro={t.intro} phone={phone} accent="edu" />
      {levels.length > 1 && (
        <nav aria-label="پایه‌ها" className="container-x mt-8 flex flex-wrap gap-2">
          {levels.map((l) => <a key={l.id} href={`#${l.id}`} className="chip bg-paper px-4 py-2 text-sm text-navy ring-1 ring-line hover:ring-navy/30">{l.h!.title}</a>)}
        </nav>
      )}
      {data.map((l, i) => (
        <Block key={l.id} id={l.id} eyebrow={l.grades.join("، ")} title={l.title} text={l.h!.text || undefined} tone={i % 2 ? "paper" : "plain"}>
          {l.books.length > 0 && (
            <>
              <h3 className="mb-4 font-extrabold text-navy">جزوه‌های این مقطع</h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{l.books.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            </>
          )}
          {l.ach.length > 0 && (
            <>
              <h3 className="mt-8 mb-4 font-extrabold text-navy">از نتایج دانش‌آموزان</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{l.ach.map((a) => <AchievementCard key={a.id} a={a} />)}</div>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="btn-gold px-5 py-2.5 text-sm">پیش‌ثبت‌نام</Link>
            {l.id === "konkur" && <Link href="/konkur-nasimshahr" className="btn-ghost px-5 py-2.5 text-sm">راهنمای کنکور در نسیم‌شهر <Icon name="arrow" className="size-4" /></Link>}
          </div>
        </Block>
      ))}
      {news.length > 0 && (
        <Block eyebrow="اطلاعیه‌ها" title="اطلاعیه‌های کلاس‌ها">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{news.map((n) => <NewsCard key={n.id} n={n} />)}</div>
        </Block>
      )}
      <WhereBlock contact={contact} />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ کلاس‌های تقویتی" />
      <RelatedGuides current="classes" />
    </>
  );
}
