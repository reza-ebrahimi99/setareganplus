/**
 * Counselor OS — server-side authorization.
 * Counselors authenticate via AdminSession (staff OTP / admin login).
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
    canReview: hasPermission(session, "guidance.review"),
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
 * When assignments exist → scoped list.
 * When none exist and user can review → all org students (includes zero-activity leads).
 */
export async function resolveAccessibleStudentFilter(params: {
  organizationId: string;
  counselorUserId: string;
  canReview: boolean;
}): Promise<{ studentId?: { in: string[] } } | "all-org"> {
  const assigned = await listAssignedStudentIds(params);
  if (assigned.length > 0) {
    return { studentId: { in: assigned } };
  }
  if (params.canReview) {
    return "all-org";
  }
  return { studentId: { in: [] } };
}

export function studentIdFilter(
  filter: Awaited<ReturnType<typeof resolveAccessibleStudentFilter>>,
): { id?: { in: string[] } } {
  if (filter === "all-org") return {};
  return { id: { in: filter.studentId?.in ?? [] } };
}

export async function assertCounselorCanAccessStudent(params: {
  organizationId: string;
  counselorUserId: string;
  studentId: string;
  canReview: boolean;
}): Promise<void> {
  const filter = await resolveAccessibleStudentFilter({
    organizationId: params.organizationId,
    counselorUserId: params.counselorUserId,
    canReview: params.canReview,
  });

  const student = await prisma.student.findFirst({
    where: {
      organizationId: params.organizationId,
      id: params.studentId,
      deletedAt: null,
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
