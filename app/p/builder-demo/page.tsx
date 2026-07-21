import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { PageSectionsRenderer } from "@/components/website/page-builder/SectionRenderer";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { EXPERIMENTAL_PUBLIC_PATH } from "@/lib/website/page-builder/constants";
import { loadPublishedBuilderDemoPage } from "@/lib/website/page-builder/pages-public";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const organization = await getCurrentOrganization();
    const page = await loadPublishedBuilderDemoPage(organization.id);
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

export default async function BuilderDemoPublicPage() {
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    notFound();
  }

  const page = await loadPublishedBuilderDemoPage(organization.id);
  if (!page) notFound();

  return (
    <SiteShell activePath={EXPERIMENTAL_PUBLIC_PATH}>
      <PageSectionsRenderer sections={page.sections} />
      {page.sections.length === 0 ? (
        <p className="mx-auto max-w-6xl px-4 py-20 text-center text-muted">
          محتوایی برای نمایش وجود ندارد.
        </p>
      ) : null}
    </SiteShell>
  );
}
