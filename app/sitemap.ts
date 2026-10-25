import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { liveWhere } from "@/lib/news";
import { LANDINGS, PAGES } from "@/lib/seo";
import { siteUrl } from "@/lib/shop/config";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const u = (p: string) => site + encodeURI(p);
  const img = (p?: string | null) => (p ? [p.startsWith("http") ? p : u(p)] : undefined);

  const [settings, centers, products, news, forms, albums] = await Promise.all([
    prisma.setting.findMany({ select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 }),
    prisma.center.findMany({ where: { published: true }, select: { slug: true, heroImage: true, updatedAt: true } }),
    prisma.product.findMany({ where: { active: true }, select: { slug: true, cover: true, updatedAt: true } }),
    prisma.news.findMany({ where: liveWhere(), select: { slug: true, cover: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
    prisma.form.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.galleryAlbum.findMany({ where: { published: true }, select: { slug: true, cover: true, photos: { select: { path: true }, take: 50, orderBy: { sortOrder: "asc" } } } }),
  ]);
  const siteMod = settings[0]?.updatedAt ?? new Date();
  const newest = (xs: { updatedAt: Date }[]) => xs.reduce((m, x) => (x.updatedAt > m ? x.updatedAt : m), siteMod);

  const fixed: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: newest([...news, ...products]), changeFrequency: "daily", priority: 1 },
    ...centers.map((c) => ({ url: u(`/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.9, images: img(c.heroImage) })),
    { url: u("/shop"), lastModified: newest(products), changeFrequency: "daily", priority: 0.9 },
    { url: u("/news"), lastModified: newest(news), changeFrequency: "daily", priority: 0.8 },
    ...LANDINGS.map((k) => ({ url: u(PAGES[k].path), lastModified: siteMod, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...["/register", "/contact", "/about", "/team", "/achievements", "/gallery", "/faq"].map((p) => ({ url: u(p), lastModified: siteMod, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
  return [
    ...fixed,
    ...products.map((p) => ({ url: u(`/shop/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7, images: img(p.cover) })),
    ...news.map((n) => ({ url: u(`/news/${n.slug}`), lastModified: n.updatedAt, changeFrequency: "monthly" as const, priority: 0.6, images: img(n.cover) })),
    // pre-registration is published at /register
    ...forms.filter((f) => f.slug !== "pre-registration").map((f) => ({ url: u(`/f/${f.slug}`), lastModified: f.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...albums.map((a) => ({ url: u(`/gallery/${a.slug}`), changeFrequency: "monthly" as const, priority: 0.4, images: [...new Set([a.cover, ...a.photos.map((p) => p.path)].filter(Boolean) as string[])].map((p) => u(p)) })),
  ];
}
