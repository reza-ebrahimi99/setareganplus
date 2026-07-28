import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExperienceFlowPanel } from "@/components/admin/experience/ExperienceFlowPanel";
import type { SerializableFlowExperienceSummary } from "@/components/admin/experience/types";
import { RegistrationFlowEditor } from "@/components/admin/registration-flows/RegistrationFlowEditor";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadFlowExperienceSummary } from "@/lib/experience/admin/flow-experience-scope";
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

  const [flow, formOptions, experienceSummary] = await Promise.all([
    getRegistrationFlowDetail(session.organization.id, id),
    listSelectablePublishedForms(session.organization.id),
    loadFlowExperienceSummary(session.organization.id, id),
  ]);

  if (!flow) notFound();

  const qr = await generateRegistrationFlowQrDataUrl(flow.slug);

  const summary: SerializableFlowExperienceSummary = {
    flowId: experienceSummary.flowId,
    experienceId: experienceSummary.experience?.id ?? null,
    draft: experienceSummary.draft
      ? {
          versionId: experienceSummary.draft.versionId,
          versionNumber: experienceSummary.draft.versionNumber,
          blockCount: experienceSummary.draft.blockCount,
          updatedAtIso: experienceSummary.draft.updatedAt.toISOString(),
        }
      : null,
    published: experienceSummary.published
      ? {
          versionId: experienceSummary.published.versionId,
          versionNumber: experienceSummary.published.versionNumber,
          publishedAtIso: experienceSummary.published.publishedAt
            ? experienceSummary.published.publishedAt.toISOString()
            : null,
          blockCount: experienceSummary.published.blockCount,
        }
      : null,
    entryState: experienceSummary.entryState,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={flow.title}
        description={`${flow.slug} · ${flow.registrationCount} ثبت‌نام`}
        breadcrumbs={adminBreadcrumbs.registrationFlowDetail}
        compact
      />
      <ExperienceFlowPanel
        flowId={flow.id}
        summary={summary}
        canManage={canManage}
        publicSlug={flow.slug}
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
