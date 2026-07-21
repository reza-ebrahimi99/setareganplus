import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSectionsRenderer } from "@/components/website/page-builder/SectionRenderer";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadPreviewWebsitePage } from "@/lib/website/page-builder/pages-public";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ pageId: string }>;
};

export const metadata: Metadata = {
  title: "پیش‌نمایش صفحه",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitePagePreview({ params }: Props) {
  const session = await requirePermission("website.manage");
  const { pageId } = await params;
  const page = await loadPreviewWebsitePage(session.organization.id, pageId);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p>
            پیش‌نمایش مدیریتی — بخش‌های پیش‌نویس و منتشرشده نمایش داده می‌شوند.
            این صفحه ایندکس نمی‌شود.
          </p>
          <Link
            href={`/admin/website/pages/${pageId}`}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-medium"
          >
            بازگشت به ویرایشگر
          </Link>
        </div>
      </div>
      <PageSectionsRenderer sections={page.sections} />
      {page.sections.length === 0 ? (
        <p className="mx-auto max-w-6xl px-4 py-16 text-center text-muted">
          هیچ بخش قابل‌نمایشی برای پیش‌نمایش وجود ندارد.
        </p>
      ) : null}
    </div>
  );
}
