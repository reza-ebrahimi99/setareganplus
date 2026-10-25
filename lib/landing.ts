import { prisma } from "@/lib/prisma";
import { getContact, getSeo, pageText, type PageKey } from "@/lib/seo";
import { liveWhere } from "@/lib/news";

export type Highlight = { title: string; text?: string };

export async function landingBase(k: PageKey) {
  const [t, contact, seo, centers, forms] = await Promise.all([
    pageText(k),
    getContact(),
    getSeo(),
    prisma.center.findMany({ where: { published: true } }),
    prisma.form.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } }),
  ]);
  const center = (slug: string) => centers.find((c) => c.slug === slug) ?? null;
  const hl = (slug: string) => ((center(slug)?.highlights ?? []) as Highlight[]).filter((h) => h?.title);
  const formLive = (slug: string) => forms.some((f) => f.slug === slug);
  return { t, contact, seo, center, hl, formLive, phone: contact.phones[0] };
}

export function latestNews(categories: string[], take = 3) {
  return prisma.news.findMany({ where: liveWhere({ category: { in: categories } }), orderBy: { publishedAt: "desc" }, take }).catch(() => []);
}

/** Find a highlight whose title contains the given word. */
export const findHl = (list: Highlight[], word: string) => list.find((h) => h.title.includes(word));
