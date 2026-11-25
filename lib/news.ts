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
    prisma.news.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.news.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Home strip: the newest published items. Pinned items keep their badge, but no longer jump the queue. */
export async function homeNews() {
  return prisma.news.findMany({ where: liveWhere(), orderBy: { publishedAt: "desc" }, take: 5 });
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
