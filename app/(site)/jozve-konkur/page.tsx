import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageMeta } from "@/lib/seo";
import { landingBase, latestNews } from "@/lib/landing";
import { listProducts } from "@/lib/shop/catalog";
import { GRADES, PICKUP_HOURS, formatToman } from "@/lib/shop/config";
import { getShopSettings } from "@/lib/shop/settings";
import { fa } from "@/lib/format";
import { ProductCard } from "@/components/shop/ProductCard";
import { NewsCard } from "@/components/site/news";
import { Block, FaqBlock, LandingHero, RelatedGuides, Steps, WhereBlock } from "@/components/site/Landing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("jozve");
}

export default async function JozveKonkur() {
  const { t, contact, phone } = await landingBase("jozve");
  const [all, shop, news, agg] = await Promise.all([
    listProducts({}).catch(() => []),
    getShopSettings(),
    latestNews(["BOOKLET"]),
    prisma.product.aggregate({ where: { active: true }, _min: { priceRials: true }, _max: { priceRials: true }, _count: true }),
  ]);
  const byGrade = GRADES.map((g) => ({ g, items: all.filter((p) => p.grade === g) })).filter((x) => x.items.length > 0);
  const other = all.filter((p) => !p.grade);
  const grades = byGrade.map((x) => x.g);

  const faq = [
    { q: "جزوه را چطور تحویل بگیرم؟", a: `جزوه‌ها چاپ و در شعبهٔ انتخابی شما به‌صورت حضوری تحویل داده می‌شوند و ارسال پستی نداریم. پس از آماده شدن پیامک دریافت می‌کنید. ساعت تحویل: ${PICKUP_HOURS.join("، ")}.` },
    { q: "پرداخت چطور انجام می‌شود؟", a: "پرداخت آنلاین و از درگاه امن بانکی انجام می‌شود؛ پس از پرداخت، رسید و کد تحویل برایتان پیامک می‌شود." },
    { q: "وضعیت سفارشم را کجا ببینم؟", a: "در صفحهٔ «پیگیری سفارش جزوه»، کد تحویل (در پیامک) یا شماره سفارش را همراه با شماره موبایل خرید وارد کنید تا وضعیت سفارش را ببینید." },
    grades.length > 0 && { q: "جزوه برای چه پایه‌هایی موجود است؟", a: `در حال حاضر جزوه برای پایه‌های ${grades.join("، ")} در فروشگاه موجود است.` },
    agg._count > 0 && agg._min.priceRials != null && { q: "قیمت جزوه‌ها چقدر است؟", a: `قیمت جزوه‌های فعلی از ${formatToman(agg._min.priceRials)} تا ${formatToman(agg._max.priceRials!)} است و قیمت هر جزوه در صفحهٔ خودش آمده است.` },
    ...t.faq,
  ].filter(Boolean) as { q: string; a: string }[];

  return (
    <>
      <LandingHero k="jozve" title="جزوه کنکور و جزوه‌های درسی ستارگان" intro={t.intro} phone={phone} accent="edu" cta={{ href: "/shop", label: "ورود به فروشگاه جزوه" }} />
      {shop.notice && <div className="container-x mt-8"><p className="rounded-2xl bg-sky/70 p-4 text-sm leading-7 font-semibold text-navy">{shop.notice}</p></div>}
      <Block eyebrow="روند خرید" title="سفارش آنلاین، تحویل حضوری">
        <Steps
          steps={[
            { title: "انتخاب جزوه", text: <>جزوهٔ موردنظر را از <Link href="/shop" className="font-bold text-royal">فروشگاه</Link> انتخاب و مشخصات دانش‌آموز را وارد کنید.</> },
            { title: "پرداخت امن", text: "پرداخت آنلاین از درگاه بانکی؛ رسید و کد تحویل پیامک می‌شود." },
            { title: "آماده‌سازی", text: <>جزوه چاپ و آماده می‌شود؛ وضعیت را در <Link href="/order" className="font-bold text-royal">پیگیری سفارش</Link> ببینید.</> },
            { title: "تحویل در شعبه", text: "پس از پیامک آماده بودن، با کد تحویل به شعبهٔ انتخابی مراجعه کنید." },
          ]}
        />
      </Block>
      {byGrade.map(({ g, items }) => (
        <Block key={g} id={`grade-${g}`} eyebrow={`${fa(items.length)} جزوه`} title={`جزوه‌های ${g === "فارغ‌التحصیل" ? "فارغ‌التحصیلان" : `پایهٔ ${g}`}`} tone="paper">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{items.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}</div>
          {items.length > 4 && <Link href={`/shop?grade=${encodeURIComponent(g)}`} className="btn-ghost mt-6 inline-flex px-5 py-2.5 text-sm">همهٔ جزوه‌های {g}</Link>}
        </Block>
      ))}
      {other.length > 0 && (
        <Block eyebrow="سایر" title="جزوه‌های عمومی">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{other.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </Block>
      )}
      {news.length > 0 && (
        <Block eyebrow="اطلاعیه‌ها" title="خبرهای جزوه و منابع">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{news.map((n) => <NewsCard key={n.id} n={n} />)}</div>
        </Block>
      )}
      <WhereBlock contact={contact} title="محل تحویل جزوه" />
      <FaqBlock items={faq} title="پرسش‌های رایج دربارهٔ خرید جزوه" />
      <RelatedGuides current="jozve" />
    </>
  );
}
