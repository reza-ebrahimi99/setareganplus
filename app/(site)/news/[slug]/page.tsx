/* eslint-disable @next/next/no-img-element */
import { responsive } from "@/lib/img";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { liveWhere, NEWS_CAT_LABEL, catSlug } from "@/lib/news";
import { Markdown, mdToText } from "@/lib/markdown";
import { abs, buildMeta, BRAND, ORG_NAME } from "@/lib/seo";
import { siteUrl } from "@/lib/shop/config";
import { formatToman } from "@/lib/shop/config";
import { Icon, PageHero } from "@/components/site/Star";
import { JsonLd } from "@/components/site/JsonLd";
import { NewsCard, NewsMeta } from "@/components/site/news";
import { ShareButtons } from "@/components/site/ShareButtons";

type P = { params: Promise<{ slug: string }> };

/** Cut at a word boundary. */
function clip(t: string, max: number) {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const i = cut.lastIndexOf(" ");
  return (i > max * 0.6 ? cut.slice(0, i) : cut).trim() + "…";
}

const load = cache(async (raw: string) => {
  const slug = decodeURIComponent(raw);
  return prisma.news.findFirst({ where: liveWhere({ slug }) });
});

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const n = await load((await params).slug);
  if (!n) return { title: "خبر پیدا نشد", robots: { index: false } };
  const description = n.summary || clip(mdToText(n.body), 160);
  return buildMeta({
    // short titles get " | ستارگان پلاس"; long ones stand alone so the headline is not cut off
    title: n.title,
    absoluteTitle: n.title.length > 48,
    description,
    path: `/news/${n.slug}`,
    type: "article",
    publishedTime: n.publishedAt?.toISOString(),
    modifiedTime: n.updatedAt.toISOString(),
    images: [{ url: `/og/news/${encodeURI(n.slug)}`, width: 1200, height: 630, alt: n.title }],
  });
}

export default async function NewsPage({ params }: P) {
  const n = await load((await params).slug);
  if (!n) notFound();
  const [form, product, related] = await Promise.all([
    n.formSlug ? prisma.form.findFirst({ where: { slug: n.formSlug, status: "PUBLISHED" }, select: { slug: true, title: true } }) : null,
    n.productSlug ? prisma.product.findFirst({ where: { slug: n.productSlug, active: true }, select: { slug: true, title: true, priceRials: true } }) : null,
    prisma.news.findMany({ where: liveWhere({ NOT: { id: n.id } }), orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);
  const url = `${siteUrl()}/news/${encodeURI(n.slug)}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: n.title.slice(0, 110),
    description: n.summary || clip(mdToText(n.body), 200),
    image: [...(n.cover ? [abs(n.cover)] : []), abs(`/og/news/${encodeURI(n.slug)}`)],
    datePublished: n.publishedAt?.toISOString(),
    dateModified: n.updatedAt.toISOString(),
    inLanguage: "fa-IR",
    articleSection: NEWS_CAT_LABEL[n.category] ?? "خبر",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    isPartOf: { "@type": "WebSite", "@id": `${siteUrl()}/#website`, name: BRAND, url: `${siteUrl()}/` },
    author: { "@type": "Organization", name: ORG_NAME, url: `${siteUrl()}/` },
    publisher: { "@type": "Organization", "@id": `${siteUrl()}/#organization`, name: ORG_NAME, alternateName: BRAND, logo: { "@type": "ImageObject", url: abs("/brand/logo.png") } },
  };
  return (
    <>
      <JsonLd data={ld} />
      <PageHero
        title={n.title}
        crumbs={NEWS_CAT_LABEL[n.category] ?? "خبر"}
        trail={[{ name: "اخبار و اطلاعیه‌ها", href: "/news" }]}
      >
        <div className="mt-5"><NewsMeta n={n} light /></div>
      </PageHero>
      <div className="container-x grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          {n.cover && (
            <img {...responsive(n.cover, "(min-width: 1024px) 760px, 92vw")} alt={n.title} width={1200} height={675} fetchPriority="high" decoding="async" className="mb-8 aspect-[16/9] w-full rounded-3xl object-cover shadow-[0_24px_60px_-30px_rgb(10_26_63/0.5)]" />
          )}
          {n.summary && <p className="mb-6 rounded-2xl bg-sky/60 p-5 text-[1.05rem] leading-8 font-semibold text-navy">{n.summary}</p>}
          <Markdown text={n.body} className="md" />
          {(form || product) && (
            <div className="mt-10 flex flex-wrap gap-3 rounded-3xl border border-line bg-paper p-5">
              {form && <Link href={`/f/${form.slug}`} className="btn-gold px-6 py-3">{form.title} <Icon name="arrow" className="size-4" /></Link>}
              {product && (
                <Link href={`/shop/${product.slug}`} className="btn-primary px-6 py-3">
                  خرید «{product.title}» · {formatToman(product.priceRials)}
                </Link>
              )}
            </div>
          )}
          <div className="mt-10 border-t border-line pt-6"><ShareButtons url={url} title={n.title} /></div>
        </article>
        <aside className="space-y-6">
          <div className="rounded-3xl border border-line bg-paper p-5">
            <p className="font-extrabold text-navy">دسترسی سریع</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href={`/news?cat=${catSlug(n.category)}`} className="text-royal hover:underline">همهٔ {NEWS_CAT_LABEL[n.category] ?? "خبر"}‌ها</Link></li>
              <li><Link href="/register" className="text-royal hover:underline">پیش‌ثبت‌نام آنلاین</Link></li>
              <li><Link href="/ghalamchi-nasimshahr" className="text-royal hover:underline">آزمون‌های قلم‌چی نسیم‌شهر</Link></li>
              <li><Link href="/shop" className="text-royal hover:underline">فروشگاه جزوه</Link></li>
              <li><Link href="/contact" className="text-royal hover:underline">تماس و نشانی شعبه‌ها</Link></li>
            </ul>
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="border-t border-line bg-paper/60 py-12 sm:py-16">
          <div className="container-x">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-black text-navy">مطالب دیگر</h2>
              <Link href="/news" className="text-sm font-bold text-royal">همهٔ اخبار ←</Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <NewsCard key={r.id} n={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
