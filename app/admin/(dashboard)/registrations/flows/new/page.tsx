import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateRegistrationFlowForm } from "@/components/admin/registration-flows/CreateRegistrationFlowForm";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "جریان ثبت‌نام جدید",
};

export default async function AdminRegistrationFlowNewPage() {
  await requirePermission("registration_flows.manage");

  return (
    <>
      <AdminPageHeader
        title="جریان ثبت‌نام جدید"
        description="پس از ایجاد، مراحل، فرم، مدارک و پرداخت را در ویرایش‌گر تنظیم کنید."
        breadcrumbs={adminBreadcrumbs.registrationFlowsNew}
        compact
      />
      <div className="mx-auto max-w-2xl">
        <CreateRegistrationFlowForm />
      </div>
    </>
  );
}
