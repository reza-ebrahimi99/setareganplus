import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const NEWS_CATEGORIES: { key: string; label: string; slug: string }[] = [
  { key: "ANNOUNCE", label: "اطلاعیه", slug: "announcement" },
  { key: "EXAM", label: "آزمون", slug: "exam" },
  { key: "CLASSES", label: "کلاس‌ها", slug: "classes" },
  { key: "RESULTS", label: "نتایج و افتخارات", slug: "results" },
  { key: "BOOKLET", label: "جزوه و منابع", slug: "booklet" },
  { key: "GENERAL", label: "خبر", slug: "general" },
];
export const NEWS_CAT_LABEL: Record<string, string> = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.key, c.label]));
export const catBySlug = (slug?: string) => NEWS_CATEGORIES.find((c) => c.slug === slug);
export const catSlug = (key: string) => NEWS_CATEGORIES.find((c) => c.key === key)?.slug ?? "general";

/** Published = flag on and publish date not in the future. */
export function liveWhere(extra: Prisma.NewsWhereInput = {}): Prisma.NewsWhereInput {
  return { published: true, publishedAt: { lte: new Date() }, ...extra };
}

export const PAGE_SIZE = 9;

export async function listNews({ category, page = 1 }: { category?: string; page?: number }) {
  const where = liveWhere(category ? { category } : {});
  const [items, total] = await Promise.all([
    prisma.news.findMany({ where, orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.news.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Home strip: every pinned item + the latest 3 (deduped, pinned first). */
export async function homeNews() {
  const [pinned, latest] = await Promise.all([
    prisma.news.findMany({ where: liveWhere({ pinned: true }), orderBy: { publishedAt: "desc" }, take: 3 }),
    prisma.news.findMany({ where: liveWhere(), orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);
  const seen = new Set<string>();
  return [...pinned, ...latest].filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true))).slice(0, 6);
}

export function newsSlug(title: string): string {
  return (
    title
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/\u200c/g, "")
      .trim()
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 70)
      .replace(/-+$/g, "") || "news"
  );
}
