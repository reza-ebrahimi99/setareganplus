import type { GuardianRelationshipType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";

export const GUARDIAN_RELATIONSHIP_LABELS: Record<
  GuardianRelationshipType,
  string
> = {
  FATHER: "پدر",
  MOTHER: "مادر",
  GUARDIAN: "سرپرست",
  OTHER: "سایر",
};

export async function listAdminGuardians(
  organizationId: string,
  options?: { q?: string },
) {
  const q = options?.q?.trim() ?? "";
  const mobile = q ? normalizeIranianMobile(q) : null;
  const where: Prisma.StudentGuardianWhereInput = {
    organizationId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            ...(mobile?.ok
              ? [{ normalizedMobile: mobile.normalized }]
              : [{ mobile: { contains: q } }]),
          ],
        }
      : {}),
  };

  return prisma.studentGuardian.findMany({
    where,
    orderBy: [{ fullName: "asc" }],
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      mobile: true,
      normalizedMobile: true,
      relationshipType: true,
      isPrimary: true,
      isActive: true,
      archivedAt: true,
      _count: {
        select: { relations: { where: { deletedAt: null } } },
      },
    },
  });
}

export async function loadAdminGuardian(
  organizationId: string,
  guardianId: string,
) {
  return prisma.studentGuardian.findFirst({
    where: { id: guardianId, organizationId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fullName: true,
      nationalId: true,
      mobile: true,
      normalizedMobile: true,
      relationshipType: true,
      isPrimary: true,
      isActive: true,
      archivedAt: true,
      relations: {
        where: { deletedAt: null },
        select: {
          id: true,
          studentId: true,
          relationshipType: true,
          isPrimary: true,
          canViewAcademicData: true,
          canViewAchievements: true,
          canViewCertificates: true,
          canReceiveNotifications: true,
          student: { select: { id: true, fullName: true, grade: { select: { name: true } } } },
        },
      },
    },
  });
}

export async function listAdminPortalLinks(
  organizationId: string,
  options?: { q?: string },
) {
  const q = options?.q?.trim() ?? "";
  const mobile = q ? normalizeIranianMobile(q) : null;

  return prisma.portalAccountLink.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              {
                user: {
                  OR: [
                    ...(mobile?.ok
                      ? [{ normalizedMobile: mobile.normalized }]
                      : [{ mobile: { contains: q } }]),
                    { firstName: { contains: q, mode: "insensitive" } },
                    { lastName: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
              { student: { fullName: { contains: q, mode: "insensitive" } } },
              { guardian: { fullName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      accountType: true,
      isActive: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          normalizedMobile: true,
        },
      },
      student: { select: { id: true, fullName: true } },
      guardian: { select: { id: true, fullName: true } },
    },
  });
}
