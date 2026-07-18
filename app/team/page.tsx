import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { TeamDirectory } from "@/components/team/TeamDirectory";
import { SiteShell } from "@/components/layout/SiteShell";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { loadPublicTeamPage } from "@/lib/website/load-team";
import { listPublicTeamDepartments } from "@/lib/website/team-departments";

/** ISR-friendly; mutations call revalidatePath("/team"). */
export const revalidate = 120;

export const metadata: Metadata = {
  title: "تیم مؤسسه علمی ستارگان",
  description:
    "آشنایی با مدیران، معلمان، مشاوران و همکاران مؤسسه علمی ستارگان در واحدهای آموزشی و اجرایی.",
  openGraph: {
    title: "تیم مؤسسه علمی ستارگان",
    description:
      "معرفی اعضای تیم مدیریتی و آموزشی مؤسسه علمی ستارگان.",
  },
};

type PageProps = {
  searchParams: Promise<{ q?: string; department?: string; page?: string }>;
};

export default async function TeamPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const department =
    typeof params.department === "string" ? params.department : "";
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const organization = await getCurrentOrganization();
  const [data, allDepartments] = await Promise.all([
    loadPublicTeamPage({
      q,
      departmentSlug: department || undefined,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    organization
      ? listPublicTeamDepartments(organization.id)
      : Promise.resolve([]),
  ]);

  return (
    <SiteShell activePath="/team">
      <PageHero
        title="تیم مؤسسه علمی ستارگان"
        subtitle="مجموعه‌ای از مدیران، معلمان، مشاوران و همکاران اجرایی که خدمات آموزشی مؤسسه را در واحدهای مختلف هدایت می‌کنند."
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "تیم ما" },
        ]}
      />
      <Container className="py-10 sm:py-14">
        {data ? (
          <TeamDirectory
            data={data}
            activeDepartment={department}
            query={q}
            allDepartments={allDepartments.map((item) => ({
              slug: item.slug,
              name: item.name,
            }))}
          />
        ) : (
          <p className="text-muted">بارگذاری فهرست تیم ممکن نشد.</p>
        )}
      </Container>
    </SiteShell>
  );
}
