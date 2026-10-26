/* eslint-disable @next/next/no-img-element */
import { responsive } from "@/lib/img";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/site/Star";
import { fa } from "@/lib/format";
import { buildMeta } from "@/lib/seo";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const al = await prisma.galleryAlbum.findUnique({ where: { slug: decodeURIComponent(slug) }, include: { _count: { select: { photos: true } }, photos: { orderBy: { sortOrder: "asc" }, take: 1 } } });
  if (!al || !al.published) return { title: "آلبوم پیدا نشد", robots: { index: false } };
  const where = al.center === "ghalamchi" ? "نمایندگی قلم‌چی نسیم‌شهر" : al.center === "education" ? "آموزشگاه تقویتی و کنکور ستارگان" : "مؤسسه علمی ستارگان نسیم‌شهر";
  const description = (al.description?.trim() || `${fa(al._count.photos)} عکس از «${al.title}» — گالری ${where}.`).slice(0, 170);
  const cover = al.photos[0]?.path;
  return buildMeta({
    title: `${al.title} | گالری ستارگان`,
    absoluteTitle: true,
    description,
    path: `/gallery/${al.slug}`,
    ...(cover ? { images: [{ url: cover, alt: al.title }] } : {}),
  });
}

export default async function Album({ params }: P) {
  const { slug } = await params;
  const al = await prisma.galleryAlbum.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!al || !al.published) notFound();
  return (
    <>
      <PageHero eyebrow={`گالری · ${fa(al.photos.length)} تصویر`} title={al.title} text={al.description ?? undefined} accent={al.center === "ghalamchi" ? "gc" : al.center === "education" ? "edu" : "gold"}>
        <Link href="/gallery" className="btn-ghost mt-6 text-sm">→ همه آلبوم‌ها</Link>
      </PageHero>
      <div className="container-x columns-2 gap-3 py-10 md:columns-3 [&>a]:mb-3">
        {al.photos.map((p) => (
          <a key={p.id} href={p.path} target="_blank" rel="noopener" className="block break-inside-avoid overflow-hidden rounded-2xl bg-line">
            <img {...responsive(p.path, "(min-width: 768px) 33vw, 50vw", 960)} alt={p.caption || al.title} loading="lazy" decoding="async" className="w-full" />
          </a>
        ))}
      </div>
    </>
  );
}
