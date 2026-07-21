import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MediaAssetEditor } from "@/components/admin/website/MediaAssetEditor";
import { requirePermission } from "@/lib/auth/require-admin";
import { getAdminMediaAsset } from "@/lib/website/media-library-admin";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `رسانه ${id.slice(0, 8)}` };
}

export default async function AdminMediaAssetDetailPage({ params }: PageProps) {
  const session = await requirePermission("website.manage");
  const { id } = await params;
  const asset = await getAdminMediaAsset(session.organization.id, id);
  if (!asset) notFound();

  return (
    <>
      <AdminPageHeader
        title={asset.title || "ویرایش رسانه"}
        description="ویرایش عنوان، توضیح، alt، دسته و وضعیت — حذف فقط بدون وابستگی"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "کتابخانه رسانه", href: "/admin/website/media" },
          { label: asset.title || "جزئیات" },
        ]}
        compact
      />
      <MediaAssetEditor asset={asset} />
    </>
  );
}
