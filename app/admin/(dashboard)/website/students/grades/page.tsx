import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createStudentGrade,
  deleteStudentGrade,
  updateStudentGrade,
} from "@/app/admin/(dashboard)/website/students/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminStudentGrades } from "@/lib/website/student-grades";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پایه‌های تحصیلی" };

export default async function AdminStudentGradesPage() {
  const session = await requirePermission("website.manage");
  const grades = await listAdminStudentGrades(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="پایه‌های تحصیلی"
        description="دسته‌بندی‌های قابل مدیریت برای پروفایل دانش‌آموزان"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "دانش‌آموزان", href: "/admin/website/students" },
          { label: "پایه‌ها" },
        ]}
        compact
      />

      <div className="mb-4">
        <Link
          href="/admin/website/students"
          className="text-sm text-primary underline"
        >
          بازگشت به فهرست دانش‌آموزان
        </Link>
      </div>

      <form
        action={createStudentGrade}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-3"
      >
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-primary">نام پایه</span>
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="مثال: پایه سوم"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن پایه
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {grades.map((grade) => (
          <form
            key={grade.id}
            action={updateStudentGrade}
            className="admin-card grid gap-3 p-4 sm:grid-cols-6"
          >
            <input type="hidden" name="gradeId" value={grade.id} />
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">نام</span>
              <input
                name="name"
                defaultValue={grade.name}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">ترتیب</span>
              <input
                name="sortOrder"
                type="number"
                defaultValue={grade.sortOrder}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                value="true"
                defaultChecked={grade.isActive}
              />
              فعال
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={Boolean(grade.archivedAt)}
              />
              بایگانی
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-2 text-xs text-white"
              >
                ذخیره
              </button>
              <button
                formAction={deleteStudentGrade}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"
              >
                حذف
              </button>
              <span className="text-xs text-muted">
                {toPersianDigits(grade._count.students)} دانش‌آموز
              </span>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
