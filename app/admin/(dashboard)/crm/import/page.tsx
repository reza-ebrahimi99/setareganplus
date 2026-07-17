import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CrmImportWizard } from "@/components/admin/crm/CrmImportWizard";
import { SystemRole } from "@/generated/prisma/enums";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadLeadOwnerOptions } from "@/lib/crm/lead-owners";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ورود Excel به CRM",
};

export default async function CrmImportPage() {
  const session = await requirePermission("crm.import_leads");
  const canAssign = hasPermission(session, "crm.assign");
  const [branches, owners] = await Promise.all([prisma.branch.findMany({
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
  }), canAssign
    ? loadLeadOwnerOptions({
        organizationId: session.organization.id,
        accessibleBranchIds: session.membership.allBranches
          ? undefined
          : session.membership.branchIds,
      })
    : Promise.resolve([])]);
  const canImportDuplicates =
    session.user.isPlatformAdmin ||
    session.membership.role === SystemRole.PLATFORM_ADMIN ||
    session.membership.role === SystemRole.ORGANIZATION_OWNER ||
    session.membership.role === SystemRole.ORGANIZATION_ADMIN;

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
      <CrmImportWizard
        branches={branches}
        owners={owners}
        canAssign={canAssign}
        canImportDuplicates={canImportDuplicates}
      />
    </>
  );
}
