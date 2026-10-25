import type { Metadata } from "next";
import Link from "next/link";
import { catBySlug, listNews, NEWS_CATEGORIES } from "@/lib/news";
import { buildMeta, pageText } from "@/lib/seo";
import { fa } from "@/lib/format";
import { PageHero } from "@/components/site/Star";
import { NewsCard, Pager } from "@/components/site/news";

type SP = { cat?: string; page?: string };

function hrefOf(cat?: string, page = 1) {
  const p = new URLSearchParams();
  if (cat) p.set("cat", cat);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/news?${s}` : "/news";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const t = await pageText("news");
  const cat = catBySlug(sp.cat);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const title = cat ? `${cat.label}‌ها — ${t.title}` : t.title;
  return buildMeta({ title: page > 1 ? `${title} (صفحه ${fa(page)})` : title, description: t.description, path: hrefOf(cat?.slug, page) });
}

export default async function NewsIndex({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const t = await pageText("news");
  const cat = catBySlug(sp.cat);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { items, total, pages } = await listNews({ category: cat?.key, page });
  return (
    <>
      <PageHero eyebrow="اخبار و اطلاعیه‌ها" title={cat ? `${cat.label}‌ها` : "تازه‌ترین خبرها و اطلاعیه‌ها"} text={t.intro} crumbs={cat ? cat.label : "اخبار و اطلاعیه‌ها"} trail={cat ? [{ name: "اخبار و اطلاعیه‌ها", href: "/news" }] : []} />
      <section className="container-x py-12 sm:py-16">
        <nav aria-label="دسته‌بندی خبرها" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          <Link href="/news" className={`chip shrink-0 px-4 py-2 text-sm ${!cat ? "bg-navy text-white" : "bg-paper text-ink/75 ring-1 ring-line hover:text-navy"}`}>همه</Link>
          {NEWS_CATEGORIES.map((c) => (
            <Link key={c.key} href={hrefOf(c.slug)} className={`chip shrink-0 px-4 py-2 text-sm ${cat?.key === c.key ? "bg-navy text-white" : "bg-paper text-ink/75 ring-1 ring-line hover:text-navy"}`}>{c.label}</Link>
          ))}
        </nav>
        <h2 className="sr-only">{cat ? `خبرهای ${cat.label}` : "همهٔ خبرها و اطلاعیه‌ها"}</h2>
        <p className="mt-4 text-sm text-muted">{fa(total)} مطلب</p>
        {items.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-paper p-10 text-center">
            <p className="text-lg font-extrabold text-navy">فعلاً مطلبی در این بخش منتشر نشده است.</p>
            <p className="mt-2 text-sm text-muted">برای خبرهای تازه به صفحهٔ اصلی سر بزنید یا با ما <Link href="/contact" className="font-bold text-royal">تماس بگیرید</Link>.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n, i) => <NewsCard key={n.id} n={n} priority={i < 3} />)}
          </div>
        )}
        <Pager page={page} pages={pages} href={(p) => hrefOf(cat?.slug, p)} />
      </section>
    </>
  );
}
