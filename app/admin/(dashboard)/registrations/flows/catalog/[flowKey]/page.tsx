import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RegistrationFlowSettingsForm } from "@/components/admin/registrations/RegistrationFlowSettingsForm";
import { requirePermission } from "@/lib/auth/require-admin";
import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import { ensureRegistrationFlowConfig } from "@/lib/registration/flow-config";

type PageProps = {
  params: Promise<{ flowKey: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { flowKey } = await params;
  const catalog = getRegistrationCatalog(decodeURIComponent(flowKey));
  return {
    title: catalog ? `تنظیمات · ${catalog.title}` : "تنظیمات ثبت‌نام",
  };
}

export default async function AdminRegistrationCatalogFlowPage({
  params,
}: PageProps) {
  const session = await requirePermission("registration_flows.manage");
  const { flowKey: raw } = await params;
  const flowKey = decodeURIComponent(raw);
  const catalog = getRegistrationCatalog(flowKey);
  if (!catalog) notFound();

  const flow = await ensureRegistrationFlowConfig({
    organizationId: session.organization.id,
    flowKey,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={flow.title}
        description="قیمت، تخفیف، ظرفیت و پیامک این جریان ثبت‌نام."
      />
      <Link
        href="/admin/registrations/flows"
        className="text-sm text-muted hover:text-primary"
      >
        ← بازگشت به جریان‌ها
      </Link>
      <RegistrationFlowSettingsForm flow={flow} />
    </div>
  );
}
