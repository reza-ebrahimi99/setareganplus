import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { loadPublicGalleryAlbumBySlug } from "@/lib/website/gallery-public";

export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = await loadPublicGalleryAlbumBySlug(slug);
  if (!album) return { title: "آلبوم یافت نشد" };

  return {
    title: `${album.title} | گالری`,
    description:
      album.description?.trim() ||
      `گالری تصاویر «${album.title}» در مجموعه ستارگان.`,
  };
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
