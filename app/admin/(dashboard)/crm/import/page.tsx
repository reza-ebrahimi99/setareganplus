import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CrmImportWizard } from "@/components/admin/crm/CrmImportWizard";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ورود Excel به CRM",
};

export default async function CrmImportPage() {
  const session = await requirePermission("crm.import_leads");
  const branches = await prisma.branch.findMany({
    where: {
      organizationId: session.organization.id,
      isActive: true,
      deletedAt: null,
      ...(session.membership.allBranches
        ? {}
        : { id: { in: session.membership.branchIds } }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <AdminPageHeader
        title="ورود Excel و CSV به CRM"
        description="پیش‌نمایش، تطبیق ستون‌ها و ورود کنترل‌شده متقاضیان"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "تابلوی CRM", href: "/admin/crm" },
          { label: "ورود اطلاعات" },
        ]}
        compact
      />
      <CrmImportWizard branches={branches} />
    </>
  );
}
