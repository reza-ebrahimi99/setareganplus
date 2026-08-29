import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createTeamDepartmentAction,
  deleteTeamDepartmentAction,
  updateTeamDepartmentAction,
} from "@/app/admin/(dashboard)/website/team/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminTeamDepartments } from "@/lib/website/team-departments";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دپارتمان‌های تیم" };

export default async function AdminTeamDepartmentsPage() {
  const session = await requirePermission("website.manage");
  const departments = await listAdminTeamDepartments(session.organization.id);

  return (
    <>
      <AdminPageHeader
        title="دپارتمان‌های تیم"
        description="دسته‌بندی‌های قابل مدیریت برای اعضای تیم مؤسسه"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "اعضای تیم", href: "/admin/website/team" },
          { label: "دپارتمان‌ها" },
        ]}
        compact
      />

      <form
        action={createTeamDepartmentAction}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-3"
      >
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-primary">نام دپارتمان</span>
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="مثال: مدیران واحدها"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن دپارتمان
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {departments.map((department) => (
          <form
            key={department.id}
            action={updateTeamDepartmentAction}
            className="admin-card grid gap-3 p-4 sm:grid-cols-6"
          >
            <input type="hidden" name="departmentId" value={department.id} />
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">نام</span>
              <input
                name="name"
                defaultValue={department.name}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">ترتیب</span>
              <input
                name="sortOrder"
                type="number"
                defaultValue={department.sortOrder}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                value="true"
                defaultChecked={department.isActive}
              />
              فعال
            </label>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                name="archived"
                value="true"
                defaultChecked={Boolean(department.archivedAt)}
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
                formAction={deleteTeamDepartmentAction}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"
              >
                حذف
              </button>
              <span className="text-xs text-muted">
                {toPersianDigits(department._count.members)} عضو
              </span>
            </div>
          </form>
        ))}
      </div>

      <div className="mt-5">
        <Link href="/admin/website/team" className="text-sm text-primary underline">
          بازگشت به فهرست اعضا
        </Link>
      </div>
    </>
  );
}
