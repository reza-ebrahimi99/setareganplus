import Link from "next/link";
import { TeamFilters } from "@/components/team/TeamFilters";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import type { PublicTeamPageData } from "@/lib/website/load-team";
import { toPersianDigits } from "@/lib/persian";

type TeamDirectoryProps = {
  data: PublicTeamPageData;
  allDepartments: Array<{ slug: string; name: string }>;
  activeDepartment: string;
  query: string;
};

function pageHref(
  page: number,
  query: string,
  department: string,
): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (department) params.set("department", department);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/team?${qs}` : "/team";
}

export function TeamDirectory({
  data,
  allDepartments,
  activeDepartment,
  query,
}: TeamDirectoryProps) {
  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">اعضای فعال</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {toPersianDigits(data.totalMembers)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">دپارتمان‌ها</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {toPersianDigits(data.departmentCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs text-muted">مؤسسه</p>
          <p className="mt-1 text-base font-semibold text-primary">
            علمی ستارگان
          </p>
        </div>
      </div>

      <TeamFilters
        departments={allDepartments}
        activeDepartment={activeDepartment}
        initialQuery={query}
      />

      <div className="space-y-12">
        {data.departments.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-muted">
            عضوی با این فیلترها یافت نشد.
          </p>
        ) : (
          data.departments.map((department) => (
            <section
              key={department.id}
              aria-labelledby={`dept-${department.slug}`}
            >
              <h2
                id={`dept-${department.slug}`}
                className="border-b border-border pb-3 text-xl font-bold text-primary"
              >
                {department.name}
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {department.members.map((member) => (
                  <TeamMemberCard key={member.id} member={member} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {data.pageCount > 1 ? (
        <nav
          aria-label="صفحه‌بندی تیم"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6"
        >
          <p className="text-sm text-muted">
            صفحه {toPersianDigits(data.page)} از {toPersianDigits(data.pageCount)}
            {" · "}
            نمایش تا {toPersianDigits(data.pageSize)} عضو در هر صفحه
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={pageHref(data.page - 1, query, activeDepartment)}
                className="min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm"
              >
                قبلی
              </Link>
            ) : null}
            {data.page < data.pageCount ? (
              <Link
                href={pageHref(data.page + 1, query, activeDepartment)}
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
