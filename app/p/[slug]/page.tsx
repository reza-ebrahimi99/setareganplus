import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { PageSectionsRenderer } from "@/components/website/page-builder/SectionRenderer";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { getPublicPagePath } from "@/lib/website/page-builder/public-path";
import { loadPublishedPageBySlug } from "@/lib/website/page-builder/pages-public";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const organization = await getCurrentOrganization();
    const page = await loadPublishedPageBySlug(organization.id, slug);
    if (!page) {
      return { title: "صفحه یافت نشد", robots: { index: false } };
    }
    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || undefined,
    };
  } catch {
    return { title: "صفحه یافت نشد", robots: { index: false } };
  }
}

export default async function PublicWebsitePageBySlug({ params }: Props) {
  const { slug } = await params;

  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const page = await loadPublishedPageBySlug(organization.id, slug);
  if (!page) notFound();

  const publicPath = getPublicPagePath(page.slug);

  return (
    <SiteShell activePath={publicPath}>
      <PageSectionsRenderer sections={page.sections} />
      {page.sections.length === 0 ? (
        <p className="mx-auto max-w-6xl px-4 py-20 text-center text-muted">
          محتوایی برای نمایش وجود ندارد.
        </p>
      ) : null}
    </SiteShell>
  );
}
