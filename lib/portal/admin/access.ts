/**
 * Domain helpers for portal User ↔ Student/Guardian access links.
 * Shared by admin FormData actions and student bulk import.
 */

import {
  MembershipStatus,
  PortalAccountType,
  SystemRole,
  UserStatus,
  type GuardianRelationshipType,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type DbClient = typeof prisma;

async function ensurePortalMembership(
  db: DbClient,
  params: {
    organizationId: string;
    userId: string;
    accountType: PortalAccountType;
  },
) {
  const role =
    params.accountType === PortalAccountType.STUDENT
      ? SystemRole.STUDENT
      : SystemRole.PARENT;

  const existing = await db.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
    },
    select: { id: true, status: true },
  });
  if (existing) {
    if (existing.status !== MembershipStatus.ACTIVE) {
      await db.organizationMembership.update({
        where: { id: existing.id },
        data: { status: MembershipStatus.ACTIVE },
      });
    }
    return existing.id;
  }

  const created = await db.organizationMembership.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      role,
      status: MembershipStatus.ACTIVE,
    },
    select: { id: true },
  });
  return created.id;
}

export type EnsurePortalAccessParams = {
  organizationId: string;
  accountType: PortalAccountType;
  /** Already normalized Iranian mobile (09xxxxxxxxx). */
  normalizedMobile: string;
  firstName: string;
  lastName: string;
  studentId?: string | null;
  guardianId?: string | null;
};

export type EnsurePortalAccessResult =
  | {
      ok: true;
      linkId: string;
      userId: string;
      created: boolean;
      alreadyExisted: boolean;
    }
  | { ok: false; error: string };

/**
 * Creates or reactivates a PortalAccountLink for OTP login.
 * Does not send SMS/OTP.
 */
export async function ensurePortalAccessLink(
  params: EnsurePortalAccessParams,
  db: DbClient = prisma,
): Promise<EnsurePortalAccessResult> {
  const {
    organizationId,
    accountType,
    normalizedMobile,
    firstName,
    lastName,
  } = params;
  const studentId =
    accountType === PortalAccountType.STUDENT ? params.studentId ?? null : null;
  const guardianId =
    accountType === PortalAccountType.GUARDIAN
      ? params.guardianId ?? null
      : null;

  if (accountType === PortalAccountType.STUDENT && !studentId) {
    return { ok: false, error: "شناسه دانش‌آموز برای دسترسی پرتال الزامی است." };
  }
  if (accountType === PortalAccountType.GUARDIAN && !guardianId) {
    return { ok: false, error: "شناسه ولی برای دسترسی پرتال الزامی است." };
  }

  if (studentId) {
    const student = await db.student.findFirst({
      where: { id: studentId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      return { ok: false, error: "دانش‌آموز برای دسترسی پرتال یافت نشد." };
    }
  }
  if (guardianId) {
    const guardian = await db.studentGuardian.findFirst({
      where: { id: guardianId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!guardian) {
      return { ok: false, error: "ولی برای دسترسی پرتال یافت نشد." };
    }
  }

  let user = await db.user.findFirst({
    where: { normalizedMobile, deletedAt: null },
    select: { id: true },
  });
  if (!user) {
    user = await db.user.create({
      data: {
        firstName: firstName.slice(0, 80) || "کاربر",
        lastName: lastName.slice(0, 80) || "پرتال",
        mobile: normalizedMobile,
        normalizedMobile,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
  }

  await ensurePortalMembership(db, {
    organizationId,
    userId: user.id,
    accountType,
  });

  const existing = await db.portalAccountLink.findFirst({
    where: {
      organizationId,
      userId: user.id,
      ...(accountType === PortalAccountType.STUDENT
        ? { studentId }
        : { guardianId }),
    },
    select: { id: true, deletedAt: true, isActive: true },
  });

  if (existing) {
    if (existing.deletedAt || !existing.isActive) {
      await db.portalAccountLink.update({
        where: { id: existing.id },
        data: {
          accountType,
          studentId,
          guardianId,
          isActive: true,
          deletedAt: null,
        },
      });
      return {
        ok: true,
        linkId: existing.id,
        userId: user.id,
        created: false,
        alreadyExisted: false,
      };
    }
    return {
      ok: true,
      linkId: existing.id,
      userId: user.id,
      created: false,
      alreadyExisted: true,
    };
  }

  const created = await db.portalAccountLink.create({
    data: {
      organizationId,
      userId: user.id,
      accountType,
      studentId,
      guardianId,
      isActive: true,
    },
    select: { id: true },
  });

  return {
    ok: true,
    linkId: created.id,
    userId: user.id,
    created: true,
    alreadyExisted: false,
  };
}

export type FindOrCreateGuardianParams = {
  organizationId: string;
  firstName: string;
  lastName: string;
  normalizedMobile: string;
  relationshipType: GuardianRelationshipType;
  /** When false (default), conflicting names produce a warning and existing values are kept. */
  allowProfileUpdate?: boolean;
};

export type FindOrCreateGuardianResult = {
  guardianId: string;
  created: boolean;
  reused: boolean;
  warning?: string;
};

export async function findOrCreateGuardianByMobile(
  params: FindOrCreateGuardianParams,
  db: DbClient = prisma,
): Promise<FindOrCreateGuardianResult> {
  const fullName = `${params.firstName} ${params.lastName}`.trim();
  const existing = await db.studentGuardian.findFirst({
    where: {
      organizationId: params.organizationId,
      normalizedMobile: params.normalizedMobile,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      relationshipType: true,
    },
  });

  if (existing) {
    const nameMismatch =
      existing.firstName.trim() !== params.firstName.trim() ||
      existing.lastName.trim() !== params.lastName.trim();
    let warning: string | undefined;
    if (nameMismatch) {
      warning = `ولی با این موبایل از قبل وجود دارد (${existing.firstName} ${existing.lastName})؛ مشخصات موجود حفظ شد.`;
      if (params.allowProfileUpdate) {
        await db.studentGuardian.update({
          where: { id: existing.id },
          data: {
            firstName: params.firstName,
            lastName: params.lastName,
            fullName,
            relationshipType: params.relationshipType,
            mobile: params.normalizedMobile,
            normalizedMobile: params.normalizedMobile,
            isActive: true,
            archivedAt: null,
          },
        });
        warning = `ولی موجود به‌روزرسانی شد (موبایل ${params.normalizedMobile}).`;
      }
    }
    return {
      guardianId: existing.id,
      created: false,
      reused: true,
      warning,
    };
  }

  const created = await db.studentGuardian.create({
    data: {
      organizationId: params.organizationId,
      firstName: params.firstName,
      lastName: params.lastName,
      fullName,
      mobile: params.normalizedMobile,
      normalizedMobile: params.normalizedMobile,
      relationshipType: params.relationshipType,
      isActive: true,
    },
    select: { id: true },
  });

  return {
    guardianId: created.id,
    created: true,
    reused: false,
  };
}

export type LinkGuardianStudentParams = {
  organizationId: string;
  studentId: string;
  guardianId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary?: boolean;
};

export type LinkGuardianStudentResult = {
  relationId: string;
  created: boolean;
  restored: boolean;
  alreadyLinked: boolean;
};

export async function ensureGuardianStudentRelation(
  params: LinkGuardianStudentParams,
  db: DbClient = prisma,
): Promise<LinkGuardianStudentResult> {
  const existing = await db.studentGuardianRelation.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      guardianId: params.guardianId,
    },
    select: { id: true, deletedAt: true },
  });

  if (existing) {
    if (existing.deletedAt) {
      await db.studentGuardianRelation.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          relationshipType: params.relationshipType,
          isPrimary: params.isPrimary ?? false,
          canViewAcademicData: true,
          canViewAchievements: true,
          canViewCertificates: true,
          canReceiveNotifications: true,
        },
      });
      return {
        relationId: existing.id,
        created: false,
        restored: true,
        alreadyLinked: false,
      };
    }
    return {
      relationId: existing.id,
      created: false,
      restored: false,
      alreadyLinked: true,
    };
  }

  const created = await db.studentGuardianRelation.create({
    data: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      guardianId: params.guardianId,
      relationshipType: params.relationshipType,
      isPrimary: params.isPrimary ?? false,
      canViewAcademicData: true,
      canViewAchievements: true,
      canViewCertificates: true,
      canReceiveNotifications: true,
    },
    select: { id: true },
  });

  return {
    relationId: created.id,
    created: true,
    restored: false,
    alreadyLinked: false,
  };
}
