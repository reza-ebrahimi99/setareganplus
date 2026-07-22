import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddSectionForm } from "@/components/admin/website/page-builder/AddSectionForm";
import { PageSettingsForm } from "@/components/admin/website/page-builder/PageSettingsForm";
import { SectionList } from "@/components/admin/website/page-builder/SectionList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requirePermission } from "@/lib/auth/require-admin";
import { getPublicPagePath } from "@/lib/website/page-builder/public-path";
import { getAdminWebsitePage } from "@/lib/website/page-builder/pages-admin";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ pageId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requirePermission("website.manage");
  const { pageId } = await params;
  const page = await getAdminWebsitePage(session.organization.id, pageId);
  return { title: page ? `ویرایش: ${page.title}` : "صفحه" };
}

export default async function AdminWebsitePageEditorPage({ params }: Props) {
  const session = await requirePermission("website.manage");
  const { pageId } = await params;
  const page = await getAdminWebsitePage(session.organization.id, pageId);
  if (!page) notFound();

  const publicPath = getPublicPagePath(page.slug);

  return (
    <>
      <AdminPageHeader
        title={page.title}
        description={`ویرایش صفحه «${page.slug}»`}
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "صفحات", href: "/admin/website/pages" },
          { label: page.title },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href={`/admin/website/pages/${page.id}/preview`}
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          پیش‌نمایش
        </Link>
        <Link
          href={publicPath}
          target="_blank"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          مسیر عمومی
        </Link>
        <Link
          href="/admin/website/pages"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
        >
          بازگشت به فهرست
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <PageSettingsForm
            page={{
              id: page.id,
              slug: page.slug,
              title: page.title,
              seoTitle: page.seoTitle,
              seoDescription: page.seoDescription,
              status: page.status,
              publishedSectionCount: page.publishedSectionCount,
              publicPath,
            }}
          />
        </div>
        <div className="space-y-4 lg:col-span-8">
          <AddSectionForm pageId={page.id} />
          <SectionList sections={page.sections} />
        </div>
      </div>
    </>
  );
}
