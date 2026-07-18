import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { AssessmentDirectory } from "@/components/assessments/AssessmentDirectory";
import { SiteShell } from "@/components/layout/SiteShell";
import { listPublicAssessmentProviders } from "@/lib/assessment/providers";
import {
  loadPublicAssessmentPage,
} from "@/lib/assessment/assessments";
import { isAssessmentType } from "@/lib/assessment/types";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { listPublicStudentGrades } from "@/lib/website/student-grades";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "آزمون | مؤسسه علمی ستارگان",
  description:
    "آزمون‌های قلم‌چی، مدرسه، میان‌ترم، پایان‌ترم، المپیاد و ورودی دانش‌آموزان مؤسسه علمی ستارگان.",
  openGraph: {
    title: "آزمون | مؤسسه علمی ستارگان",
    description:
      "فهرست آزمون‌ها و نتایج منتشرشده دانش‌آموزان مؤسسه علمی ستارگان.",
  },
};

type PageProps = {
  searchParams: Promise<{
    q?: string;
    provider?: string;
    grade?: string;
    type?: string;
    schoolYear?: string;
    page?: string;
  }>;
};

export default async function AssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const provider = typeof params.provider === "string" ? params.provider : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const typeRaw = typeof params.type === "string" ? params.type : "";
  const assessmentType = isAssessmentType(typeRaw) ? typeRaw : undefined;
  const schoolYear =
    typeof params.schoolYear === "string" ? params.schoolYear : "";
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const organization = await getCurrentOrganization();
  const [data, providers, grades] = await Promise.all([
    loadPublicAssessmentPage({
      q,
      providerSlug: provider || undefined,
      gradeSlug: grade || undefined,
      assessmentType,
      schoolYear: schoolYear || undefined,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    organization
      ? listPublicAssessmentProviders(organization.id)
      : Promise.resolve([]),
    organization
      ? listPublicStudentGrades(organization.id)
      : Promise.resolve([]),
  ]);

  return (
    <SiteShell activePath="/assessments">
      <PageHero
        title="آزمون"
        subtitle="قلم‌چی، آزمون‌های مدرسه، میان‌ترم، پایان‌ترم، المپیاد و ورودی."
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "آزمون" },
        ]}
      />
      <Container className="py-10 sm:py-14">
        {data ? (
          <AssessmentDirectory
            data={data}
            query={q}
            activeProvider={provider}
            activeGrade={grade}
            activeType={assessmentType ?? ""}
            activeSchoolYear={schoolYear}
            providers={providers.map((item) => ({
              slug: item.slug,
              name: item.name,
            }))}
            grades={grades.map((item) => ({
              slug: item.slug,
              name: item.name,
            }))}
          />
        ) : (
          <p className="text-muted">بارگذاری فهرست آزمون‌ها ممکن نشد.</p>
        )}
      </Container>
    </SiteShell>
  );
}
