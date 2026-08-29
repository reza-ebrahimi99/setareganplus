import Link from "next/link";
import { AssessmentCard } from "@/components/assessments/AssessmentCard";
import { AssessmentFilters } from "@/components/assessments/AssessmentFilters";
import type { PublicAssessmentCard } from "@/lib/assessment/assessments";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/assessment/types";
import { toPersianDigits } from "@/lib/persian";

type AssessmentDirectoryProps = {
  data: {
    assessments: PublicAssessmentCard[];
    total: number;
    page: number;
    pageCount: number;
    schoolYears: string[];
  };
  providers: Array<{ slug: string; name: string }>;
  grades: Array<{ slug: string; name: string }>;
  activeProvider: string;
  activeGrade: string;
  activeType: string;
  activeSchoolYear: string;
  query: string;
};

function pageHref(
  page: number,
  query: string,
  provider: string,
  grade: string,
  type: string,
  schoolYear: string,
) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (provider) params.set("provider", provider);
  if (grade) params.set("grade", grade);
  if (type) params.set("type", type);
  if (schoolYear) params.set("schoolYear", schoolYear);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/assessments?${qs}` : "/assessments";
}

export function AssessmentDirectory({
  data,
  providers,
  grades,
  activeProvider,
  activeGrade,
  activeType,
  activeSchoolYear,
  query,
}: AssessmentDirectoryProps) {
  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">آزمون‌های منتشرشده</p>
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

      <AssessmentFilters
        providers={providers}
        grades={grades}
        types={Object.entries(ASSESSMENT_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        schoolYears={data.schoolYears}
        activeProvider={activeProvider}
        activeGrade={activeGrade}
        activeType={activeType}
        activeSchoolYear={activeSchoolYear}
        initialQuery={query}
      />

      {data.assessments.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-muted">
          آزمونی با این فیلترها یافت نشد.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.assessments.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      )}

      {data.pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            صفحه {toPersianDigits(data.page)} از{" "}
            {toPersianDigits(data.pageCount)}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={pageHref(
                  data.page - 1,
                  query,
                  activeProvider,
                  activeGrade,
                  activeType,
                  activeSchoolYear,
                )}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                قبلی
              </Link>
            ) : null}
            {data.page < data.pageCount ? (
              <Link
                href={pageHref(
                  data.page + 1,
                  query,
                  activeProvider,
                  activeGrade,
                  activeType,
                  activeSchoolYear,
                )}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                بعدی
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
