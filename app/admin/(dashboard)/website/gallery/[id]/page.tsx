import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GalleryAlbumEditor } from "@/components/admin/website/GalleryAlbumEditor";
import { requirePermission } from "@/lib/auth/require-admin";
import { getAdminGalleryAlbum } from "@/lib/website/gallery-admin";

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
  const album = await getAdminGalleryAlbum(session.organization.id, id);
  if (!album) notFound();

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
      <GalleryAlbumEditor album={album} />
    </>
  );
}
