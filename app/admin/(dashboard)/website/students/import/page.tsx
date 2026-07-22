import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentImportWizard } from "@/components/admin/website/StudentImportWizard";
import { requirePermission } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ورود گروهی دانش‌آموزان" };

export default async function AdminStudentsImportPage() {
  await requirePermission("website.manage");

  return (
    <>
      <AdminPageHeader
        title="ورود گروهی با اکسل"
        description="بارگذاری فایل Excel یا CSV، تطبیق ستون‌ها، اعتبارسنجی و ورود دانش‌آموزان"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "وب‌سایت" },
          { label: "دانش‌آموزان", href: "/admin/website/students" },
          { label: "ورود گروهی" },
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

      <StudentImportWizard />
    </>
  );
}
