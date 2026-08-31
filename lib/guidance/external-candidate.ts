/**
 * Guidance Platform — external candidate admission via portal OTP.
 * Creates Student + portal link + empty PRE_REGISTERED GuidancePlan.
 * Does not write CRM Leads. Existing portal users are untouched.
 */

import {
  AuditAction,
  GuidanceExamGroup,
  GuidancePlanStatus,
  PortalAccountType,
} from "@/generated/prisma/enums";
import { ensurePortalAccessLink } from "@/lib/portal/admin/access";
import { prisma } from "@/lib/prisma";
import {
  composeStudentFullName,
  slugFromStudentName,
} from "@/lib/website/student-slug";
import { ensureDefaultStudentGrades } from "@/lib/website/student-grades";

/** Placeholder identity until Guidance onboarding completes. */
export const EXTERNAL_CANDIDATE_FIRST_NAME = "داوطلب" as const;
export const EXTERNAL_CANDIDATE_LAST_NAME = "جدید" as const;

/** Provisional exam group until onboarding maps high-school major. */
export const EXTERNAL_CANDIDATE_PROVISIONAL_EXAM_GROUP =
  GuidanceExamGroup.EXPERIMENTAL_SCIENCES;

export const GUIDANCE_ONBOARDING_PATH =
  "/portal/student/services/guidance/onboarding" as const;

export type ExternalCandidateProvisionResult =
  | {
      ok: true;
      planPublicId: string;
      userId: string;
      studentId: string;
      membershipId: string;
      createdPlan: boolean;
      createdStudent: boolean;
    }
  | { ok: false; error: string };

async function allocateUniqueStudentSlug(
  organizationId: string,
  fullName: string,
): Promise<string> {
  const base =
    slugFromStudentName(fullName) ||
    `candidate-${Date.now().toString(36)}`;
  let candidate = base.slice(0, 80);
  for (let i = 0; i < 20; i += 1) {
    const existing = await prisma.student.findFirst({
      where: { organizationId, slug: candidate, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base.slice(0, 70)}-${(i + 2).toString(36)}`.slice(0, 80);
  }
  return `candidate-${Date.now().toString(36)}`;
}

/**
 * True when the student has a PRE_REGISTERED plan that has not finished
 * Guidance onboarding (no consent snapshot yet). Existing pre-register
 * users always have consentGrantedAt and are not redirected.
 */
export async function candidateNeedsGuidanceOnboarding(params: {
  organizationId: string;
  userId: string;
  studentId: string;
}): Promise<boolean> {
  const plan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      studentId: params.studentId,
      deletedAt: null,
      status: GuidancePlanStatus.PRE_REGISTERED,
      consentGrantedAt: null,
    },
    select: { id: true },
  });
  return Boolean(plan);
}

/**
 * After OTP verify for an unknown mobile: create Candidate (Student) +
 * empty Guidance Case (PRE_REGISTERED) + portal access. No admin step.
 */
export async function provisionExternalGuidanceCandidate(params: {
  organizationId: string;
  normalizedMobile: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<ExternalCandidateProvisionResult> {
  await ensureDefaultStudentGrades(params.organizationId);

  const grade = await prisma.studentGrade.findFirst({
    where: {
      organizationId: params.organizationId,
      slug: "other",
      deletedAt: null,
      isActive: true,
    },
    select: { id: true },
  });
  if (!grade) {
    return {
      ok: false,
      error: "پایه تحصیلی پیش‌فرض برای داوطلب یافت نشد.",
    };
  }

  const firstName = EXTERNAL_CANDIDATE_FIRST_NAME;
  const lastName = EXTERNAL_CANDIDATE_LAST_NAME;
  const fullName = composeStudentFullName(firstName, lastName);

  const existingUser = await prisma.user.findFirst({
    where: {
      normalizedMobile: params.normalizedMobile,
      deletedAt: null,
    },
    select: {
      id: true,
      portalAccountLinks: {
        where: {
          organizationId: params.organizationId,
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
  let createdStudent = false;

  if (!studentId) {
    const slug = await allocateUniqueStudentSlug(
      params.organizationId,
      fullName,
    );
    const student = await prisma.student.create({
      data: {
        organizationId: params.organizationId,
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
    createdStudent = true;
  }

  const portal = await ensurePortalAccessLink({
    organizationId: params.organizationId,
    accountType: PortalAccountType.STUDENT,
    normalizedMobile: params.normalizedMobile,
    firstName,
    lastName,
    studentId,
  });
  if (!portal.ok) {
    return { ok: false, error: portal.error };
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: portal.userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!membership) {
    return { ok: false, error: "عضویت پرتال ایجاد نشد. دوباره تلاش کنید." };
  }
  if (!studentId) {
    return { ok: false, error: "پرونده دانش‌آموز ایجاد نشد." };
  }

  const ensured = await ensureGuidanceCase({
    organizationId: params.organizationId,
    userId: portal.userId,
    studentId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    flow: "external-candidate",
  });
  if (!ensured.ok) return ensured;

  return {
    ok: true,
    planPublicId: ensured.publicId,
    userId: portal.userId,
    studentId,
    membershipId: membership.id,
    createdPlan: ensured.createdPlan,
    createdStudent,
  };
}

/**
 * Ensures a GuidancePlan (Student Case) exists for this portal student.
 * Does not rewrite identity, consent, or journey progress on existing cases.
 */
export async function ensureGuidanceCase(params: {
  organizationId: string;
  userId: string;
  studentId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  flow?: string;
}): Promise<
  | { ok: true; publicId: string; createdPlan: boolean }
  | { ok: false; error: string }
> {
  const existingPlan = await prisma.guidancePlan.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      studentId: params.studentId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { publicId: true },
  });
  if (existingPlan) {
    return { ok: true, publicId: existingPlan.publicId, createdPlan: false };
  }

  const plan = await prisma.guidancePlan.create({
    data: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      userId: params.userId,
      status: GuidancePlanStatus.PRE_REGISTERED,
      examGroup: EXTERNAL_CANDIDATE_PROVISIONAL_EXAM_GROUP,
      consentGrantedAt: null,
      consentVersion: null,
      consentText: null,
    },
    select: { id: true, publicId: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.userId,
      action: AuditAction.GUIDANCE_PLAN_CREATED,
      entityType: "GuidancePlan",
      entityId: plan.id,
      metadata: {
        publicId: plan.publicId,
        flow: params.flow ?? "ensure-guidance-case",
        examGroup: EXTERNAL_CANDIDATE_PROVISIONAL_EXAM_GROUP,
        status: GuidancePlanStatus.PRE_REGISTERED,
      },
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  return { ok: true, publicId: plan.publicId, createdPlan: true };
}
