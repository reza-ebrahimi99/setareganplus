import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { AssessmentResultCard } from "@/components/assessments/AssessmentResultCard";
import { loadPublicAssessmentBySlug } from "@/lib/assessment/assessments";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import { siteConfig } from "@/content/site";
import type { PublicAssessmentResultCard } from "@/lib/assessment/results";

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

  const featuredResults: PublicAssessmentResultCard[] =
    assessment.results.map((row) => ({
      id: row.id,
      score: row.score,
      scaledScore: row.scaledScore,
      rankSchool: row.rankSchool,
      rankCity: row.rankCity,
      rankProvince: row.rankProvince,
      rankCountry: row.rankCountry,
      percentile: row.percentile,
      growth: null,
      isFeatured: true,
      studentName: row.student.fullName,
      studentSlug: row.student.slug,
      gradeName: row.student.grade.name,
      assessmentTitle: assessment.title,
      assessmentSlug: assessment.slug,
      assessmentDate: assessment.assessmentDate,
      schoolYear: assessment.schoolYear,
      providerName: assessment.provider.name,
      providerColor: assessment.provider.color,
      assessmentTypeLabel: assessment.assessmentTypeLabel,
    }));

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
              <div>
                <dt className="text-muted">شرکت‌کنندگان</dt>
                <dd className="font-medium text-primary">
                  {assessment.participants != null
                    ? toPersianDigits(assessment.participants)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">نتایج ثبت‌شده</dt>
                <dd className="font-medium text-primary">
                  {toPersianDigits(assessment._count.results)}
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

          <aside className="space-y-4">
            <h2 className="text-lg font-bold text-primary">نتایج ویژه</h2>
            {featuredResults.length === 0 ? (
              <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-sm text-muted">
                هنوز نتیجه ویژه‌ای برای این آزمون منتشر نشده است.
              </p>
            ) : (
              featuredResults.map((result) => (
                <AssessmentResultCard key={result.id} result={result} />
              ))
            )}
          </aside>
        </div>
      </Container>
    </SiteShell>
  );
}
