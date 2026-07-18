import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createSubject,
  deleteSubject,
  updateSubject,
} from "@/app/admin/(dashboard)/website/assessments/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminSubjects } from "@/lib/assessment/subjects";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دروس آزمون" };

export default async function AdminSubjectsPage() {
  const session = await requirePermission("website.manage");
  const subjects = await listAdminSubjects(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="دروس"
        description="درس‌های قابل استفاده در نتایج موضوعی آزمون"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "آزمون‌ها", href: "/admin/website/assessments" },
          { label: "دروس" },
        ]}
        compact
      />

      <div className="mb-4">
        <Link
          href="/admin/website/assessments"
          className="text-sm text-primary underline"
        >
          بازگشت به فهرست آزمون‌ها
        </Link>
      </div>

      <form
        action={createSubject}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-3"
      >
        <label className="text-sm">
          <span className="font-medium text-primary">نام درس</span>
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="مثال: ریاضی"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">نام کوتاه</span>
          <input
            name="shortName"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="ریاضی"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن درس
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <form
            key={subject.id}
            action={updateSubject}
            className="admin-card grid gap-3 p-4 sm:grid-cols-5"
          >
            <input type="hidden" name="subjectId" value={subject.id} />
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">نام</span>
              <input
                name="name"
                defaultValue={subject.name}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">نام کوتاه</span>
              <input
                name="shortName"
                defaultValue={subject.shortName ?? ""}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">ترتیب</span>
              <input
                name="displayOrder"
                type="number"
                defaultValue={subject.displayOrder}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-col justify-end gap-2 text-sm sm:col-span-5 sm:flex-row sm:items-center">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={subject.isActive}
                />
                فعال
              </label>
              <span className="text-muted">
                {toPersianDigits(subject._count.subjectResults)} نتیجه
              </span>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-2 text-white"
              >
                ذخیره
              </button>
              <button
                type="submit"
                formAction={deleteSubject}
                className="rounded-lg border border-red-200 px-3 py-2 text-red-700"
              >
                حذف
              </button>
            </div>
          </form>
        ))}
      </div>
    </>
  );
}
