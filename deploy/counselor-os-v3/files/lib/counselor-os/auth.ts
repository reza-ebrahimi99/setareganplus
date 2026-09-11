/**
 * Counselor OS — server-side authorization.
 * Counselors authenticate via AdminSession (staff OTP / admin login).
 *
 * Supervisor (non-ADVISOR staff / platform admin): all org Guidance V2 students
 * and all counselors.
 * Counselor (ADVISOR): only students with an ACTIVE assignment to themselves.
 */

import { redirect } from "next/navigation";
import { CounselorAssignmentStatus } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { COUNSELOR_LOGIN_NEXT } from "@/lib/counselor-os/constants";
import { labelStaffRole } from "@/lib/counselor-os/labels";
import { prisma } from "@/lib/prisma";

export type CounselorContext = NonNullable<Awaited<ReturnType<typeof getCounselorContext>>>;

export async function getCounselorContext() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, "guidance.view")) return null;
  const isSupervisor =
    session.user.isPlatformAdmin || session.membership.role !== "ADVISOR";
  return {
    organizationId: session.organization.id,
    userId: session.user.id,
    displayName: session.user.displayName,
    canReview: isSupervisor,
    isPlatformAdmin: session.user.isPlatformAdmin,
    role: session.membership.role,
    roleLabel: session.user.isPlatformAdmin
      ? "ناظر سامانه"
      : labelStaffRole(session.membership.role),
    isSupervisor,
    viewingAsCounselor: !isSupervisor,
  };
}

export async function requireCounselorContext() {
  const ctx = await getCounselorContext();
  if (!ctx) {
    redirect(`/admin/login?next=${encodeURIComponent(COUNSELOR_LOGIN_NEXT)}`);
  }
  return ctx;
}

export async function requireSupervisorContext() {
  const ctx = await requireCounselorContext();
  if (!ctx.isSupervisor) {
    redirect("/admin/counselor");
  }
  return ctx;
}

/** Students explicitly assigned to this counselor (active). */
export async function listAssignedStudentIds(params: {
  organizationId: string;
  counselorUserId: string;
}): Promise<string[]> {
  const rows = await prisma.counselorStudentAssignment.findMany({
    where: {
      organizationId: params.organizationId,
      counselorUserId: params.counselorUserId,
      status: CounselorAssignmentStatus.ACTIVE,
    },
    select: { studentId: true },
  });
  return rows.map((r) => r.studentId);
}

/**
 * Supervisor → all org (still filtered to Guidance V2 at query time).
 * Counselor → only active assignments (empty list if none — never all-org).
 */
export async function resolveAccessibleStudentFilter(params: {
  organizationId: string;
  counselorUserId: string;
  canReview?: boolean;
  isSupervisor?: boolean;
}): Promise<{ studentId?: { in: string[] } } | "all-org"> {
  const supervisor = params.isSupervisor ?? params.canReview ?? false;
  if (supervisor) return "all-org";
  const assigned = await listAssignedStudentIds({
    organizationId: params.organizationId,
    counselorUserId: params.counselorUserId,
  });
  return { studentId: { in: assigned } };
}

export function studentIdFilter(
  filter: Awaited<ReturnType<typeof resolveAccessibleStudentFilter>>,
): { id?: { in: string[] } } {
  if (filter === "all-org") return {};
  return { id: { in: filter.studentId?.in ?? [] } };
}

/**
 * Eligible Counselor OS students: live Guidance V2 plans only.
 * Production marker is GuidancePlan.journeyVersion = 2.
 * Does not return every organization Student row, and does not include legacy plans.
 */
export function guidanceV2StudentWhere(organizationId: string) {
  return {
    organizationId,
    deletedAt: null,
    guidancePlans: {
      some: {
        organizationId,
        deletedAt: null,
        journeyVersion: 2,
      },
    },
  };
}

export async function assertCounselorCanAccessStudent(params: {
  organizationId: string;
  counselorUserId: string;
  studentId: string;
  canReview?: boolean;
  isSupervisor?: boolean;
}): Promise<void> {
  const filter = await resolveAccessibleStudentFilter({
    organizationId: params.organizationId,
    counselorUserId: params.counselorUserId,
    canReview: params.canReview,
    isSupervisor: params.isSupervisor,
  });

  const student = await prisma.student.findFirst({
    where: {
      ...guidanceV2StudentWhere(params.organizationId),
      id: params.studentId,
    },
    select: { id: true },
  });
  if (!student) {
    throw new CounselorAccessError("دانش‌آموز یافت نشد.");
  }

  if (filter === "all-org") return;

  if (!filter.studentId?.in.includes(params.studentId)) {
    throw new CounselorAccessError("دسترسی به این دانش‌آموز مجاز نیست.");
  }
}

export class CounselorAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounselorAccessError";
  }
}
