import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  LeadIntakeForm,
  type LeadIntakeAdvisorOption,
  type LeadIntakeBranchOption,
} from "@/components/admin/leads/LeadIntakeForm";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
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

  const [branches, memberships] = await Promise.all([
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
    prisma.organizationMembership.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        deletedAt: null,
        user: {
          status: "ACTIVE",
          deletedAt: null,
        },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        branchMemberships: {
          where: { deletedAt: null },
          select: { branchId: true },
        },
      },
      take: 200,
    }),
  ]);

  const branchOptions: LeadIntakeBranchOption[] = branches;
  const advisorOptions: LeadIntakeAdvisorOption[] = memberships
    .map((membership) => ({
      id: membership.user.id,
      name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
      roleLabel: ROLE_LABELS[membership.role],
      branchIds: membership.branchMemberships.map((scope) => scope.branchId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fa"));

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
        />
      </div>
    </>
  );
}
