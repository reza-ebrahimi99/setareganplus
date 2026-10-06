import { AcademyShell } from "@/components/academy/AcademyShell";
import { AcademyCourseCard } from "@/components/academy/AcademyCourseCard";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { listPublishedCourses } from "@/lib/academy/catalog";

export const metadata = { title: "دوره‌ها" };

export default async function AcademyCoursesPage() {
  const organizationId = await getAcademyOrganizationId();
  const courses = await listPublishedCourses(organizationId);

  return (
    <AcademyShell>
      <section className="academy-section academy-container">
        <h1 className="academy-section-title">دوره‌های آموزشی</h1>
        <p className="academy-section-sub">مسیرهای یادگیری ساختاریافته آکادمی ستارگان</p>
        {courses.length === 0 ? (
          <div className="academy-card academy-empty mt-8">
            <div className="academy-empty-icon" aria-hidden>
              ★
            </div>
            <p className="academy-empty-title">دوره‌های جدید به‌زودی منتشر می‌شوند.</p>
            <p className="academy-empty-desc">
              به محض انتشار اولین دوره، از همین صفحه دسترسی خواهید داشت.
            </p>
          </div>
        ) : (
          <div className="academy-course-grid mt-8">
            {courses.map((course) => (
              <AcademyCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </AcademyShell>
  );
}
