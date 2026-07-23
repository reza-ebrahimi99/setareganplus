import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RegistrationFlowEditor } from "@/components/admin/registration-flows/RegistrationFlowEditor";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { getRegistrationFlowDetail } from "@/lib/registration/flows/admin";
import { generateRegistrationFlowQrDataUrl } from "@/lib/registration/flows/generate-qr";
import { listSelectablePublishedForms } from "@/lib/site/load-site-placement";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `ویرایش جریان ${id.slice(0, 8)}` };
}

export default async function AdminRegistrationFlowDetailPage({
  params,
}: PageProps) {
  const session = await requirePermission("registration_flows.view");
  const canManage = hasPermission(session, "registration_flows.manage");
  const { id } = await params;

  const [flow, formOptions] = await Promise.all([
    getRegistrationFlowDetail(session.organization.id, id),
    listSelectablePublishedForms(session.organization.id),
  ]);

  if (!flow) notFound();

  const qr = await generateRegistrationFlowQrDataUrl(flow.slug);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={flow.title}
        description={`${flow.slug} · ${flow.registrationCount} ثبت‌نام`}
        breadcrumbs={adminBreadcrumbs.registrationFlowDetail}
        compact
      />
      <RegistrationFlowEditor
        flow={flow}
        formOptions={formOptions}
        qrDataUrl={qr}
        canManage={canManage}
      />
    </div>
  );
}
