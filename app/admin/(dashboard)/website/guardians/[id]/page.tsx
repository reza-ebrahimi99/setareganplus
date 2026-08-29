import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  linkGuardianStudent,
  unlinkGuardianStudent,
  updateGuardian,
} from "@/app/admin/(dashboard)/website/guardians/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  GUARDIAN_RELATIONSHIP_LABELS,
  loadAdminGuardian,
} from "@/lib/portal/admin/guardians";
import { listAdminStudentOptions } from "@/lib/website/achievement-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش ولی" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminGuardianDetailPage({ params }: PageProps) {
  const session = await requirePermission("students.portal.manage");
  const { id } = await params;
  const [guardian, students] = await Promise.all([
    loadAdminGuardian(session.organization.id, id),
    listAdminStudentOptions(session.organization.id),
  ]);
  if (!guardian) notFound();

  return (
    <>
      <AdminPageHeader
        title={guardian.fullName}
        description="ویرایش ولی و ارتباط با دانش‌آموزان"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "اولیا", href: "/admin/website/guardians" },
          { label: guardian.fullName },
        ]}
        compact
      />

      <form action={updateGuardian} className="admin-card mb-6 space-y-4 p-5">
        <input type="hidden" name="guardianId" value={guardian.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium text-primary">نام</span>
            <input
              name="firstName"
              defaultValue={guardian.firstName}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">نام خانوادگی</span>
            <input
              name="lastName"
              defaultValue={guardian.lastName}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">موبایل</span>
            <input
              name="mobile"
              defaultValue={guardian.normalizedMobile}
              dir="ltr"
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">کد ملی (محرمانه)</span>
            <input
              name="nationalId"
              defaultValue={guardian.nationalId ?? ""}
              dir="ltr"
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium text-primary">نسبت</span>
            <select
              name="relationshipType"
              defaultValue={guardian.relationshipType}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
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
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="isPrimary"
              value="true"
              defaultChecked={guardian.isPrimary}
            />
            ولی اصلی
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={guardian.isActive}
            />
            فعال
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="archived"
              value="true"
              defaultChecked={Boolean(guardian.archivedAt)}
            />
            بایگانی
          </label>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
        >
          ذخیره
        </button>
      </form>

      <section className="admin-card space-y-4 p-5">
        <h2 className="text-lg font-bold text-primary">دانش‌آموزان مرتبط</h2>
        <form
          action={linkGuardianStudent}
          className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
        >
          <input type="hidden" name="guardianId" value={guardian.id} />
          <label className="text-sm sm:col-span-2">
            <span className="text-muted">دانش‌آموز</span>
            <select
              name="studentId"
              required
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            >
              <option value="">انتخاب</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted">نسبت</span>
            <select
              name="relationshipType"
              defaultValue="GUARDIAN"
              className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
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
          <div className="flex flex-wrap gap-3 text-sm sm:col-span-2">
            {(
              [
                ["canViewAcademicData", "مشاهده تحصیلی"],
                ["canViewAchievements", "مشاهده افتخارات"],
                ["canViewCertificates", "مشاهده گواهی"],
                ["canReceiveNotifications", "اعلان‌ها"],
                ["isPrimary", "اصلی"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name={name}
                  value="true"
                  defaultChecked={name !== "isPrimary"}
                />
                {label}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white sm:col-span-2"
          >
            افزودن / به‌روزرسانی ارتباط
          </button>
        </form>

        <ul className="space-y-3">
          {guardian.relations.map((relation) => (
            <li
              key={relation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-primary">
                  {relation.student.fullName}
                </p>
                <p className="text-muted">
                  {relation.student.grade.name} ·{" "}
                  {GUARDIAN_RELATIONSHIP_LABELS[relation.relationshipType]}
                </p>
              </div>
              <form action={unlinkGuardianStudent}>
                <input type="hidden" name="relationId" value={relation.id} />
                <button type="submit" className="text-red-700 underline">
                  حذف ارتباط
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <Link href="/admin/website/guardians" className="text-sm text-primary underline">
          بازگشت
        </Link>
      </div>
    </>
  );
}
