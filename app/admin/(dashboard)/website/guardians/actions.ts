"use server";

import { revalidatePath } from "next/cache";
import {
  GuardianRelationshipType,
  PortalAccountType,
} from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/require-admin";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { logServerError } from "@/lib/observability/server-log";
import { persianPrismaError } from "@/lib/prisma/user-facing-error";
import { ensurePortalAccessLink } from "@/lib/portal/admin/access";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isRelationshipType(value: string): value is GuardianRelationshipType {
  return value in GuardianRelationshipType;
}

function revalidatePortalAdmin() {
  revalidatePath("/admin/website/guardians");
  revalidatePath("/admin/website/portal-access");
}

export async function createGuardian(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const organizationId = session.organization.id;
  const firstName = readString(formData, "firstName").trim().slice(0, 80);
  const lastName = readString(formData, "lastName").trim().slice(0, 80);
  const mobileRaw = readString(formData, "mobile").trim();
  const relationshipRaw = readString(formData, "relationshipType").trim();
  const parsed = normalizeIranianMobile(mobileRaw);
  if (!firstName || !lastName || !parsed.ok) return;
  const relationshipType = isRelationshipType(relationshipRaw)
    ? relationshipRaw
    : GuardianRelationshipType.GUARDIAN;

  try {
    await prisma.studentGuardian.create({
      data: {
        organizationId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        mobile: parsed.normalized,
        normalizedMobile: parsed.normalized,
        nationalId: readString(formData, "nationalId").trim().slice(0, 20) || null,
        relationshipType,
        isPrimary: readString(formData, "isPrimary") === "true",
        isActive: true,
      },
    });
  } catch (error) {
    logServerError(
      {
        module: "portal.admin",
        action: "createGuardian",
        category: "mutation",
        organizationId,
        userId: session.user.id,
      },
      error,
    );
  }
  revalidatePortalAdmin();
}

export async function updateGuardian(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const organizationId = session.organization.id;
  const guardianId = readString(formData, "guardianId").trim();
  const guardian = await prisma.studentGuardian.findFirst({
    where: { id: guardianId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!guardian) return;

  const firstName = readString(formData, "firstName").trim().slice(0, 80);
  const lastName = readString(formData, "lastName").trim().slice(0, 80);
  const mobileRaw = readString(formData, "mobile").trim();
  const parsed = normalizeIranianMobile(mobileRaw);
  if (!firstName || !lastName || !parsed.ok) return;
  const relationshipRaw = readString(formData, "relationshipType").trim();

  await prisma.studentGuardian.update({
    where: { id: guardian.id },
    data: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      mobile: parsed.normalized,
      normalizedMobile: parsed.normalized,
      nationalId: readString(formData, "nationalId").trim().slice(0, 20) || null,
      relationshipType: isRelationshipType(relationshipRaw)
        ? relationshipRaw
        : GuardianRelationshipType.GUARDIAN,
      isPrimary: readString(formData, "isPrimary") === "true",
      isActive: readString(formData, "isActive") === "true",
      archivedAt:
        readString(formData, "archived") === "true" ? new Date() : null,
    },
  });
  revalidatePortalAdmin();
}

export async function linkGuardianStudent(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const organizationId = session.organization.id;
  const guardianId = readString(formData, "guardianId").trim();
  const studentId = readString(formData, "studentId").trim();
  const relationshipRaw = readString(formData, "relationshipType").trim();

  const [guardian, student] = await Promise.all([
    prisma.studentGuardian.findFirst({
      where: { id: guardianId, organizationId, deletedAt: null },
      select: { id: true },
    }),
    prisma.student.findFirst({
      where: { id: studentId, organizationId, deletedAt: null },
      select: { id: true },
    }),
  ]);
  if (!guardian || !student) return;

  const existing = await prisma.studentGuardianRelation.findFirst({
    where: {
      organizationId,
      guardianId: guardian.id,
      studentId: student.id,
    },
    select: { id: true, deletedAt: true },
  });

  const data = {
    relationshipType: isRelationshipType(relationshipRaw)
      ? relationshipRaw
      : GuardianRelationshipType.GUARDIAN,
    isPrimary: readString(formData, "isPrimary") === "true",
    canViewAcademicData: readString(formData, "canViewAcademicData") === "true",
    canViewAchievements: readString(formData, "canViewAchievements") === "true",
    canViewCertificates: readString(formData, "canViewCertificates") === "true",
    canReceiveNotifications:
      readString(formData, "canReceiveNotifications") === "true",
    deletedAt: null as Date | null,
  };

  if (existing) {
    await prisma.studentGuardianRelation.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.studentGuardianRelation.create({
      data: {
        organizationId,
        guardianId: guardian.id,
        studentId: student.id,
        ...data,
      },
    });
  }
  revalidatePortalAdmin();
}

export async function unlinkGuardianStudent(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const relationId = readString(formData, "relationId").trim();
  const relation = await prisma.studentGuardianRelation.findFirst({
    where: {
      id: relationId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!relation) return;
  await prisma.studentGuardianRelation.update({
    where: { id: relation.id },
    data: { deletedAt: new Date() },
  });
  revalidatePortalAdmin();
}

export async function createPortalAccessLink(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const organizationId = session.organization.id;
  const accountTypeRaw = readString(formData, "accountType").trim();
  const accountType =
    accountTypeRaw === "GUARDIAN"
      ? PortalAccountType.GUARDIAN
      : PortalAccountType.STUDENT;
  const mobileParsed = normalizeIranianMobile(readString(formData, "mobile"));
  const studentId = readString(formData, "studentId").trim() || null;
  const guardianId = readString(formData, "guardianId").trim() || null;
  const firstName = readString(formData, "firstName").trim().slice(0, 80) || "کاربر";
  const lastName = readString(formData, "lastName").trim().slice(0, 80) || "پرتال";

  if (!mobileParsed.ok) return;
  if (accountType === PortalAccountType.STUDENT && !studentId) return;
  if (accountType === PortalAccountType.GUARDIAN && !guardianId) return;

  try {
    await ensurePortalAccessLink({
      organizationId,
      accountType,
      normalizedMobile: mobileParsed.normalized,
      firstName,
      lastName,
      studentId,
      guardianId,
    });
  } catch (error) {
    logServerError(
      {
        module: "portal.admin",
        action: "createPortalAccessLink",
        category: "mutation",
        organizationId,
        userId: session.user.id,
        message: persianPrismaError(error),
      },
      error,
    );
  }
  revalidatePortalAdmin();
}

export async function setPortalAccessActive(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const linkId = readString(formData, "linkId").trim();
  const isActive = readString(formData, "isActive") === "true";
  const link = await prisma.portalAccountLink.findFirst({
    where: {
      id: linkId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!link) return;
  await prisma.portalAccountLink.update({
    where: { id: link.id },
    data: { isActive },
  });
  revalidatePortalAdmin();
}

export async function revokePortalAccessLink(formData: FormData) {
  const session = await requirePermission("students.portal.manage");
  const linkId = readString(formData, "linkId").trim();
  const link = await prisma.portalAccountLink.findFirst({
    where: {
      id: linkId,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!link) return;
  await prisma.portalAccountLink.update({
    where: { id: link.id },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePortalAdmin();
}
