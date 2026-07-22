import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentTopResultsSection } from "@/components/assessments/AssessmentTopResultsSection";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { loadPublicAssessmentBySlug } from "@/lib/assessment/assessments";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { siteConfig } from "@/content/site";

export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const assessment = await loadPublicAssessmentBySlug(slug);
  if (!assessment) return { title: "آزمون یافت نشد" };

  const title = `${assessment.title} | آزمون ستارگان`;
  const description =
    assessment.description?.trim() ||
    `${assessment.title} — ${assessment.provider.name} · ${assessment.grade.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const assessment = await loadPublicAssessmentBySlug(slug);
  if (!assessment) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: assessment.title,
    description: assessment.description || undefined,
    startDate: assessment.assessmentDate?.toISOString() || undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: {
      "@type": "EducationalOrganization",
      name: "مؤسسه علمی ستارگان",
      alternateName: siteConfig.name,
    },
    about: {
      "@type": "Thing",
      name: assessment.assessmentTypeLabel,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "آزمون",
        item: "/assessments",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: assessment.title,
        item: `/assessments/${assessment.slug}`,
      },
    ],
  };

  return (
    <SiteShell activePath="/assessments">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PageHero
        title={assessment.title}
        subtitle={`${assessment.provider.name} · ${assessment.grade.name} · ${assessment.assessmentTypeLabel}`}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "آزمون", href: "/assessments" },
          { label: assessment.title },
        ]}
      />
      <Container className="py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="admin-card space-y-5 p-6 sm:p-8">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">سال تحصیلی</dt>
                <dd className="font-medium text-primary">
                  {assessment.schoolYear || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">تاریخ</dt>
                <dd className="font-medium text-primary">
                  {assessment.assessmentDate
                    ? formatJalaliDateShort(assessment.assessmentDate)
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="prose prose-slate max-w-none text-base leading-8 text-foreground">
              {assessment.description ? (
                assessment.description.split(/\n+/).map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))
              ) : (
                <p className="text-muted">توضیحات بیشتری ثبت نشده است.</p>
              )}
            </div>

            <Link
              href="/assessments"
              className="inline-flex text-sm text-primary underline"
            >
              بازگشت به فهرست آزمون‌ها
            </Link>
          </article>

          <aside className="admin-card space-y-3 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-primary">نتایج فردی</h2>
            <p className="text-sm leading-7 text-muted">
              نتایج کامل دانش‌آموزان به‌صورت عمومی منتشر نمی‌شود و فقط از طریق
              پرتال امن اولیا و دانش‌آموزان قابل مشاهده است.
            </p>
            <Link
              href="/portal"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
            >
              ورود به پرتال
            </Link>
          </aside>
        </div>

        {assessment.publishFeaturedResults ? (
          <div className="mt-10">
            <AssessmentTopResultsSection
              groups={assessment.topResultsByGrade}
              showEmptyState
            />
          </div>
        ) : null}
      </Container>
    </SiteShell>
  );
}
