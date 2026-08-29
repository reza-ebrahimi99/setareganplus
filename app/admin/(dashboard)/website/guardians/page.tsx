import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createGuardian } from "@/app/admin/(dashboard)/website/guardians/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  listAdminGuardians,
} from "@/lib/portal/admin/guardians";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "اولیا و سرپرستان" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminGuardiansPage({ searchParams }: PageProps) {
  const session = await requirePermission("students.portal.manage");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const guardians = await listAdminGuardians(session.organization.id, { q });

  return (
    <>
      <AdminPageHeader
        title="اولیا و سرپرستان"
        description="مدیریت اولیا و ارتباط آن‌ها با دانش‌آموزان برای پرتال"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "اولیا" },
        ]}
        compact
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/website/portal-access"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm"
        >
          دسترسی پرتال
        </Link>
      </div>

      <form
        method="get"
        className="admin-card mb-4 flex flex-wrap gap-3 p-4"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="جستجو نام یا موبایل"
          className="min-h-11 min-w-[220px] flex-1 rounded-xl border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
        >
          جستجو
        </button>
      </form>

      <form
        action={createGuardian}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="text-sm">
          <span className="font-medium text-primary">نام</span>
          <input
            name="firstName"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">نام خانوادگی</span>
          <input
            name="lastName"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">موبایل</span>
          <input
            name="mobile"
            required
            dir="ltr"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">نسبت</span>
          <select
            name="relationshipType"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            defaultValue="GUARDIAN"
          >
            {Object.entries(GUARDIAN_RELATIONSHIP_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن ولی
          </button>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3 text-right">نام</th>
              <th className="px-3 py-3 text-right">موبایل</th>
              <th className="px-3 py-3 text-right">نسبت</th>
              <th className="px-3 py-3 text-right">دانش‌آموزان</th>
              <th className="px-3 py-3 text-right">وضعیت</th>
              <th className="px-3 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {guardians.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  ولی ثبت نشده است.
                </td>
              </tr>
            ) : (
              guardians.map((guardian) => (
                <tr key={guardian.id} className="border-b border-border/70">
                  <td className="px-3 py-3">{guardian.fullName}</td>
                  <td className="px-3 py-3" dir="ltr">
                    {guardian.normalizedMobile}
                  </td>
                  <td className="px-3 py-3">
                    {GUARDIAN_RELATIONSHIP_LABELS[guardian.relationshipType]}
                  </td>
                  <td className="px-3 py-3">
                    {toPersianDigits(guardian._count.relations)}
                  </td>
                  <td className="px-3 py-3">
                    {guardian.archivedAt
                      ? "بایگانی"
                      : guardian.isActive
                        ? "فعال"
                        : "غیرفعال"}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/website/guardians/${guardian.id}`}
                      className="text-primary underline"
                    >
                      ویرایش
                    </Link>
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
