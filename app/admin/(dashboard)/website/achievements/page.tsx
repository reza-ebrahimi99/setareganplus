import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  archiveAchievement,
  deleteAchievement,
  restoreAchievement,
} from "@/app/admin/(dashboard)/website/achievements/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  listAdminAchievements,
  listAdminStudentOptions,
  type AdminAchievementSort,
} from "@/lib/website/achievement-admin";
import { listAdminAchievementCategories } from "@/lib/website/achievement-categories";
import { listAdminStudentGrades } from "@/lib/website/student-grades";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "افتخارات" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminAchievementsPage({
  searchParams,
}: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const q = param(params.q);
  const studentId = param(params.studentId);
  const gradeId = param(params.gradeId);
  const categoryId = param(params.categoryId);
  const schoolYear = param(params.schoolYear);
  const published = (param(params.published) || "all") as "all" | "yes" | "no";
  const featured = (param(params.featured) || "all") as "all" | "yes" | "no";
  const sort = (param(params.sort) || "date_desc") as AdminAchievementSort;
  const requestedPage = Number.parseInt(param(params.page) || "1", 10);

  const [list, students, grades, categories] = await Promise.all([
    listAdminAchievements(session.organization.id, {
      q,
      studentId: studentId || undefined,
      gradeId: gradeId || undefined,
      categoryId: categoryId || undefined,
      schoolYear: schoolYear || undefined,
      published,
      featured,
      sort,
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
    }),
    listAdminStudentOptions(session.organization.id),
    listAdminStudentGrades(session.organization.id),
    listAdminAchievementCategories(session.organization.id),
  ]);

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (studentId) query.set("studentId", studentId);
    if (gradeId) query.set("gradeId", gradeId);
    if (categoryId) query.set("categoryId", categoryId);
    if (schoolYear) query.set("schoolYear", schoolYear);
    if (published !== "all") query.set("published", published);
    if (featured !== "all") query.set("featured", featured);
    if (sort !== "date_desc") query.set("sort", sort);
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs
      ? `/admin/website/achievements?${qs}`
      : "/admin/website/achievements";
  };

  return (
    <>
      <AdminPageHeader
        title="افتخارات"
        description="مدیریت افتخارات، گواهی‌ها و موفقیت‌های دانش‌آموزان مؤسسه"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "افتخارات" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/achievements/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          افتخار جدید
        </Link>
        <Link
          href="/admin/website/achievement-categories"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          دسته‌بندی‌ها
        </Link>
        <Link
          href="/achievements"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          مشاهده صفحه عمومی
        </Link>
      </div>

      <form
        method="get"
        className="admin-card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">دانش‌آموز</span>
          <select
            name="studentId"
            defaultValue={studentId}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">پایه</span>
          <select
            name="gradeId"
            defaultValue={gradeId}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">دسته</span>
          <select
            name="categoryId"
            defaultValue={categoryId}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">سال تحصیلی</span>
          <input
            name="schoolYear"
            defaultValue={schoolYear}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">انتشار</span>
          <select
            name="published"
            defaultValue={published}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="all">همه</option>
            <option value="yes">منتشر شده</option>
            <option value="no">پیش‌نویس</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">ویژه</span>
          <select
            name="featured"
            defaultValue={featured}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="all">همه</option>
            <option value="yes">ویژه</option>
            <option value="no">عادی</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">مرتب‌سازی</span>
          <select
            name="sort"
            defaultValue={sort}
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="date_desc">جدیدترین تاریخ</option>
            <option value="date_asc">قدیمی‌ترین تاریخ</option>
            <option value="featured">ویژه</option>
            <option value="title">عنوان</option>
            <option value="displayOrder">ترتیب نمایش</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-medium text-white"
          >
            اعمال فیلتر
          </button>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-background text-muted">
            <tr>
              <th className="px-3 py-3 text-start font-medium">افتخار</th>
              <th className="px-3 py-3 text-start font-medium">دانش‌آموز</th>
              <th className="px-3 py-3 text-start font-medium">دسته</th>
              <th className="px-3 py-3 text-start font-medium">تاریخ</th>
              <th className="px-3 py-3 text-start font-medium">وضعیت</th>
              <th className="px-3 py-3 text-start font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {list.achievements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  هنوز افتخاری ثبت نشده است.
                </td>
              </tr>
            ) : (
              list.achievements.map((item) => (
                <tr key={item.id} className="border-b border-border/70">
                  <td className="px-3 py-3">
                    <p className="font-medium text-primary">{item.title}</p>
                    <p className="text-xs text-muted">
                      {item.place || item.schoolYear || item.slug}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {item.student.fullName}
                    <span className="block text-xs text-muted">
                      {item.student.grade.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">{item.category.name}</td>
                  <td className="px-3 py-3">
                    {item.achievementDate
                      ? formatJalaliDateShort(item.achievementDate)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {item.archivedAt
                      ? "بایگانی"
                      : !item.isPublished
                        ? "پیش‌نویس"
                        : item.isFeatured
                          ? "منتشر · ویژه"
                          : "منتشر"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/website/achievements/${item.id}`}
                        className="rounded-lg border border-border px-2 py-1 text-xs"
                      >
                        ویرایش
                      </Link>
                      {item.archivedAt ? (
                        <form action={restoreAchievement}>
                          <input
                            type="hidden"
                            name="achievementId"
                            value={item.id}
                          />
                          <button className="rounded-lg border border-border px-2 py-1 text-xs">
                            بازیابی
                          </button>
                        </form>
                      ) : (
                        <form action={archiveAchievement}>
                          <input
                            type="hidden"
                            name="achievementId"
                            value={item.id}
                          />
                          <button className="rounded-lg border border-border px-2 py-1 text-xs">
                            بایگانی
                          </button>
                        </form>
                      )}
                      <form action={deleteAchievement}>
                        <input
                          type="hidden"
                          name="achievementId"
                          value={item.id}
                        />
                        <button className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700">
                          حذف
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          {toPersianDigits(list.total)} افتخار · صفحه{" "}
          {toPersianDigits(list.page)} از {toPersianDigits(list.pageCount)}
        </p>
        {list.pageCount > 1 ? (
          <div className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={pageHref(list.page - 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                قبلی
              </Link>
            ) : null}
            {list.page < list.pageCount ? (
              <Link
                href={pageHref(list.page + 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                بعدی
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
