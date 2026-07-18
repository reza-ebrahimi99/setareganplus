import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { StudentDirectory } from "@/components/students/StudentDirectory";
import { SiteShell } from "@/components/layout/SiteShell";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import {
  listPublicStudentGrades,
  loadPublicStudentPage,
} from "@/lib/website/students";

/** ISR-friendly; mutations call revalidatePath("/students"). */
export const revalidate = 120;

export const metadata: Metadata = {
  title: "دانش‌آموزان مؤسسه علمی ستارگان",
  description:
    "آشنایی با دانش‌آموزان واحدهای آموزشی مؤسسه علمی ستارگان به تفکیک پایه تحصیلی.",
  openGraph: {
    title: "دانش‌آموزان مؤسسه علمی ستارگان",
    description:
      "معرفی دانش‌آموزان و پروفایل‌های عمومی واحدهای آموزشی مؤسسه علمی ستارگان.",
  },
};

type PageProps = {
  searchParams: Promise<{ q?: string; grade?: string; page?: string }>;
};

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const organization = await getCurrentOrganization();
  const [data, allGrades] = await Promise.all([
    loadPublicStudentPage({
      q,
      gradeSlug: grade || undefined,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    organization
      ? listPublicStudentGrades(organization.id)
      : Promise.resolve([]),
  ]);

  return (
    <SiteShell activePath="/students">
      <PageHero
        title="دانش‌آموزان مؤسسه علمی ستارگان"
        subtitle="پروفایل دانش‌آموزان واحدهای آموزشی مؤسسه، به تفکیک پایه و سال تحصیلی."
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "دانش‌آموزان" },
        ]}
      />
      <Container className="py-10 sm:py-14">
        {data ? (
          <StudentDirectory
            data={data}
            activeGrade={grade}
            query={q}
            allGrades={allGrades.map((item) => ({
              slug: item.slug,
              name: item.name,
            }))}
          />
        ) : (
          <p className="text-muted">بارگذاری فهرست دانش‌آموزان ممکن نشد.</p>
        )}
      </Container>
    </SiteShell>
  );
}
