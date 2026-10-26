import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageMeta } from "@/lib/seo";
import { landingBase, latestNews, findHl } from "@/lib/landing";
import { listProducts } from "@/lib/shop/catalog";
import { AchievementCard } from "@/components/site/cards";
import { ProductCard } from "@/components/shop/ProductCard";
import { NewsCard } from "@/components/site/news";
import { Block, FaqBlock, FeatureGrid, LandingHero, RelatedGuides, Steps, WhereBlock, branchesSentence, phonesSentence } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("konkur");
}

export default async function KonkurNasimshahr() {
  const { t, contact, hl, phone, formLive } = await landingBase("konkur");
  const edu = hl("education"), gc = hl("ghalamchi");
  const [ach, books12, booksGrad, news] = await Promise.all([
    prisma.achievement.findMany({ where: { published: true, category: "KONKUR" }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 6 }),
    listProducts({ grade: "دوازدهم" }, 4).catch(() => []),
    listProducts({ grade: "فارغ‌التحصیل" }, 4).catch(() => []),
    latestNews(["EXAM", "RESULTS", "CLASSES"]),
  ]);
  const books = [...books12, ...booksGrad].slice(0, 4);

  const services = [
    findHl(edu, "کنکور") && { ...findHl(edu, "کنکور")!, href: "/education", icon: "cap" as const },
    findHl(gc, "آزمون") && { ...findHl(gc, "آزمون")!, title: "آزمون‌های قلم‌چی", href: "/ghalamchi-nasimshahr", icon: "book" as const },
    findHl(edu, "مشاوره") && { ...findHl(edu, "مشاوره")!, href: "/education", icon: "chat" as const },
    findHl(edu, "انتخاب رشته") && { ...findHl(edu, "انتخاب رشته")!, href: "/education", icon: "shield" as const },
    findHl(edu, "پانسیون") && { ...findHl(edu, "پانسیون")!, href: "/education", icon: "clock" as const },
    books.length > 0 && { title: "جزوهٔ کنکور", text: "جزوه‌های مدرسان را آنلاین سفارش دهید و در شعبه تحویل بگیرید.", href: "/jozve-konkur", icon: "bag" as const },
  ].filter(Boolean) as { title: string; text?: string; href: string; icon: "cap" }[];

  const faq = [
    contact.branches.length > 0 && { q: "آموزشگاه کنکور ستارگان کجای نسیم‌شهر است؟", a: `مؤسسه علمی ستارگان در نسیم‌شهر شعبه‌های جداگانه دارد — ${branchesSentence(contact)}.` },
    { q: "برای ثبت‌نام در کلاس‌ها و خدمات کنکور چه باید کرد؟", a: `فرم پیش‌ثبت‌نام آنلاین را در همین سایت پر کنید و بخش موردنظر را انتخاب کنید؛ همکاران ما برای ادامهٔ مراحل با شما تماس می‌گیرند.${phone ? ` همچنین می‌توانید با ${phonesSentence(contact)} تماس بگیرید.` : ""}` },
    (findHl(edu, "مشاوره") || findHl(edu, "انتخاب رشته")) && { q: "آیا مشاوره تحصیلی و انتخاب رشته هم دارید؟", a: `بله؛ ${[findHl(edu, "مشاوره")?.title, findHl(edu, "انتخاب رشته")?.title].filter(Boolean).join(" و ")} از خدمات آموزشگاه تقویتی و کنکور ستارگان است.` },
    gc.length > 0 && { q: "در نسیم‌شهر کجا می‌توان در آزمون‌های قلم‌چی شرکت کرد؟", a: "در نمایندگی رسمی کانون فرهنگی آموزش (قلم‌چی) نسیم‌شهر که زیرمجموعهٔ مؤسسه علمی ستارگان است. روند ثبت‌نام در صفحهٔ «آزمون‌های قلم‌چی در نسیم‌شهر» آمده است." },
    books.length > 0 && { q: "جزوهٔ کنکور را چطور تهیه کنم؟", a: "از فروشگاه آنلاین جزوه سفارش دهید و پرداخت را آنلاین انجام دهید؛ جزوهٔ چاپ‌شده در شعبهٔ انتخابی به‌صورت حضوری تحویل داده می‌شود (ارسال پستی نداریم)." },
    contact.hours.length > 0 && { q: "ساعات کاری مؤسسه چیست؟", a: contact.hours.join("؛ ") + "." },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="konkur" title="آموزشگاه کنکور در نسیم شهر؛ کلاس کنکور، آزمون، مشاوره و جزوه" intro={t.intro} phone={phone} />
      {services.length > 0 && (
        <Block eyebrow="آمادگی کنکور" title="کلاس کنکور و مشاوره کنکور، نزدیک خانه" text="خدماتی که مؤسسه علمی ستارگان برای داوطلبان کنکور در نسیم‌شهر ارائه می‌دهد:">
          <FeatureGrid items={services} />
        </Block>
      )}
      <Block eyebrow="از کجا شروع کنیم؟" title="چهار قدم برای شروع آمادگی کنکور" tone="paper">
        <Steps
          steps={[
            { title: "برنامه و مشاوره", text: "برنامهٔ مطالعاتی باید با پایه، رشته و وقت آزاد هر داوطلب جور باشد؛ گفت‌وگو با مشاور اولین قدم است." },
            { title: "سنجش منظم", text: <>آزمون‌های دوره‌ای نشان می‌دهند کجای مسیر هستید. <Link href="/ghalamchi-nasimshahr" className="font-bold text-royal">آزمون‌های قلم‌چی نسیم‌شهر</Link></> },
            { title: "منابع درست", text: <>منبع کم ولی دقیق بهتر از منبع زیاد است. <Link href="/jozve-konkur" className="font-bold text-royal">جزوه‌های مدرسان</Link></> },
            { title: "پیش‌ثبت‌نام", text: <>فرم کوتاه آنلاین را پر کنید تا همکاران ما تماس بگیرند. <Link href={formLive("pre-registration") ? "/register" : "/contact"} className="font-bold text-royal">شروع پیش‌ثبت‌نام</Link></> },
          ]}
        />
      </Block>
      {ach.length > 0 && (
        <Block eyebrow="نتایج" title="قبولی‌های کنکور دانش‌آموزان ستارگان">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ach.map((a) => <AchievementCard key={a.id} a={a} />)}</div>
          <Link href="/achievements" className="btn-ghost mt-6 inline-flex px-5 py-2.5 text-sm">همهٔ افتخارات</Link>
        </Block>
      )}
      {books.length > 0 && (
        <Block eyebrow="جزوه" title="جزوه‌های پایهٔ دوازدهم و کنکور" tone="paper">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{books.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          <Link href="/shop?grade=%D8%AF%D9%88%D8%A7%D8%B2%D8%AF%D9%87%D9%85" className="btn-ghost mt-6 inline-flex px-5 py-2.5 text-sm">همهٔ جزوه‌های دوازدهم</Link>
        </Block>
      )}
      {news.length > 0 && (
        <Block eyebrow="اطلاعیه‌ها" title="تازه‌ترین اطلاعیه‌های آزمون و کلاس">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{news.map((n) => <NewsCard key={n.id} n={n} />)}</div>
        </Block>
      )}
      <WhereBlock contact={contact} />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ کنکور در نسیم‌شهر" />
      <RelatedGuides current="konkur" />
    </>
  );
}
