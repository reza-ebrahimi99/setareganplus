import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { landingBase, latestNews } from "@/lib/landing";
import { listProducts } from "@/lib/shop/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import { NewsCard } from "@/components/site/news";
import { Block, FaqBlock, FeatureGrid, LandingHero, RelatedGuides, Steps, WhereBlock, branchesSentence, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("ghalamchiGuide");
}

/** "تاریخ | عنوان | توضیح" lines entered by the owner; nothing is invented here. */
function calendar(text = "") {
  return text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x.length >= 2 && x[0] && x[1])
    .map(([date, title, note]) => ({ date, title, note }));
}

export default async function GhalamchiGuide() {
  const { t, contact, seo, center, hl, phone, formLive } = await landingBase("ghalamchiGuide");
  const gc = center("ghalamchi");
  const services = hl("ghalamchi");
  const branches = ((gc?.branches ?? []) as { name: string; address: string; mapUrl?: string }[]).length ? { ...contact, branches: gc!.branches as typeof contact.branches } : contact;
  const regHref = formLive("ghalamchi-exam") ? "/f/ghalamchi-exam" : "/ghalamchi#register";
  const [news, books] = await Promise.all([latestNews(["EXAM"], 6), listProducts({ center: "ghalamchi" }, 4).catch(() => [])]);
  const cal = calendar(seo.examCalendar);
  const since = gc?.body?.match(/از سال ([۰-۹0-9]{4})/)?.[1];

  const faq = [
    { q: "نمایندگی قلم‌چی نسیم‌شهر کجاست؟", a: branches.branches.length ? `${branchesSentence(branches)}.` : "نشانی شعبه‌ها در صفحهٔ تماس با ما آمده است." },
    { q: "چطور در آزمون‌های قلم‌چی ثبت‌نام کنم؟", a: `فرم «ثبت‌نام آزمون‌های قلم‌چی» را در همین سایت تکمیل کنید؛ پس از بررسی، همکاران ما برای تکمیل ثبت‌نام تماس می‌گیرند.${phone ? ` برای پرسش‌ها: ${phonesSentence(contact)}.` : ""}` },
    { q: "کارنامه و نتایج آزمون‌ها را کجا ببینم؟", a: "کارنامه و نتایج از طریق سامانه‌های رسمی کانون فرهنگی آموزش ارائه می‌شود. ستارگان پلاس سایت اختصاصی مؤسسه است و اتصال فنی به سامانه‌های کانون ندارد." },
    since && { q: "نمایندگی قلم‌چی نسیم‌شهر از چه زمانی فعال است؟", a: gc!.body!.split(/\n/)[0] },
    { q: "زمان آزمون‌های بعدی کی است؟", a: cal.length ? `تقویم آزمون‌ها در همین صفحه آمده است؛ نزدیک‌ترین مورد: ${cal[0].title} (${cal[0].date}).` : "زمان آزمون‌ها در بخش «اخبار و اطلاعیه‌ها» (دستهٔ آزمون) اعلام می‌شود." },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="ghalamchiGuide" title="آزمون‌های قلم‌چی در نسیم‌شهر" intro={t.intro} phone={phone} accent="gc" cta={{ href: regHref, label: "ثبت‌نام آزمون‌های قلم‌چی" }} />
      <Block eyebrow="روند کار" title="ثبت‌نام آزمون در سه قدم">
        <Steps
          steps={[
            { title: "فرم آنلاین", text: <>فرم کوتاه <Link href={regHref} className="font-bold text-royal">ثبت‌نام آزمون‌های قلم‌چی</Link> را تکمیل کنید.</> },
            { title: "تماس همکاران", text: "پس از بررسی، همکاران نمایندگی برای تکمیل ثبت‌نام با شما تماس می‌گیرند." },
            { title: "شرکت در آزمون", text: "آزمون‌ها زیر نظر نمایندگی نسیم‌شهر برگزار می‌شود؛ زمان و محل هر آزمون اطلاع‌رسانی می‌شود." },
          ]}
        />
      </Block>
      <Block id="calendar" eyebrow="تقویم" title="تقویم آزمون‌ها" tone="paper">
        {cal.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-ivory text-right text-xs text-muted"><tr><th className="p-3">تاریخ</th><th className="p-3">آزمون</th><th className="hidden p-3 sm:table-cell">توضیح</th></tr></thead>
              <tbody className="divide-y divide-line">
                {cal.map((c) => <tr key={c.date + c.title}><td className="p-3 font-bold whitespace-nowrap text-navy">{c.date}</td><td className="p-3">{c.title}</td><td className="hidden p-3 text-muted sm:table-cell">{c.note}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : news.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-muted">زمان آزمون‌ها در بخش <Link href="/news?cat=exam" className="font-bold text-royal">اطلاعیه‌های آزمون</Link> اعلام می‌شود.</p>
        ) : null}
        {news.length > 0 && <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{news.slice(0, 3).map((n) => <NewsCard key={n.id} n={n} />)}</div>}
      </Block>
      {services.length > 0 && (
        <Block eyebrow="نمایندگی رسمی" title="در نمایندگی قلم‌چی نسیم‌شهر چه می‌گیرید؟">
          <FeatureGrid items={services.map((s) => ({ title: s.title, text: s.text || undefined, href: "/ghalamchi", icon: "book" as const }))} />
        </Block>
      )}
      {books.length > 0 && (
        <Block eyebrow="جزوه" title="جزوه‌های مدرسان قلم‌چی نسیم‌شهر" tone="paper">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{books.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </Block>
      )}
      <WhereBlock contact={branches} title="شعبه‌های نمایندگی قلم‌چی نسیم‌شهر" />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ آزمون‌های قلم‌چی" />
      <RelatedGuides current="ghalamchiGuide" />
    </>
  );
}
