import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { StudentAchievementsSection } from "@/components/achievements/StudentAchievementsSection";
import { StudentAssessmentHistorySection } from "@/components/assessments/StudentAssessmentHistorySection";
import { loadPublicAssessmentHistoryForStudent } from "@/lib/assessment/results";
import { loadPublicAchievementsForStudent } from "@/lib/website/achievements";
import { loadPublicStudentBySlug } from "@/lib/website/students";
import { siteConfig } from "@/content/site";

/** Student pages refresh via revalidatePath after admin edits. */
export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const student = await loadPublicStudentBySlug(slug);
  if (!student) {
    return { title: "دانش‌آموز یافت نشد" };
  }

  const title =
    student.seoTitle?.trim() || `${student.fullName} | دانش‌آموزان ستارگان`;
  const description =
    student.seoDescription?.trim() ||
    `${student.fullName}، ${student.gradeName}${
      student.majorName ? ` · ${student.majorName}` : ""
    }${
      student.schoolYear ? ` · ${student.schoolYear}` : ""
    } — مؤسسه علمی ستارگان`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(student.portraitUrl
        ? { images: [{ url: student.portraitUrl, alt: student.portraitAlt }] }
        : {}),
    },
  };
}

export default async function StudentProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const student = await loadPublicStudentBySlug(slug);
  if (!student) notFound();

  const [achievements, assessmentHistory] = await Promise.all([
    loadPublicAchievementsForStudent(student.id),
    loadPublicAssessmentHistoryForStudent(student.id),
  ]);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: student.fullName,
    givenName: student.firstName,
    familyName: student.lastName,
    description: student.biography || undefined,
    image: student.portraitUrl || undefined,
    memberOf: {
      "@type": "EducationalOrganization",
      name: "مؤسسه علمی ستارگان",
      alternateName: siteConfig.name,
    },
  };

  return (
    <SiteShell activePath="/students">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <PageHero
        title={student.fullName}
        subtitle={`${student.gradeName}${
          student.majorName ? ` · ${student.majorName}` : ""
        }${student.schoolYear ? ` · ${student.schoolYear}` : ""}`}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "دانش‌آموزان", href: "/students" },
          { label: student.fullName },
        ]}
      />
      <Container className="py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="admin-card overflow-hidden p-4">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/15">
              {student.portraitUrl ? (
                <Image
                  src={student.portraitUrl}
                  alt={student.portraitAlt}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 280px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl font-bold text-primary/40">
                  {student.fullName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-muted">پایه: </span>
                {student.gradeName}
              </p>
              {student.majorName ? (
                <p>
                  <span className="text-muted">رشته: </span>
                  {student.majorName}
                </p>
              ) : null}
              {student.schoolYear ? (
                <p>
                  <span className="text-muted">سال تحصیلی: </span>
                  {student.schoolYear}
                </p>
              ) : null}
              {student.parentName ? (
                <p>
                  <span className="text-muted">ولی: </span>
                  {student.parentName}
                </p>
              ) : null}
            </div>
          </aside>

          <div className="space-y-6">
            <article className="admin-card space-y-5 p-6 sm:p-8">
              <div className="prose prose-slate max-w-none text-base leading-8 text-foreground">
                {student.biography ? (
                  student.biography.split(/\n+/).map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 24)}`}>
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-muted">معرفی هنوز ثبت نشده است.</p>
                )}
              </div>
              <Link
                href="/students"
                className="inline-flex text-sm text-primary underline"
              >
                بازگشت به فهرست دانش‌آموزان
              </Link>
            </article>

            <StudentAchievementsSection
              achievements={achievements}
              studentName={student.fullName}
            />

            <StudentAssessmentHistorySection
              results={assessmentHistory}
              studentName={student.fullName}
            />
          </div>
        </div>
      </Container>
    </SiteShell>
  );
}
