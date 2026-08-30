/**
 * Guidance ERP — pre-registration provisioning after OTP (Phase 0).
 * Reuses Student, PortalAccountLink, User membership, OTP; creates GuidancePlan.
 * Does not write CRM Leads or ConsentRecord (Lead-scoped).
 */

import {
  AuditAction,
  GuidanceExamGroup,
  GuidancePlanStatus,
  PortalAccountType,
} from "@/generated/prisma/enums";
import {
  GUIDANCE_PRE_REG_CONSENT_TEXT,
  GUIDANCE_PRE_REG_CONSENT_VERSION,
} from "@/lib/guidance/consent";
import { GUIDANCE_EXAM_GROUPS, type GuidanceExamGroup as GuidanceExamGroupCode } from "@/lib/guidance/types";
import { ensurePortalAccessLink } from "@/lib/portal/admin/access";
import { prisma } from "@/lib/prisma";
import {
  composeStudentFullName,
  slugFromStudentName,
} from "@/lib/website/student-slug";

export type GuidancePreRegisterInput = {
  organizationId: string;
  firstName: string;
  lastName: string;
  normalizedMobile: string;
  examGroup: GuidanceExamGroup;
  gradeId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type GuidancePreRegisterResult =
  | {
      ok: true;
      planPublicId: string;
      userId: string;
      studentId: string;
      membershipId: string;
      createdPlan: boolean;
    }
  | { ok: false; error: string };

export function parseGuidanceExamGroup(
  raw: string,
): GuidanceExamGroup | null {
  const value = raw.trim() as GuidanceExamGroupCode;
  if (!(GUIDANCE_EXAM_GROUPS as readonly string[]).includes(value)) {
    return null;
  }
  return value as GuidanceExamGroup;
}

async function allocateUniqueStudentSlug(
  organizationId: string,
  fullName: string,
): Promise<string> {
  const base = slugFromStudentName(fullName) || `student-${Date.now().toString(36)}`;
  let candidate = base.slice(0, 80);
  for (let i = 0; i < 20; i += 1) {
    const existing = await prisma.student.findFirst({
      where: { organizationId, slug: candidate, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base.slice(0, 70)}-${(i + 2).toString(36)}`.slice(0, 80);
  }
  return `student-${Date.now().toString(36)}`;
}

/**
 * After OTP verify+consume: ensure Student + portal link + GuidancePlan + audits.
 */
export async function provisionGuidancePreRegistration(
  input: GuidancePreRegisterInput,
): Promise<GuidancePreRegisterResult> {
  const firstName = input.firstName.trim().slice(0, 80);
  const lastName = input.lastName.trim().slice(0, 80);
  if (!firstName || !lastName) {
    return { ok: false, error: "نام و نام خانوادگی الزامی است." };
  }

  const grade = await prisma.studentGrade.findFirst({
    where: {
      id: input.gradeId,
      organizationId: input.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  if (!grade) {
    return { ok: false, error: "پایه تحصیلی معتبر انتخاب کنید." };
  }

  const fullName = composeStudentFullName(firstName, lastName);

  // Reuse existing portal student link for this mobile when present.
  const existingUser = await prisma.user.findFirst({
    where: {
      normalizedMobile: input.normalizedMobile,
      deletedAt: null,
    },
    select: {
      id: true,
      portalAccountLinks: {
        where: {
          organizationId: input.organizationId,
          accountType: PortalAccountType.STUDENT,
          deletedAt: null,
          isActive: true,
          studentId: { not: null },
        },
        select: { studentId: true },
        take: 1,
      },
    },
  });

  let studentId = existingUser?.portalAccountLinks[0]?.studentId ?? null;

  if (!studentId) {
    const slug = await allocateUniqueStudentSlug(
      input.organizationId,
      fullName,
    );
    const student = await prisma.student.create({
      data: {
        organizationId: input.organizationId,
        gradeId: grade.id,
        firstName,
        lastName,
        fullName,
        slug,
        biography: "",
        isActive: true,
        isFeatured: false,
      },
      select: { id: true },
    });
    studentId = student.id;
  }

  const resolvedStudentId = studentId;

  const portal = await ensurePortalAccessLink({
    organizationId: input.organizationId,
    accountType: PortalAccountType.STUDENT,
    normalizedMobile: input.normalizedMobile,
    firstName,
    lastName,
    studentId: resolvedStudentId,
  });
  if (!portal.ok) {
    return { ok: false, error: portal.error };
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: portal.userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!membership) {
    return { ok: false, error: "عضویت پرتال ایجاد نشد. دوباره تلاش کنید." };
  }

  const existingPlan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: portal.userId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, publicId: true },
  });

  if (existingPlan) {
    return {
      ok: true,
      planPublicId: existingPlan.publicId,
      userId: portal.userId,
      studentId: resolvedStudentId,
      membershipId: membership.id,
      createdPlan: false,
    };
  }

  const now = new Date();
  const plan = await prisma.guidancePlan.create({
    data: {
      organizationId: input.organizationId,
      studentId: resolvedStudentId,
      userId: portal.userId,
      status: GuidancePlanStatus.PRE_REGISTERED,
      examGroup: input.examGroup,
      consentGrantedAt: now,
      consentVersion: GUIDANCE_PRE_REG_CONSENT_VERSION,
      consentText: GUIDANCE_PRE_REG_CONSENT_TEXT,
    },
    select: { id: true, publicId: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: portal.userId,
      action: AuditAction.GUIDANCE_PLAN_CREATED,
      entityType: "GuidancePlan",
      entityId: plan.id,
      metadata: {
        publicId: plan.publicId,
        examGroup: input.examGroup,
        consentVersion: GUIDANCE_PRE_REG_CONSENT_VERSION,
      },
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return {
    ok: true,
    planPublicId: plan.publicId,
    userId: portal.userId,
    studentId: resolvedStudentId,
    membershipId: membership.id,
    createdPlan: true,
  };
}
