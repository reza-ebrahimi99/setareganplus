import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  LeadIntakeForm,
  type LeadIntakeBranchOption,
} from "@/components/admin/leads/LeadIntakeForm";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadLeadOwnerOptions } from "@/lib/crm/lead-owners";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت متقاضی جدید",
};

const breadcrumbs = [
  { label: "مدیریت", href: "/admin" },
  { label: "متقاضیان و CRM", href: "/admin/leads" },
  { label: "ثبت متقاضی جدید" },
] as const;

export default async function NewLeadPage() {
  const session = await requirePermission("crm.create_lead");
  const organizationId = session.organization.id;
  const canAssign = hasPermission(session, "crm.assign");

  const [branches, advisorOptions] = await Promise.all([
    prisma.branch.findMany({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
        ...(session.membership.allBranches
          ? {}
          : { id: { in: session.membership.branchIds } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    canAssign
      ? loadLeadOwnerOptions({
          organizationId,
          accessibleBranchIds: session.membership.allBranches
            ? undefined
            : session.membership.branchIds,
        })
      : Promise.resolve([]),
  ]);

  const branchOptions: LeadIntakeBranchOption[] = branches;

  return (
    <>
      <AdminPageHeader
        title="ثبت متقاضی جدید"
        description="اطلاعات اولیه متقاضی، منبع ورودی و برنامه پیگیری را ثبت کنید."
        breadcrumbs={breadcrumbs}
        compact
      />

      <div className="mx-auto max-w-4xl">
        <LeadIntakeForm
          branches={branchOptions}
          advisors={advisorOptions}
          canAssign={canAssign}
        />
      </div>
    </>
  );
}
