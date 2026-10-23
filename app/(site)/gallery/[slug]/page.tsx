/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/site/Star";
import { fa } from "@/lib/format";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const al = await prisma.galleryAlbum.findUnique({ where: { slug: decodeURIComponent(slug) } });
  return { title: al?.title ?? "گالری" };
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
            <img src={p.path} alt={p.caption ?? al.title} loading="lazy" className="w-full" />
          </a>
        ))}
      </div>
    </>
  );
}
