/**
 * Counseling session records — persistent documentation.
 */

import {
  CounselingSessionRecordStatus,
  CounselingSessionType,
} from "@/generated/prisma/enums";
import {
  assertCounselorCanAccessStudent,
  type CounselorContext,
} from "@/lib/counselor-os/auth";
import { prisma } from "@/lib/prisma";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";

export type SessionRecordView = {
  id: string;
  studentId: string;
  studentName: string;
  status: CounselingSessionRecordStatus;
  sessionType: CounselingSessionType;
  subject: string | null;
  summary: string | null;
  scheduledLabel: string | null;
  isDraft: boolean;
  counselorName: string;
};

export async function listStudentSessionHistory(
  ctx: CounselorContext,
  studentId: string,
): Promise<SessionRecordView[]> {
  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId,
    canReview: ctx.canReview,
  });

  const rows = await prisma.counselingSessionRecord.findMany({
    where: {
      organizationId: ctx.organizationId,
      studentId,
    },
    include: {
      student: { select: { fullName: true } },
      counselor: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return rows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.fullName,
    status: r.status,
    sessionType: r.sessionType,
    subject: r.subject,
    summary: r.summary,
    scheduledLabel: r.scheduledAt
      ? formatJalaliDateTimeShort(r.scheduledAt)
      : null,
    isDraft: r.isDraft,
    counselorName: `${r.counselor.firstName} ${r.counselor.lastName}`.trim(),
  }));
}

export type SessionWorkspaceModel = {
  id: string;
  studentId: string;
  studentName: string;
  status: CounselingSessionRecordStatus;
  sessionType: CounselingSessionType;
  subject: string;
  body: string;
  keyPoints: string;
  decisions: string;
  studentActionItems: string;
  counselorActionItems: string;
  summary: string;
  nextFollowUpAt: string | null;
  isDraft: boolean;
};

export async function loadSessionWorkspace(
  ctx: CounselorContext,
  sessionId: string,
): Promise<SessionWorkspaceModel> {
  const row = await prisma.counselingSessionRecord.findFirst({
    where: {
      id: sessionId,
      organizationId: ctx.organizationId,
    },
    include: { student: { select: { fullName: true } } },
  });
  if (!row) {
    throw new Error("جلسه یافت نشد.");
  }

  await assertCounselorCanAccessStudent({
    organizationId: ctx.organizationId,
    counselorUserId: ctx.userId,
    studentId: row.studentId,
    canReview: ctx.canReview,
  });

  if (row.counselorUserId !== ctx.userId && !ctx.canReview) {
    throw new Error("فقط مشاور برگزارکننده می‌تواند این جلسه را ویرایش کند.");
  }

  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student.fullName,
    status: row.status,
    sessionType: row.sessionType,
    subject: row.subject ?? "",
    body: row.body ?? "",
    keyPoints: row.keyPoints ?? "",
    decisions: row.decisions ?? "",
    studentActionItems: row.studentActionItems ?? "",
    counselorActionItems: row.counselorActionItems ?? "",
    summary: row.summary ?? "",
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    isDraft: row.isDraft,
  };
}

export async function createSessionFromAppointment(params: {
  ctx: CounselorContext;
  appointmentId: string;
}): Promise<string> {
  const appt = await prisma.counselorAppointment.findFirst({
    where: {
      id: params.appointmentId,
      organizationId: params.ctx.organizationId,
      counselorUserId: params.ctx.userId,
    },
    include: {
      bookingReservation: { include: { slot: true } },
    },
  });
  if (!appt) throw new Error("نوبت یافت نشد.");

  const existing = await prisma.counselingSessionRecord.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      bookingReservationId: appt.bookingReservationId,
    },
  });
  if (existing) return existing.id;

  const created = await prisma.counselingSessionRecord.create({
    data: {
      organizationId: params.ctx.organizationId,
      studentId: appt.studentId,
      counselorUserId: params.ctx.userId,
      guidancePlanId: appt.guidancePlanId,
      bookingReservationId: appt.bookingReservationId,
      scheduledAt: appt.bookingReservation.slot.startsAt,
      sessionType:
        appt.bookingReservation.meetingType === "ONLINE"
          ? CounselingSessionType.ONLINE
          : appt.bookingReservation.meetingType === "PHONE"
            ? CounselingSessionType.PHONE
            : CounselingSessionType.IN_PERSON,
      status: CounselingSessionRecordStatus.SCHEDULED,
      isDraft: true,
    },
  });
  return created.id;
}

export type SaveSessionInput = {
  subject?: string;
  body?: string;
  keyPoints?: string;
  decisions?: string;
  studentActionItems?: string;
  counselorActionItems?: string;
  summary?: string;
  nextFollowUpAt?: Date | null;
  markCompleted?: boolean;
  saveDraft?: boolean;
};

export async function saveSessionRecord(params: {
  ctx: CounselorContext;
  sessionId: string;
  input: SaveSessionInput;
}): Promise<void> {
  const row = await prisma.counselingSessionRecord.findFirst({
    where: {
      id: params.sessionId,
      organizationId: params.ctx.organizationId,
      counselorUserId: params.ctx.userId,
    },
  });
  if (!row) throw new Error("جلسه یافت نشد.");

  await prisma.counselingSessionRecord.update({
    where: { id: params.sessionId },
    data: {
      subject: params.input.subject ?? row.subject,
      body: params.input.body ?? row.body,
      keyPoints: params.input.keyPoints ?? row.keyPoints,
      decisions: params.input.decisions ?? row.decisions,
      studentActionItems:
        params.input.studentActionItems ?? row.studentActionItems,
      counselorActionItems:
        params.input.counselorActionItems ?? row.counselorActionItems,
      summary: params.input.summary ?? row.summary,
      nextFollowUpAt:
        params.input.nextFollowUpAt !== undefined
          ? params.input.nextFollowUpAt
          : row.nextFollowUpAt,
      isDraft: params.input.markCompleted ? false : params.input.saveDraft ?? row.isDraft,
      status: params.input.markCompleted
        ? CounselingSessionRecordStatus.COMPLETED
        : row.status,
      endedAt: params.input.markCompleted ? new Date() : row.endedAt,
    },
  });

  if (params.input.markCompleted && params.input.nextFollowUpAt) {
    await prisma.counselorFollowUp.create({
      data: {
        organizationId: params.ctx.organizationId,
        studentId: row.studentId,
        counselorUserId: params.ctx.userId,
        sessionRecordId: row.id,
        title: "پیگیری پس از جلسه",
        description: params.input.summary ?? undefined,
        dueAt: params.input.nextFollowUpAt,
      },
    });
  }
}
