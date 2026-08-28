import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { loadPublicGalleryAlbumBySlug } from "@/lib/website/gallery-public";

export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = await loadPublicGalleryAlbumBySlug(slug);
  if (!album) {
    return createPageMetadata({
      title: "آلبوم یافت نشد | ستارگان پلاس",
      description: "آلبوم درخواستی در گالری ستارگان پلاس یافت نشد.",
      path: `/gallery/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  return createPageMetadata({
    title: `${album.title} | گالری ستارگان پلاس`,
    description:
      album.description?.trim() ||
      `مجموعه تصاویر «${album.title}» از فعالیت‌ها و فضای آموزشی ستارگان پلاس.`,
    path: `/gallery/${slug}`,
    keywords: ["گالری", album.title, "ستارگان پلاس"],
  });
}

export default async function GalleryAlbumPage({ params }: PageProps) {
  const { slug } = await params;
  const album = await loadPublicGalleryAlbumBySlug(slug);
  if (!album) notFound();

  return (
    <SiteShell activePath="/gallery">
      <PageHero
        title={album.title}
        subtitle={album.description || "تصاویر این آلبوم"}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "گالری", href: "/gallery" },
          { label: album.title },
        ]}
      />
      <Container className="py-10 sm:py-14">
        <GalleryMasonry
          items={album.items.map((item) => ({
            id: item.id,
            url: item.url,
            alt: item.alt,
            title: item.title,
            caption: item.caption,
          }))}
        />
      </Container>
    </SiteShell>
  );
}
