/* eslint-disable @next/next/no-img-element */
import { responsive } from "@/lib/img";
import Link from "next/link";
import { fa, jalaliDate } from "@/lib/format";
import { catSlug, NEWS_CAT_LABEL } from "@/lib/news";
import { Icon, Star } from "./Star";

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover: string | null;
  category: string;
  pinned: boolean;
  publishedAt: Date | null;
};

const CAT_TONE: Record<string, string> = {
  ANNOUNCE: "bg-gold/20 text-gold-ink",
  EXAM: "bg-gc/10 text-[#a8262e]",
  CLASSES: "bg-sky text-royal",
  RESULTS: "bg-emerald-50 text-emerald-700",
  BOOKLET: "bg-royal/10 text-royal",
  GENERAL: "bg-ivory text-muted",
};

export function NewsMeta({ n, light = false }: { n: Pick<NewsItem, "category" | "publishedAt" | "pinned">; light?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${light ? "text-white/70" : "text-muted"}`}>
      <Link href={`/news?cat=${catSlug(n.category)}`} className={`chip relative z-10 ${light ? "bg-white/15 text-white" : CAT_TONE[n.category] ?? CAT_TONE.GENERAL}`}>{NEWS_CAT_LABEL[n.category] ?? "خبر"}</Link>
      {n.pinned && <span className={`chip ${light ? "bg-gold text-navy" : "bg-navy text-white"}`}>مهم</span>}
      {n.publishedAt && <time dateTime={n.publishedAt.toISOString()}>{jalaliDate(n.publishedAt)}</time>}
    </div>
  );
}

export function NewsCard({ n, priority = false }: { n: NewsItem; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-paper transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgb(10_26_63/0.45)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-hero">
        {n.cover ? (
          <img {...responsive(n.cover, "(min-width: 1024px) 380px, (min-width: 640px) 46vw, 92vw", 960)} alt={n.title} width={640} height={360} loading={priority ? "eager" : "lazy"} decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Star className="size-16 text-gold/80" />
          </div>
        )}
        {n.pinned && <span className="absolute top-3 right-3 rounded-full bg-gold px-2.5 py-1 text-[0.7rem] font-extrabold text-navy shadow">📌 سنجاق‌شده</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <NewsMeta n={n} />
        <h3 className="mt-3 text-lg leading-8 font-extrabold text-navy">
          <Link href={`/news/${n.slug}`} className="after:absolute after:inset-0 group-hover:text-royal">{n.title}</Link>
        </h3>
        {n.summary && <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">{n.summary}</p>}
        <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-bold text-royal">ادامه <Icon name="arrow" className="size-3.5" strokeWidth={2.4} /></span>
      </div>
    </article>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav aria-label="صفحه‌بندی" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && <Link rel="prev" href={href(page - 1)} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold text-navy hover:border-navy/30">قبلی</Link>}
      {nums.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && nums[i - 1] !== p - 1 && <span className="text-muted">…</span>}
          {p === page ? (
            <span aria-current="page" className="flex size-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{fa(p)}</span>
          ) : (
            <Link href={href(p)} className="flex size-10 items-center justify-center rounded-full border border-line bg-paper text-sm font-bold text-navy hover:border-navy/30">{fa(p)}</Link>
          )}
        </span>
      ))}
      {page < pages && <Link rel="next" href={href(page + 1)} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-bold text-navy hover:border-navy/30">بعدی</Link>}
    </nav>
  );
}
