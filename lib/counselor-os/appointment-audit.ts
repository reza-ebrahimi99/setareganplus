import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type AuditDb = Prisma.TransactionClient | typeof prisma;

export async function writeAppointmentAudit(params: {
  organizationId: string;
  appointmentId: string;
  actorUserId: string;
  action: string;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  tx?: AuditDb;
}) {
  const db = (params.tx ?? prisma) as AuditDb;
  await db.counselorAppointmentAuditLog.create({
    data: {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
      actorUserId: params.actorUserId,
      action: params.action,
      reason: params.reason?.trim() || null,
      beforeJson: params.before ?? undefined,
      afterJson: params.after ?? undefined,
    },
  });
}

export async function listAppointmentAuditLogs(params: {
  organizationId: string;
  appointmentId: string;
  take?: number;
}) {
  return prisma.counselorAppointmentAuditLog.findMany({
    where: {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
    },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 40,
    include: {
      actor: { select: { firstName: true, lastName: true } },
    },
  });
}
