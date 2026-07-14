import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateFormForm } from "@/components/admin/forms/CreateFormForm";
import { adminBreadcrumbs } from "@/content/admin";

export const metadata: Metadata = {
  title: "ساخت فرم جدید",
};

export default function AdminCreateFormPage() {
  // TODO(auth): This Form Builder admin route is currently unauthenticated.
  // Add authentication and organization authorization before production exposure.

  return (
    <>
      <AdminPageHeader
        title="ساخت فرم جدید"
        description="یک فرم والد با نسخه پیش‌نویس اولیه ساخته می‌شود. افزودن پرسش‌ها در مرحله بعدی است."
        breadcrumbs={adminBreadcrumbs.formsNew}
        showNotice
        compact
      />
      <div className="mx-auto max-w-2xl">
        <CreateFormForm />
      </div>
    </>
  );
}
