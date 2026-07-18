import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createAssessmentProvider,
  deleteAssessmentProvider,
  updateAssessmentProvider,
} from "@/app/admin/(dashboard)/website/assessments/actions";
import { requirePermission } from "@/lib/auth/require-admin";
import { listAdminAssessmentProviders } from "@/lib/assessment/providers";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ارائه‌دهندگان آزمون" };

export default async function AdminAssessmentProvidersPage() {
  const session = await requirePermission("website.manage");
  const providers = await listAdminAssessmentProviders(
    session.organization.id,
  );

  return (
    <>
      <AdminPageHeader
        title="ارائه‌دهندگان آزمون"
        description="قلم‌چی، آزمون مدرسه، المپیاد، ورودی و سایر منابع سنجش"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "آزمون‌ها", href: "/admin/website/assessments" },
          { label: "ارائه‌دهندگان" },
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
        action={createAssessmentProvider}
        className="admin-card mb-5 grid gap-3 p-5 sm:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          <span className="font-medium text-primary">نام</span>
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="مثال: قلم‌چی"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">آیکون</span>
          <input
            name="icon"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="book"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-primary">رنگ</span>
          <input
            name="color"
            dir="ltr"
            className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            placeholder="#7c3aed"
          />
        </label>
        <div className="sm:col-span-4">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm text-white"
          >
            افزودن ارائه‌دهنده
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {providers.map((provider) => (
          <form
            key={provider.id}
            action={updateAssessmentProvider}
            className="admin-card grid gap-3 p-4 sm:grid-cols-6"
          >
            <input type="hidden" name="providerId" value={provider.id} />
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">نام</span>
              <input
                name="name"
                defaultValue={provider.name}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">ترتیب</span>
              <input
                name="displayOrder"
                type="number"
                defaultValue={provider.displayOrder}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">آیکون</span>
              <input
                name="icon"
                defaultValue={provider.icon ?? ""}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">رنگ</span>
              <input
                name="color"
                dir="ltr"
                defaultValue={provider.color ?? ""}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-col justify-end gap-2 text-sm sm:col-span-6 sm:flex-row sm:items-center">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={provider.isActive}
                />
                فعال
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  name="archived"
                  value="true"
                  defaultChecked={Boolean(provider.archivedAt)}
                />
                بایگانی
              </label>
              <span className="text-muted">
                {toPersianDigits(provider._count.assessments)} آزمون
              </span>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-2 text-white"
              >
                ذخیره
              </button>
              <button
                type="submit"
                formAction={deleteAssessmentProvider}
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
