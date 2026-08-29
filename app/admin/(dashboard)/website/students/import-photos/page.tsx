import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentPhotoImportWizard } from "@/components/admin/website/StudentPhotoImportWizard";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ورود گروهی تصاویر دانش‌آموزان" };

export default async function AdminStudentsImportPhotosPage() {
  await requirePermission("website.manage");

  return (
    <>
      <AdminPageHeader
        title="ورود گروهی تصاویر دانش‌آموزان"
        description="انتخاب چند تصویر، تطبیق با شناسه قلم‌چی از نام فایل، پیش‌نمایش و بارگذاری امن"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "دانش‌آموزان", href: "/admin/website/students" },
          { label: "ورود گروهی تصاویر" },
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

      <StudentPhotoImportWizard />
    </>
  );
}
