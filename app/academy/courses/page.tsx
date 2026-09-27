import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyCourseCard } from "@/components/academy/AcademyCourseCard";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { listPublishedCourses } from "@/lib/academy/catalog";

export const metadata = { title: "دوره‌ها" };

export default async function AcademyCoursesPage() {
  const organizationId = await getAcademyOrganizationId();
  const courses = await listPublishedCourses(organizationId);

  return (
    <AcademyShell activePath="/courses">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-bold text-primary">دوره‌های آموزشی</h1>
        <p className="mt-2 text-muted">مسیرهای یادگیری ساختاریافته آکادمی ستارگان</p>
        {courses.length === 0 ? (
          <div className="academy-card mt-10 p-12 text-center text-muted">
            هنوز دوره‌ای منتشر نشده است.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <AcademyCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </AcademyShell>
  );
}
