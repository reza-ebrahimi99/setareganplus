import Link from "next/link";
import { AchievementCard } from "@/components/achievements/AchievementCard";
import { AchievementFilters } from "@/components/achievements/AchievementFilters";
import type { PublicAchievementPageData } from "@/lib/website/achievements";
import { toPersianDigits } from "@/lib/persian";

type AchievementDirectoryProps = {
  data: PublicAchievementPageData;
  categories: Array<{ slug: string; name: string }>;
  grades: Array<{ slug: string; name: string }>;
  activeCategory: string;
  activeGrade: string;
  activeSchoolYear: string;
  query: string;
};

function pageHref(
  page: number,
  query: string,
  category: string,
  grade: string,
  schoolYear: string,
) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (category) params.set("category", category);
  if (grade) params.set("grade", grade);
  if (schoolYear) params.set("schoolYear", schoolYear);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/achievements?${qs}` : "/achievements";
}

export function AchievementDirectory({
  data,
  categories,
  grades,
  activeCategory,
  activeGrade,
  activeSchoolYear,
  query,
}: AchievementDirectoryProps) {
  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">افتخارات منتشرشده</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {toPersianDigits(data.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">مؤسسه</p>
          <p className="mt-1 text-base font-semibold text-primary">
            علمی ستارگان
          </p>
        </div>
      </div>

      <AchievementFilters
        categories={categories}
        grades={grades}
        schoolYears={data.schoolYears}
        activeCategory={activeCategory}
        activeGrade={activeGrade}
        activeSchoolYear={activeSchoolYear}
        initialQuery={query}
      />

      {data.achievements.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-muted">
          افتخاری با این فیلترها یافت نشد.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}

      {data.pageCount > 1 ? (
        <nav
          aria-label="صفحه‌بندی افتخارات"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          <p className="text-sm text-muted">
            صفحه {toPersianDigits(data.page)} از{" "}
            {toPersianDigits(data.pageCount)}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={pageHref(
                  data.page - 1,
                  query,
                  activeCategory,
                  activeGrade,
                  activeSchoolYear,
                )}
                className="min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm"
              >
                قبلی
              </Link>
            ) : null}
            {data.page < data.pageCount ? (
              <Link
                href={pageHref(
                  data.page + 1,
                  query,
                  activeCategory,
                  activeGrade,
                  activeSchoolYear,
                )}
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
