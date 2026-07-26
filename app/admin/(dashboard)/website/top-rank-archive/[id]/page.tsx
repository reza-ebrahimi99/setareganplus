import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopRankArchiveForm } from "@/components/admin/website/TopRankArchiveForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import { toPersianDigits } from "@/lib/persian";
import { TOP_RANK_ARCHIVE_ADMIN_PATH } from "@/lib/website/top-rank-archive-constants";
import { loadAdminTopRankArchive } from "@/lib/website/top-rank-archive-admin";

export const metadata: Metadata = { title: "ویرایش آرشیو رتبه برتر" };

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopRankArchiveEditPage({ params }: PageProps) {
  const session = await requirePermission("website.manage");
  const { id } = await params;
  const archive = await loadAdminTopRankArchive(session.organization.id, id);
  if (!archive) notFound();

  return (
    <>
      <AdminPageHeader
        title={`ویرایش سال ${toPersianDigits(archive.year)}`}
        description={archive.displayTitle}
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "آرشیو رتبه‌ها", href: TOP_RANK_ARCHIVE_ADMIN_PATH },
          { label: toPersianDigits(archive.year) },
        ]}
      />
      <TopRankArchiveForm mode="edit" archive={archive} />
    </>
  );
}
