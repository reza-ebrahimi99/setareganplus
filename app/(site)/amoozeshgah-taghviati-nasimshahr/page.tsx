import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { pageMeta } from "@/lib/seo";
import { fa } from "@/lib/format";
import { landingBase, latestNews } from "@/lib/landing";
import { AchievementCard, StatsBand } from "@/components/site/cards";
import { NewsCard } from "@/components/site/news";
import { Block, FaqBlock, FeatureGrid, LandingHero, RelatedGuides, WhereBlock, branchesSentence, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("amoozeshgah");
}

export default async function Amoozeshgah() {
  const { t, contact, center, hl, phone } = await landingBase("amoozeshgah");
  const edu = center("education");
  const services = hl("education");
  const [{ stats }, ach, news] = await Promise.all([
    getSettings(),
    prisma.achievement.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 6 }),
    latestNews(["CLASSES", "ANNOUNCE"]),
  ]);
  const since = edu?.intro?.match(/از سال ([۰-۹0-9]{4})/)?.[1];
  const body = (edu?.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const faq = [
    contact.branches.length > 0 && { q: "آموزشگاه تقویتی ستارگان کجای نسیم‌شهر است؟", a: `${branchesSentence(contact)}.` },
    services.length > 0 && { q: "آموزشگاه تقویتی ستارگان چه کلاس‌ها و خدماتی دارد؟", a: `${services.map((s) => s.title).join("، ")}.` },
    since && { q: "آموزشگاه از چه سالی فعالیت می‌کند؟", a: `آموزشگاه تقویتی و کنکور ستارگان فعالیت خود را از سال ${since} آغاز کرده است.` },
    { q: "چطور در کلاس‌های تقویتی ثبت‌نام کنم؟", a: `فرم پیش‌ثبت‌نام آنلاین را پر کنید و بخش موردنظر را انتخاب کنید؛ همکاران ما برای ادامهٔ مراحل با شما تماس می‌گیرند.${phone ? ` شماره‌های تماس: ${phonesSentence(contact)}.` : ""}` },
    contact.hours.length > 0 && { q: "ساعات کاری آموزشگاه چیست؟", a: contact.hours.join("؛ ") + "." },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="amoozeshgah" title="آموزشگاه تقویتی ستارگان در نسیم‌شهر" intro={t.intro} phone={phone} accent="edu" />
      {(edu?.intro || body.length > 0) && (
        <section className="container-x py-14 sm:py-20">
          <div className="prose-fa max-w-3xl">
            {edu?.intro && <p className="text-lg">{edu.intro}</p>}
            {body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>
      )}
      {services.length > 0 && (
        <Block eyebrow="کلاس‌ها و خدمات" title="از تقویت پایه تا کنکور" tone="paper" text={`${fa(services.length)} بخش آموزشی و مشاوره‌ای؛ برای جزئیات هر پایه، صفحهٔ کلاس تقویتی به تفکیک پایه را ببینید.`}>
          <FeatureGrid items={services.map((s) => ({ title: s.title, text: s.text || undefined, href: "/kelas-taghviati", icon: "cap" as const }))} />
        </Block>
      )}
      {stats.length > 0 && <div className="container-x py-14"><StatsBand stats={stats} /></div>}
      {ach.length > 0 && (
        <Block eyebrow="افتخارات" title="دانش‌آموزانی که به هدفشان رسیدند">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ach.map((a) => <AchievementCard key={a.id} a={a} />)}</div>
          <Link href="/achievements" className="btn-ghost mt-6 inline-flex px-5 py-2.5 text-sm">همهٔ افتخارات</Link>
        </Block>
      )}
      {news.length > 0 && (
        <Block eyebrow="اطلاعیه‌ها" title="اطلاعیه‌های کلاس‌ها">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{news.map((n) => <NewsCard key={n.id} n={n} />)}</div>
        </Block>
      )}
      <WhereBlock contact={contact} />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ آموزشگاه تقویتی ستارگان" />
      <RelatedGuides current="amoozeshgah" />
    </>
  );
}
