import Link from "next/link";
import { StudentFilters } from "@/components/students/StudentFilters";
import { StudentCard } from "@/components/students/StudentCard";
import type { PublicStudentPageData } from "@/lib/website/students";
import { toPersianDigits } from "@/lib/persian";

type StudentDirectoryProps = {
  data: PublicStudentPageData;
  allGrades: Array<{ slug: string; name: string }>;
  activeGrade: string;
  query: string;
};

function pageHref(page: number, query: string, grade: string): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (grade) params.set("grade", grade);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/students?${qs}` : "/students";
}

export function StudentDirectory({
  data,
  allGrades,
  activeGrade,
  query,
}: StudentDirectoryProps) {
  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">دانش‌آموزان فعال</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {toPersianDigits(data.totalStudents)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">پایه‌ها</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {toPersianDigits(data.gradeCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">مؤسسه</p>
          <p className="mt-1 text-base font-semibold text-primary">
            علمی ستارگان
          </p>
        </div>
      </div>

      <StudentFilters
        grades={allGrades}
        activeGrade={activeGrade}
        initialQuery={query}
      />

      <div className="space-y-12">
        {data.grades.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-muted">
            دانش‌آموزی با این فیلترها یافت نشد.
          </p>
        ) : (
          data.grades.map((grade) => (
            <section
              key={grade.id}
              aria-labelledby={`grade-${grade.slug}`}
            >
              <h2
                id={`grade-${grade.slug}`}
                className="border-b border-border pb-3 text-xl font-bold text-primary"
              >
                {grade.name}
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {grade.students.map((student) => (
                  <StudentCard key={student.id} student={student} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {data.pageCount > 1 ? (
        <nav
          aria-label="صفحه‌بندی دانش‌آموزان"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          <p className="text-sm text-muted">
            صفحه {toPersianDigits(data.page)} از {toPersianDigits(data.pageCount)}
            {" · "}
            نمایش تا {toPersianDigits(data.pageSize)} نفر در هر صفحه
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={pageHref(data.page - 1, query, activeGrade)}
                className="min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm"
              >
                قبلی
              </Link>
            ) : null}
            {data.page < data.pageCount ? (
              <Link
                href={pageHref(data.page + 1, query, activeGrade)}
                className="min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm"
              >
                بعدی
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
