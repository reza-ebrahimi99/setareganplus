import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  archiveStudent,
  deleteStudent,
  restoreStudent,
} from "@/app/admin/(dashboard)/website/students/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminStudents } from "@/lib/website/student-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دانش‌آموزان" };

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  const session = await requirePermission("website.manage");
  const params = await searchParams;
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const q = typeof params.q === "string" ? params.q : "";

  const { students, total, page, pageCount } = await listAdminStudents(
    session.organization.id,
    {
      page:
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1,
      q,
    },
  );

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q.trim()) query.set("q", q.trim());
    if (targetPage > 1) query.set("page", String(targetPage));
    const qs = query.toString();
    return qs ? `/admin/website/students?${qs}` : "/admin/website/students";
  };

  return (
    <>
      <AdminPageHeader
        title="دانش‌آموزان"
        description="مدیریت پروفایل دانش‌آموزان برای پرتال اولیا و دانش‌آموزان"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "دانش‌آموزان" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/students/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
        >
          دانش‌آموز جدید
        </Link>
        <Link
          href="/admin/website/students/grades"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          مدیریت پایه‌ها
        </Link>
      </div>

      <form
        method="get"
        className="admin-card mb-4 flex flex-wrap items-end gap-3 p-4"
      >
        <label className="min-w-[14rem] flex-1 text-sm">
          <span className="mb-1 block text-muted">جستجو</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="نام، نام خانوادگی یا اسلاگ"
            className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white"
        >
          فیلتر
        </button>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-background text-muted">
            <tr>
              <th className="px-3 py-3 text-start font-medium">دانش‌آموز</th>
              <th className="px-3 py-3 text-start font-medium">پایه</th>
              <th className="px-3 py-3 text-start font-medium">رشته</th>
              <th className="px-3 py-3 text-start font-medium">ترتیب</th>
              <th className="px-3 py-3 text-start font-medium">وضعیت</th>
              <th className="px-3 py-3 text-start font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  هنوز دانش‌آموزی ثبت نشده است.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="border-b border-border/70">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full bg-background text-sm font-semibold text-primary/70">
                        {student.fullName.slice(0, 1)}
                      </span>
                      <div>
                        <p className="font-medium text-primary">
                          {student.fullName}
                        </p>
                        <p className="text-xs text-muted">
                          {student.schoolYear || student.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{student.grade.name}</td>
                  <td className="px-3 py-3">
                    {student.major?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {toPersianDigits(student.displayOrder)}
                    {student.isFeatured
                      ? ` · ویژه ${toPersianDigits(student.featuredPriority)}`
                      : ""}
                  </td>
                  <td className="px-3 py-3">
                    {!student.isActive
                      ? "غیرفعال"
                      : student.archivedAt
                        ? "بایگانی"
                        : student.isFeatured
                          ? "فعال · ویژه"
                          : "فعال"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/website/students/${student.id}`}
                        className="rounded-lg border border-border px-2 py-1 text-xs"
                      >
                        ویرایش
                      </Link>
                      {student.archivedAt ? (
                        <form action={restoreStudent}>
                          <input
                            type="hidden"
                            name="studentId"
                            value={student.id}
                          />
                          <button className="rounded-lg border border-border px-2 py-1 text-xs">
                            بازیابی
                          </button>
                        </form>
                      ) : (
                        <form action={archiveStudent}>
                          <input
                            type="hidden"
                            name="studentId"
                            value={student.id}
                          />
                          <button className="rounded-lg border border-border px-2 py-1 text-xs">
                            بایگانی
                          </button>
                        </form>
                      )}
                      <form action={deleteStudent}>
                        <input
                          type="hidden"
                          name="studentId"
                          value={student.id}
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
          {toPersianDigits(total)} دانش‌آموز · صفحه {toPersianDigits(page)} از{" "}
          {toPersianDigits(pageCount)}
        </p>
        {pageCount > 1 ? (
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                قبلی
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={pageHref(page + 1)}
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
