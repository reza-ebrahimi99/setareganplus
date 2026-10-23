/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/site/Star";
import { accentOf } from "@/components/site/cards";
import { fa } from "@/lib/format";

export const metadata: Metadata = { title: "گالری", description: "آلبوم‌های تصاویر مؤسسه علمی ستارگان." };

export default async function Gallery() {
  const albums = await prisma.galleryAlbum.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, include: { _count: { select: { photos: true } } } });
  return (
    <>
      <PageHero eyebrow="گالری" title="لحظه‌هایی از ستارگان" text="آزمون‌ها، کلاس‌ها و جلسات مشاوره در یک نگاه." />
      <div className="container-x grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((al) => {
          const a = al.center ? accentOf(al.center) : null;
          return (
            <Link key={al.id} href={`/gallery/${al.slug}`} className="group card overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden bg-line">
                {al.cover && <img src={al.cover} alt={al.title} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                {a && <span className={`absolute inset-x-0 bottom-0 h-1.5 ${a.bg}`} />}
              </div>
              <div className="p-5">
                <h2 className="font-extrabold text-navy">{al.title}</h2>
                <p className="mt-1 text-sm text-muted">{fa(al._count.photos)} تصویر</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
