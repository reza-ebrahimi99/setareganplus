import { prisma } from "@/lib/prisma";

export const APPOINTMENT_ENTITY = "COUNSELOR_APPOINTMENT" as const;

export async function notifyCounselorStaff(params: {
  organizationId: string;
  counselorUserId: string;
  title: string;
  body?: string | null;
  appointmentId: string;
  dedupeSuffix: string;
}) {
  const dedupeKey = `${params.appointmentId}:${params.dedupeSuffix}`;
  const exists = await prisma.staffNotification.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.counselorUserId,
      entityType: APPOINTMENT_ENTITY,
      entityId: params.appointmentId,
      title: params.title,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (exists) return;

  await prisma.staffNotification.create({
    data: {
      organizationId: params.organizationId,
      userId: params.counselorUserId,
      title: params.title,
      body: params.body ?? null,
      entityType: APPOINTMENT_ENTITY,
      entityId: params.appointmentId,
    },
  });
  void dedupeKey;
}

export async function notifyStudentPortal(params: {
  organizationId: string;
  studentId: string;
  title: string;
  body?: string | null;
  entityType?: string;
  entityId?: string;
  dedupeKey: string;
}) {
  await prisma.studentPortalNotification.upsert({
    where: {
      organizationId_studentId_dedupeKey: {
        organizationId: params.organizationId,
        studentId: params.studentId,
        dedupeKey: params.dedupeKey,
      },
    },
    create: {
      organizationId: params.organizationId,
      studentId: params.studentId,
      title: params.title,
      body: params.body ?? null,
      entityType: params.entityType ?? APPOINTMENT_ENTITY,
      entityId: params.entityId ?? null,
      dedupeKey: params.dedupeKey,
    },
    update: {
      title: params.title,
      body: params.body ?? null,
      readAt: null,
    },
  });
}
