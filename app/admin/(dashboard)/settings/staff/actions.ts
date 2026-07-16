"use server";

import { revalidatePath } from "next/cache";
import {
  AuditAction,
  MembershipStatus,
  OtpPurpose,
  SystemRole,
  UserStatus,
} from "@/generated/prisma/enums";
import {
  STAFF_ASSIGNABLE_ROLES,
  assertPermission,
} from "@/lib/auth/permissions";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { requestOtp } from "@/lib/communication/otp";

function value(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function assignableRole(raw: string) {
  const role = STAFF_ASSIGNABLE_ROLES.find((candidate) => candidate === raw);
  if (!role) throw new Error("INVALID_ROLE");
  return role;
}

async function managerContext() {
  const session = await requireAdminSession();
  assertPermission(session, "staff.manage");
  return session;
}

async function validBranchIds(organizationId: string, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const branches = await prisma.branch.findMany({
    where: {
      organizationId,
      id: { in: unique },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (branches.length !== unique.length) throw new Error("INVALID_BRANCH_SCOPE");
  return unique;
}

async function replaceBranchScope(
  organizationId: string,
  membershipId: string,
  branchIds: string[],
) {
  await prisma.branchMembership.updateMany({
    where: { organizationId, organizationMembershipId: membershipId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  for (const branchId of branchIds) {
    await prisma.branchMembership.upsert({
      where: { organizationMembershipId_branchId: { organizationMembershipId: membershipId, branchId } },
      update: { organizationId, deletedAt: null },
      create: { organizationId, organizationMembershipId: membershipId, branchId },
    });
  }
}

async function syncBookingAdvisor(params: {
  organizationId: string;
  userId: string;
  role: SystemRole;
  displayName: string;
  branchIds: string[];
  active: boolean;
}) {
  const existing = await prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  const shouldBeActive = params.role === SystemRole.ADVISOR && params.active;
  const branchId = params.branchIds.length === 1 ? params.branchIds[0] : null;
  if (existing) {
    await prisma.bookingAdvisor.update({
      where: { id: existing.id },
      data: {
        displayName: params.displayName,
        branchId,
        isActive: shouldBeActive,
      },
    });
  } else if (params.role === SystemRole.ADVISOR) {
    await prisma.bookingAdvisor.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        branchId,
        displayName: params.displayName,
        isActive: shouldBeActive,
      },
    });
  }
}

export async function createStaffAction(formData: FormData): Promise<void> {
  const session = await managerContext();
  const organizationId = session.organization.id;
  const mobile = normalizeIranianMobile(value(formData, "mobile"));
  if (!mobile.ok) throw new Error("INVALID_MOBILE");
  const firstName = value(formData, "firstName");
  const lastName = value(formData, "lastName");
  if (!firstName || !lastName) throw new Error("INVALID_NAME");
  const email = value(formData, "email").toLowerCase() || null;
  const role = assignableRole(value(formData, "role"));
  const branchIds = value(formData, "allBranches")
    ? []
    : await validBranchIds(
        organizationId,
        formData.getAll("branchIds").filter((item): item is string => typeof item === "string"),
      );

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { normalizedMobile: mobile.normalized },
        ...(email ? [{ email }] : []),
      ],
    },
    include: { memberships: { select: { organizationId: true } } },
  });
  if (
    existing &&
    !existing.memberships.some((membership) => membership.organizationId === organizationId)
  ) {
    throw new Error("IDENTITY_ALREADY_USED");
  }

  const membership = await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            mobile: mobile.normalized,
            normalizedMobile: mobile.normalized,
            email,
            status: UserStatus.ACTIVE,
            deletedAt: null,
          },
        })
      : await tx.user.create({
          data: {
            firstName,
            lastName,
            mobile: mobile.normalized,
            normalizedMobile: mobile.normalized,
            email,
            status: UserStatus.ACTIVE,
            mobileVerifiedAt: null,
          },
        });

    return tx.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      update: { role, status: MembershipStatus.ACTIVE, deletedAt: null },
      create: { organizationId, userId: user.id, role, status: MembershipStatus.ACTIVE },
    });
  });

  await replaceBranchScope(organizationId, membership.id, branchIds);
  await syncBookingAdvisor({
    organizationId,
    userId: membership.userId,
    role,
    displayName: `${firstName} ${lastName}`.trim(),
    branchIds,
    active: true,
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: session.user.id,
      action: AuditAction.STAFF_CREATED,
      entityType: "OrganizationMembership",
      entityId: membership.id,
      metadata: { role, branchCount: branchIds.length },
    },
  });
  revalidatePath("/admin/settings/staff");
}

export async function updateStaffAction(formData: FormData): Promise<void> {
  const session = await managerContext();
  const organizationId = session.organization.id;
  const membershipId = value(formData, "membershipId");
  const role = assignableRole(value(formData, "role"));
  const target = await prisma.organizationMembership.findFirst({
    where: { id: membershipId, organizationId, deletedAt: null },
    include: {
      user: true,
      branchMemberships: { where: { deletedAt: null }, select: { branchId: true } },
    },
  });
  if (!target) throw new Error("NOT_FOUND");
  if (target.role === SystemRole.ORGANIZATION_OWNER) throw new Error("OWNER_PROTECTED");

  const mobile = normalizeIranianMobile(value(formData, "mobile"));
  if (!mobile.ok) throw new Error("INVALID_MOBILE");
  const firstName = value(formData, "firstName");
  const lastName = value(formData, "lastName");
  if (!firstName || !lastName) throw new Error("INVALID_NAME");
  const email = value(formData, "email").toLowerCase() || null;
  const branchIds = value(formData, "allBranches")
    ? []
    : await validBranchIds(
        organizationId,
        formData.getAll("branchIds").filter((item): item is string => typeof item === "string"),
      );

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.userId },
      data: { firstName, lastName, mobile: mobile.normalized, normalizedMobile: mobile.normalized, email },
    }),
    prisma.organizationMembership.update({
      where: { id: target.id },
      data: { role, status: MembershipStatus.ACTIVE },
    }),
  ]);
  await replaceBranchScope(organizationId, target.id, branchIds);
  await syncBookingAdvisor({
    organizationId,
    userId: target.userId,
    role,
    displayName: `${firstName} ${lastName}`.trim(),
    branchIds,
    active: true,
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: session.user.id,
      action: target.role === role ? AuditAction.STAFF_UPDATED : AuditAction.ROLE_CHANGED,
      entityType: "OrganizationMembership",
      entityId: target.id,
      metadata: { role, branchCount: branchIds.length },
    },
  });
  const previousBranches = target.branchMemberships.map((scope) => scope.branchId).sort().join(",");
  const nextBranches = [...branchIds].sort().join(",");
  if (previousBranches !== nextBranches) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: session.user.id,
        action: AuditAction.STAFF_BRANCH_CHANGED,
        entityType: "OrganizationMembership",
        entityId: target.id,
        metadata: { branchCount: branchIds.length },
      },
    });
  }
  revalidatePath("/admin/settings/staff");
}

export async function setStaffActiveAction(formData: FormData): Promise<void> {
  const session = await managerContext();
  const organizationId = session.organization.id;
  const membershipId = value(formData, "membershipId");
  const active = value(formData, "active") === "true";
  const target = await prisma.organizationMembership.findFirst({
    where: { id: membershipId, organizationId, deletedAt: null },
    select: {
      id: true,
      role: true,
      userId: true,
      branchMemberships: {
        where: { deletedAt: null },
        select: { branchId: true },
      },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!target) throw new Error("NOT_FOUND");
  if (target.role === SystemRole.ORGANIZATION_OWNER) throw new Error("OWNER_PROTECTED");

  await prisma.organizationMembership.update({
    where: { id: target.id },
    data: { status: active ? MembershipStatus.ACTIVE : MembershipStatus.SUSPENDED },
  });
  await syncBookingAdvisor({
    organizationId,
    userId: target.userId,
    role: target.role,
    displayName: `${target.user.firstName} ${target.user.lastName}`.trim(),
    branchIds: target.branchMemberships.map((scope) => scope.branchId),
    active,
  });
  if (!active) {
    await prisma.adminSession.updateMany({
      where: {
        revokedAt: null,
        OR: [
          { organizationMembershipId: target.id },
          { organizationMembershipId: null, userId: target.userId },
        ],
      },
      data: { revokedAt: new Date() },
    });
  }
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: session.user.id,
      action: active ? AuditAction.STAFF_UPDATED : AuditAction.STAFF_DEACTIVATED,
      entityType: "OrganizationMembership",
      entityId: target.id,
    },
  });
  revalidatePath("/admin/settings/staff");
}

export async function revokeStaffSessionsAction(formData: FormData): Promise<void> {
  const session = await managerContext();
  const organizationId = session.organization.id;
  const membershipId = value(formData, "membershipId");
  const target = await prisma.organizationMembership.findFirst({
    where: { id: membershipId, organizationId, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!target) throw new Error("NOT_FOUND");
  await prisma.adminSession.updateMany({
    where: {
      revokedAt: null,
      OR: [
        { organizationMembershipId: target.id },
        { organizationMembershipId: null, userId: target.userId },
      ],
    },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: session.user.id,
      action: AuditAction.STAFF_SESSION_REVOKED,
      entityType: "OrganizationMembership",
      entityId: target.id,
    },
  });
  revalidatePath("/admin/settings/staff");
}

export async function sendStaffInvitationAction(formData: FormData): Promise<void> {
  const session = await managerContext();
  const organizationId = session.organization.id;
  const membershipId = value(formData, "membershipId");
  const target = await prisma.organizationMembership.findFirst({
    where: {
      id: membershipId,
      organizationId,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
    },
    select: { id: true, user: { select: { mobile: true } } },
  });
  if (!target?.user.mobile) return;
  const requested = await requestOtp({
    organizationId,
    mobile: target.user.mobile,
    purpose: OtpPurpose.STAFF_LOGIN,
    idempotencyKey: `staff-invite:${target.id}:${Math.floor(Date.now() / 60_000)}`,
  });
  if (requested.ok) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: session.user.id,
        action: AuditAction.OTP_REQUESTED,
        entityType: "OrganizationMembership",
        entityId: target.id,
      },
    });
  }
}
