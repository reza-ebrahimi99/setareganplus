import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { galleryContent } from "@/content/home";
import { loadPublicGalleryAlbums } from "@/lib/website/gallery-public";
import { toPersianDigits } from "@/lib/persian";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "گالری تصاویر",
  description:
    "گالری تصاویر فعالیت‌ها، رویدادها و فضای آموزشی مجموعه ستارگان — بدون انتشار هویت فردی.",
};

export default async function GalleryPage() {
  const albums = await loadPublicGalleryAlbums();

  return (
    <SiteShell activePath="/gallery">
      <PageHero
        title={galleryContent.heading}
        subtitle={galleryContent.description}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "گالری" },
        ]}
      />
      <Container className="py-10 sm:py-14">
        {albums.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white px-4 py-12 text-center text-sm leading-7 text-muted">
            هنوز آلبوم فعالی برای نمایش عمومی منتشر نشده است.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <li key={album.id}>
                <Link
                  href={`/gallery/${album.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 focus-visible:ring-offset-2"
                >
                  <div className="relative aspect-[4/3] bg-primary/[0.03]">
                    {album.coverUrl ? (
                      <Image
                        src={album.coverUrl}
                        alt={album.coverAlt}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1.5 p-4">
                    <h2 className="text-base font-semibold text-primary">
                      {album.title}
                    </h2>
                    {album.description ? (
                      <p className="text-sm leading-7 text-muted line-clamp-2">
                        {album.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-secondary">
                      {toPersianDigits(String(album.itemCount))} تصویر
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </SiteShell>
  );
}
