import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createPortalAccessLink,
  revokePortalAccessLink,
  setPortalAccessActive,
} from "@/app/admin/(dashboard)/website/guardians/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  listAdminGuardians,
  listAdminPortalLinks,
} from "@/lib/portal/admin/guardians";
import { listAdminStudentOptions } from "@/lib/website/achievement-admin";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دسترسی پرتال" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPortalAccessPage({ searchParams }: PageProps) {
  const session = await requirePermission("students.portal.manage");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const [links, students, guardians] = await Promise.all([
    listAdminPortalLinks(session.organization.id, { q }),
    listAdminStudentOptions(session.organization.id),
    listAdminGuardians(session.organization.id),
  ]);

  return (
    <>
      <AdminPageHeader
        title="دسترسی پرتال"
        description="اتصال کاربر احرازهویت‌شده به دانش‌آموز یا ولی — فقط لینک صریح"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "دسترسی پرتال" },
        ]}
        compact
      />

      <div className="mb-4">
        <Link
          href="/admin/website/guardians"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          مدیریت اولیا
        </Link>
      </div>

      <form
        method="get"
        className="admin-card mb-4 flex flex-wrap gap-3 p-4"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="جستجو موبایل، کاربر، دانش‌آموز یا ولی"
          className="min-h-11 min-w-[240px] flex-1 rounded-xl border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
        >
          جستجو
        </button>
      </form>

      <form
        action={createPortalAccessLink}
        className="admin-card mb-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-sm">
          <span className="font-medium text-primary">موبایل کاربر</span>
          <input
            name="mobile"
            required
            dir="ltr"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">نام</span>
          <input
            name="firstName"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">نام خانوادگی</span>
          <input
            name="lastName"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">نوع حساب</span>
          <select
            name="accountType"
            defaultValue="STUDENT"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          >
            <option value="STUDENT">دانش‌آموز</option>
            <option value="GUARDIAN">ولی</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">دانش‌آموز</span>
          <select
            name="studentId"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          >
            <option value="">—</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">ولی</span>
          <select
            name="guardianId"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          >
            <option value="">—</option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.fullName}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            ایجاد / فعال‌سازی دسترسی
          </button>
          <p className="mt-2 text-xs text-muted">
            برای حساب دانش‌آموز فقط دانش‌آموز را انتخاب کنید؛ برای ولی فقط ولی.
            دسترسی صرفاً با لینک صریح است، نه با تطبیق نام یا parentName.
          </p>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3 text-right">کاربر</th>
              <th className="px-3 py-3 text-right">موبایل</th>
              <th className="px-3 py-3 text-right">نوع</th>
              <th className="px-3 py-3 text-right">هدف</th>
              <th className="px-3 py-3 text-right">وضعیت</th>
              <th className="px-3 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  لینک پرتالی ثبت نشده است.
                </td>
              </tr>
            ) : (
              links.map((link, index) => (
                <tr key={link.id} className="border-b border-border/70">
                  <td className="px-3 py-3">
                    {`${link.user.firstName} ${link.user.lastName}`.trim()}
                  </td>
                  <td className="px-3 py-3" dir="ltr">
                    {link.user.normalizedMobile}
                  </td>
                  <td className="px-3 py-3">
                    {link.accountType === "STUDENT" ? "دانش‌آموز" : "ولی"}
                  </td>
                  <td className="px-3 py-3">
                    {link.accountType === "STUDENT"
                      ? link.student?.fullName ?? "—"
                      : link.guardian?.fullName ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {link.isActive ? "فعال" : "غیرفعال"}
                    <span className="mr-2 text-muted">
                      ({toPersianDigits(index + 1)})
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-3">
                      <form action={setPortalAccessActive}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={link.isActive ? "false" : "true"}
                        />
                        <button type="submit" className="text-primary underline">
                          {link.isActive ? "غیرفعال" : "فعال"}
                        </button>
                      </form>
                      <form action={revokePortalAccessLink}>
                        <input type="hidden" name="linkId" value={link.id} />
                        <button type="submit" className="text-red-700 underline">
                          لغو دسترسی
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
    </>
  );
}
