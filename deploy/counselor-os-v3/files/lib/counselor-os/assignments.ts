/**
 * Counselor OS student assignment — reuses CounselorStudentAssignment.
 */

import { AuditAction, CounselorAssignmentStatus } from "@/generated/prisma/enums";
import {
  assertCounselorCanAccessStudent,
  guidanceV2StudentWhere,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import {
  assertCanAssignToCapacity,
  countActiveAssignments,
} from "@/lib/counselor-os/profiles";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";
import { labelStaffRole } from "@/lib/counselor-os/labels";

export type AssignmentView = {
  id: string;
  studentId: string;
  studentName: string;
  counselorUserId: string;
  counselorName: string;
  status: string;
  statusLabel: string;
  assignedAtLabel: string;
  actorName: string | null;
  previousCounselorName: string | null;
};

function statusLabel(status: string): string {
  if (status === "ACTIVE") return "فعال";
  if (status === "INACTIVE") return "پایان‌یافته";
  return status;
}

function personName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim() || null;
}

export async function listCounselorAssignments(params: {
  ctx: CounselorContext;
  counselorUserId: string;
}): Promise<AssignmentView[]> {
  if (!params.ctx.isSupervisor && params.ctx.userId !== params.counselorUserId) {
    throw new Error("مشاهده تخصیص‌های این مشاور مجاز نیست.");
  }

  const rows = await prisma.counselorStudentAssignment.findMany({
    where: {
      organizationId: params.ctx.organizationId,
      counselorUserId: params.counselorUserId,
    },
    include: {
      student: { select: { id: true, fullName: true } },
      counselor: { select: { firstName: true, lastName: true } },
      assignedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    studentId: row.student.id,
    studentName: row.student.fullName,
    counselorUserId: row.counselorUserId,
    counselorName: personName(row.counselor) ?? "—",
    status: row.status,
    statusLabel: statusLabel(row.status),
    assignedAtLabel: formatJalaliDateTimeShort(row.assignedAt),
    actorName: personName(row.assignedBy),
    previousCounselorName: null,
  }));
}

export async function loadStudentAssignment(params: {
  organizationId: string;
  studentId: string;
}) {
  const active = await prisma.counselorStudentAssignment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: CounselorAssignmentStatus.ACTIVE,
    },
    include: {
      counselor: { select: { firstName: true, lastName: true, id: true } },
      assignedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
  if (!active) return null;

  const previous = await prisma.counselorStudentAssignment.findFirst({
    where: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      status: CounselorAssignmentStatus.INACTIVE,
      counselorUserId: { not: active.counselorUserId },
    },
    include: { counselor: { select: { firstName: true, lastName: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return {
    userId: active.counselorUserId,
    name: personName(active.counselor) ?? "—",
    assignedAtLabel: formatJalaliDateTimeShort(active.assignedAt),
    statusLabel: statusLabel(active.status),
    actorName: personName(active.assignedBy),
    previousCounselorName: personName(previous?.counselor) ?? null,
  };
}

export async function listAssignableGuidanceStudents(params: {
  ctx: CounselorContext;
  q?: string;
  take?: number;
}) {
  if (!params.ctx.isSupervisor) {
    throw new Error("فقط مدیر / ناظر می‌تواند دانش‌آموز تخصیص دهد.");
  }
  const q = params.q?.trim();
  return prisma.student.findMany({
    where: {
      ...guidanceV2StudentWhere(params.ctx.organizationId),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: params.take ?? 40,
    select: {
      id: true,
      fullName: true,
      grade: { select: { name: true } },
    },
  });
}

export async function assignStudentToCounselor(params: {
  ctx: CounselorContext;
  counselorUserId: string;
  studentId: string;
  overrideCapacity?: boolean;
}) {
  if (!params.ctx.isSupervisor) {
    throw new Error("فقط مدیر / ناظر می‌تواند تخصیص بدهد.");
  }

  const student = await prisma.student.findFirst({
    where: {
      ...guidanceV2StudentWhere(params.ctx.organizationId),
      id: params.studentId,
    },
    select: { id: true, fullName: true },
  });
  if (!student) {
    throw new Error("دانش‌آموز در مسیر هدایت تحصیلی V2 یافت نشد.");
  }

  const counselor = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      userId: params.counselorUserId,
      deletedAt: null,
    },
    select: { id: true, role: true },
  });
  if (!counselor) throw new Error("مشاور یافت نشد.");

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      userId: params.counselorUserId,
      deletedAt: null,
    },
    select: { capacity: true, isActive: true },
  });
  if (advisor && advisor.isActive === false) {
    throw new Error("این مشاور غیرفعال است.");
  }

  const current = await prisma.counselorStudentAssignment.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      studentId: params.studentId,
      status: CounselorAssignmentStatus.ACTIVE,
    },
    select: { id: true, counselorUserId: true },
  });

  const alreadyOnSame =
    current?.counselorUserId === params.counselorUserId ? 1 : 0;
  const activeAssigned = await countActiveAssignments({
    organizationId: params.ctx.organizationId,
    counselorUserId: params.counselorUserId,
  });

  assertCanAssignToCapacity({
    capacity: advisor?.capacity ?? null,
    activeAssigned: activeAssigned - alreadyOnSame,
    override: Boolean(params.overrideCapacity),
    isSupervisor: params.ctx.isSupervisor,
  });

  const previousCounselorId = current?.counselorUserId ?? null;

  await prisma.$transaction(async (tx) => {
    if (current && current.counselorUserId !== params.counselorUserId) {
      await tx.counselorStudentAssignment.update({
        where: { id: current.id },
        data: { status: CounselorAssignmentStatus.INACTIVE },
      });
    }

    await tx.counselorStudentAssignment.upsert({
      where: {
        organizationId_counselorUserId_studentId: {
          organizationId: params.ctx.organizationId,
          counselorUserId: params.counselorUserId,
          studentId: params.studentId,
        },
      },
      update: {
        status: CounselorAssignmentStatus.ACTIVE,
        assignedAt: new Date(),
        assignedByUserId: params.ctx.userId,
      },
      create: {
        organizationId: params.ctx.organizationId,
        counselorUserId: params.counselorUserId,
        studentId: params.studentId,
        status: CounselorAssignmentStatus.ACTIVE,
        assignedByUserId: params.ctx.userId,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorUserId: params.ctx.userId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "CounselorStudentAssignment",
      entityId: params.studentId,
      metadata: {
        counselorUserId: params.counselorUserId,
        previousCounselorUserId: previousCounselorId,
        override: Boolean(params.overrideCapacity),
        kind: previousCounselorId && previousCounselorId !== params.counselorUserId
          ? "reassign"
          : "assign",
      },
    },
  });
}

export async function unassignStudent(params: {
  ctx: CounselorContext;
  counselorUserId: string;
  studentId: string;
}) {
  if (!params.ctx.isSupervisor) {
    throw new Error("فقط مدیر / ناظر می‌تواند تخصیص را بردارد.");
  }

  const row = await prisma.counselorStudentAssignment.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      counselorUserId: params.counselorUserId,
      studentId: params.studentId,
      status: CounselorAssignmentStatus.ACTIVE,
    },
    select: { id: true },
  });
  if (!row) throw new Error("تخصیص فعالی یافت نشد.");

  await prisma.counselorStudentAssignment.update({
    where: { id: row.id },
    data: { status: CounselorAssignmentStatus.INACTIVE },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorUserId: params.ctx.userId,
      action: AuditAction.GUIDANCE_STATUS_CHANGED,
      entityType: "CounselorStudentAssignment",
      entityId: params.studentId,
      metadata: { counselorUserId: params.counselorUserId, kind: "unassign" },
    },
  });
}

export async function listOrgCounselorsForSelect(ctx: CounselorContext) {
  if (!ctx.isSupervisor) return [];
  const rows = await prisma.organizationMembership.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
      role: "ADVISOR",
      status: "ACTIVE",
    },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return rows.map((row) => ({
    userId: row.user.id,
    name: personName(row.user) ?? "مشاور",
    roleLabel: labelStaffRole(row.role),
  }));
}

export { assertCounselorCanAccessStudent };
