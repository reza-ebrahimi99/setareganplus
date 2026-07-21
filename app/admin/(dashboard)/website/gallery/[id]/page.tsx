import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GalleryAlbumEditor } from "@/components/admin/website/GalleryAlbumEditor";
import { requirePermission } from "@/lib/auth/require-admin";
import { getAdminGalleryAlbum } from "@/lib/website/gallery-admin";
import { listAdminMediaAssets } from "@/lib/website/media-library-admin";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `آلبوم ${id.slice(0, 8)}` };
}

export default async function AdminGalleryAlbumDetailPage({
  params,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const { id } = await params;
  const [album, library] = await Promise.all([
    getAdminGalleryAlbum(session.organization.id, id),
    listAdminMediaAssets(session.organization.id, {
      status: "ACTIVE",
      page: 1,
      sort: "newest",
    }),
  ]);
  if (!album) notFound();

  // Load more library pages for picker (cap at 3 pages / 72 items).
  const morePages = await Promise.all(
    Array.from({ length: Math.min(2, library.totalPages - 1) }, (_, index) =>
      listAdminMediaAssets(session.organization.id, {
        status: "ACTIVE",
        page: index + 2,
        sort: "newest",
      }),
    ),
  );
  const libraryOptions = [
    ...library.items,
    ...morePages.flatMap((page) => page.items),
  ].map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    category: item.category,
  }));

  return (
    <>
      <AdminPageHeader
        title={album.title}
        description="ویرایش آلبوم، کاور، ترتیب و تصاویر"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "آلبوم‌های گالری", href: "/admin/website/gallery" },
          { label: album.title },
        ]}
        compact
      />
      <GalleryAlbumEditor album={album} libraryOptions={libraryOptions} />
    </>
  );
}
