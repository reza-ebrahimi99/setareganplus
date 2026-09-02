/**
 * Counselor follow-ups.
 */

import { CounselorFollowUpStatus } from "@/generated/prisma/enums";
import {
  assertCounselorCanAccessStudent,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export async function listCounselorFollowUps(
  ctx: CounselorContext,
  filter?: "today" | "overdue" | "upcoming" | "all",
) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  let dueFilter: { gte?: Date; lte?: Date; lt?: Date } | undefined;
  if (filter === "today") {
    dueFilter = { gte: startOfDay, lte: endOfDay };
  } else if (filter === "overdue") {
    dueFilter = { lt: startOfDay };
  } else if (filter === "upcoming") {
    dueFilter = { gte: endOfDay };
  }

  const rows = await prisma.counselorFollowUp.findMany({
    where: {
      organizationId: ctx.organizationId,
      counselorUserId: ctx.userId,
      status: CounselorFollowUpStatus.PENDING,
      ...(dueFilter ? { dueAt: dueFilter } : {}),
    },
    include: { student: { select: { fullName: true, id: true } } },
    orderBy: { dueAt: "asc" },
    take: 50,
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    studentId: r.student.id,
    studentName: r.student.fullName,
    dueLabel: formatJalaliDateTimeShort(r.dueAt),
    priority: r.priority,
  }));
}

export async function createCounselorFollowUp(params: {
  ctx: CounselorContext;
  studentId: string;
  title: string;
  description?: string;
  dueAt: Date;
}) {
  await assertCounselorCanAccessStudent({
    organizationId: params.ctx.organizationId,
    counselorUserId: params.ctx.userId,
    studentId: params.studentId,
    canReview: params.ctx.canReview,
  });

  return prisma.counselorFollowUp.create({
    data: {
      organizationId: params.ctx.organizationId,
      studentId: params.studentId,
      counselorUserId: params.ctx.userId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      dueAt: params.dueAt,
    },
  });
}

export async function completeCounselorFollowUp(params: {
  ctx: CounselorContext;
  followUpId: string;
}) {
  const row = await prisma.counselorFollowUp.findFirst({
    where: {
      id: params.followUpId,
      organizationId: params.ctx.organizationId,
      counselorUserId: params.ctx.userId,
    },
  });
  if (!row) throw new Error("پیگیری یافت نشد.");

  await prisma.counselorFollowUp.update({
    where: { id: params.followUpId },
    data: {
      status: CounselorFollowUpStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
}
