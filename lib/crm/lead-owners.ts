import { SystemRole } from "@/generated/prisma/enums";
import { permissionsForRole, ROLE_LABELS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export type LeadOwnerOption = {
  id: string;
  name: string;
  roleLabel: string;
  /** Empty means organization-wide branch eligibility. */
  branchIds: string[];
};

export async function loadLeadOwnerOptions(params: {
  organizationId: string;
  branchId?: string;
  accessibleBranchIds?: readonly string[];
}): Promise<LeadOwnerOption[]> {
  const ownerRoles = Object.values(SystemRole).filter((role) =>
    permissionsForRole(role).has("crm.view_assigned"),
  );
  const branchEligibility = params.branchId
    ? {
        OR: [
          { branchMemberships: { none: { deletedAt: null } } },
          {
            branchMemberships: {
              some: { branchId: params.branchId, deletedAt: null },
            },
          },
        ],
      }
    : params.accessibleBranchIds
      ? {
          OR: [
            { branchMemberships: { none: { deletedAt: null } } },
            {
              branchMemberships: {
                some: {
                  branchId: { in: [...params.accessibleBranchIds] },
                  deletedAt: null,
                },
              },
            },
          ],
        }
      : {};
  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId: params.organizationId,
      role: { in: ownerRoles },
      status: "ACTIVE",
      deletedAt: null,
      user: { status: "ACTIVE", deletedAt: null },
      ...branchEligibility,
    },
    select: {
      role: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
      branchMemberships: {
        where: { deletedAt: null },
        select: { branchId: true },
      },
    },
    take: 200,
  });

  return memberships
    .map((membership) => ({
      id: membership.user.id,
      name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
      roleLabel: ROLE_LABELS[membership.role],
      branchIds: membership.branchMemberships.map((scope) => scope.branchId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fa"));
}
