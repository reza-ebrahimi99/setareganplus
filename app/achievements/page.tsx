import { Container } from "@/components/ui/Container";
import { AchievementDirectory } from "@/components/achievements/AchievementDirectory";
import { AchievementShowcase } from "@/components/achievements/AchievementShowcase";
import { SiteShell } from "@/components/layout/SiteShell";
import {
  achievementItems,
  achievementsContent,
} from "@/content/home";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import {
  listPublicAchievementCategories,
  loadFeaturedAchievements,
  loadPublicAchievementPage,
  loadPublicAchievementTimeline,
} from "@/lib/website/achievements";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";
import { listPublicStudentGrades } from "@/lib/website/student-grades";

export const revalidate = 120;

export const metadata = getPublicPageMetadata("achievements");

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    grade?: string;
    schoolYear?: string;
    page?: string;
  }>;
};

export default async function AchievementsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const schoolYear =
    typeof params.schoolYear === "string" ? params.schoolYear : "";
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const organization = await getCurrentOrganization();
  const [data, categories, grades, featured, timeline] = await Promise.all([
    loadPublicAchievementPage({
      q,
      categorySlug: category || undefined,
      gradeSlug: grade || undefined,
      schoolYear: schoolYear || undefined,
      page,
    }),
    organization
      ? listPublicAchievementCategories(organization.id)
      : Promise.resolve([]),
    organization
      ? listPublicStudentGrades(organization.id)
      : Promise.resolve([]),
    loadFeaturedAchievements(),
    loadPublicAchievementTimeline(),
  ]);

  return (
    <SiteShell activePath="/achievements">
      <AchievementShowcase
        eyebrow="ویترین افتخارات"
        heading="افتخارات مؤسسه علمی ستارگان"
        description="المپیادها، پذیرش مدارس استعداد، مسابقات، افتخارات قلم‌چی و گواهی‌های مؤسسه — بدون انتشار هویت فردی."
        headingId="page-heading"
        metrics={achievementItems}
        featured={featured}
        timeline={timeline}
        timelineHeading={achievementsContent.timelineHeading}
        timelineDescription={achievementsContent.timelineDescription}
        cta={achievementsContent.showcaseCta}
        variant="page"
      />
      <Container className="py-10 sm:py-14">
        {data ? (
          <AchievementDirectory
            data={data}
            query={q}
            activeCategory={category}
            activeGrade={grade}
            activeSchoolYear={schoolYear}
            categories={categories.map((item) => ({
              slug: item.slug,
              name: item.name,
            }))}
            grades={grades.map((item) => ({
              slug: item.slug,
              name: item.name,
            }))}
          />
        ) : (
          <p className="text-muted">بارگذاری فهرست افتخارات ممکن نشد.</p>
        )}
      </Container>
    </SiteShell>
  );
}
