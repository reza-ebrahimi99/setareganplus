import {
  AuditAction,
  CrmActivityType,
  CrmCallOutcome,
  CrmTaskPriority,
  CrmTaskStatus,
  CrmTaskType,
} from "@/generated/prisma/enums";
import { permissionsForRole } from "@/lib/auth/permissions";
import { stageTypeToLeadStatus } from "@/lib/crm/pipeline";
import { prisma } from "@/lib/prisma";

export type LogCrmCallInput = {
  organizationId: string;
  leadId: string;
  membershipId: string;
  actorUserId: string;
  outcome: CrmCallOutcome;
  note?: string | null;
  durationSeconds?: number | null;
  nextFollowUpAt?: Date | null;
  createTask?: boolean;
  stageId?: string | null;
  allowTerminalTransition: boolean;
  terminalConfirmed: boolean;
  idempotencyKey: string;
};

export async function logCrmCall(input: LogCrmCallInput): Promise<{ id: string; created: boolean }> {
  const key = input.idempotencyKey.trim();
  if (!key) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  const existing = await prisma.crmCallLog.findFirst({
    where: { organizationId: input.organizationId, idempotencyKey: key },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const [lead, membership, stage] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: input.organizationId, deletedAt: null },
      select: {
        id: true,
        branchId: true,
        ownerUserId: true,
        stageId: true,
        pipelineId: true,
      },
    }),
    prisma.organizationMembership.findFirst({
      where: {
        id: input.membershipId,
        organizationId: input.organizationId,
        userId: input.actorUserId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        branchMemberships: {
          where: { deletedAt: null },
          select: { branchId: true },
        },
      },
    }),
    input.stageId
      ? prisma.crmPipelineStage.findFirst({
          where: { id: input.stageId, organizationId: input.organizationId, deletedAt: null, isActive: true },
          select: { id: true, pipelineId: true, name: true, stageType: true, isTerminal: true, isWon: true, isLost: true },
        })
      : null,
  ]);
  if (!lead || !membership) throw new Error("CALL_TARGET_NOT_FOUND");
  const permissions = permissionsForRole(membership.role);
  if (!permissions.has("crm.call")) throw new Error("CALL_FORBIDDEN");
  const branchIds = membership.branchMemberships.map((scope) => scope.branchId);
  if (branchIds.length > 0 && !branchIds.includes(lead.branchId)) {
    throw new Error("CALL_BRANCH_FORBIDDEN");
  }
  if (!permissions.has("crm.view_all") && lead.ownerUserId !== input.actorUserId) {
    throw new Error("CALL_ASSIGNMENT_FORBIDDEN");
  }
  if (input.stageId && !stage) throw new Error("INVALID_STAGE");
  if (stage && lead.pipelineId && stage.pipelineId !== lead.pipelineId) {
    throw new Error("CROSS_PIPELINE_STAGE");
  }
  if (stage && !permissions.has("crm.change_stage")) {
    throw new Error("CALL_STAGE_FORBIDDEN");
  }
  if (
    stage?.isTerminal &&
    (!permissions.has("crm.mark_won_lost") ||
      !input.allowTerminalTransition ||
      !input.terminalConfirmed)
  ) {
    throw new Error("TERMINAL_TRANSITION_FORBIDDEN");
  }

  const note = input.note?.trim().slice(0, 1000) || null;
  const durationSeconds =
    typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
      ? Math.max(0, Math.min(86_400, Math.floor(input.durationSeconds)))
      : null;
  const calledAt = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      let createdTaskId: string | null = null;
      if (input.createTask && input.nextFollowUpAt) {
        const task = await tx.crmTask.upsert({
          where: {
            organizationId_idempotencyKey: {
              organizationId: input.organizationId,
              idempotencyKey: `call-follow-up:${key}`,
            },
          },
          update: {},
          create: {
            organizationId: input.organizationId,
            leadId: input.leadId,
            assignedToUserId: input.actorUserId,
            createdByUserId: input.actorUserId,
            title: "پیگیری تماس",
            taskType: CrmTaskType.FOLLOW_UP,
            priority: CrmTaskPriority.NORMAL,
            status: CrmTaskStatus.OPEN,
            dueAt: input.nextFollowUpAt,
            idempotencyKey: `call-follow-up:${key}`,
          },
          select: { id: true },
        });
        createdTaskId = task.id;
      }

      await tx.lead.update({
        where: { id: input.leadId },
        data: {
          lastContactAt: calledAt,
          nextFollowUpAt: input.nextFollowUpAt ?? undefined,
          ...(stage
            ? {
                stageId: stage.id,
                pipelineId: stage.pipelineId,
                status: stageTypeToLeadStatus(stage.stageType),
                convertedAt: stage.isWon ? calledAt : undefined,
                lostAt: stage.isLost ? calledAt : undefined,
              }
            : {}),
        },
      });

      const call = await tx.crmCallLog.create({
        data: {
          organizationId: input.organizationId,
          leadId: input.leadId,
          membershipId: input.membershipId,
          outcome: input.outcome,
          note,
          durationSeconds,
          calledAt,
          nextFollowUpAt: input.nextFollowUpAt ?? null,
          createdTaskId,
          idempotencyKey: key,
        },
        select: { id: true },
      });

      await tx.crmActivity.create({
        data: {
          organizationId: input.organizationId,
          leadId: input.leadId,
          activityType: CrmActivityType.CALL_LOGGED,
          title: "تماس ثبت شد",
          summary: note,
          actorUserId: input.actorUserId,
          relatedTaskId: createdTaskId,
          occurredAt: calledAt,
          metadata: {
            outcome: input.outcome,
            durationSeconds,
            followUpScheduled: Boolean(input.nextFollowUpAt),
          },
        },
      });
      if (stage && stage.id !== lead.stageId) {
        await tx.crmActivity.create({
          data: {
            organizationId: input.organizationId,
            leadId: input.leadId,
            activityType: stage.isWon
              ? CrmActivityType.CONVERTED
              : stage.isLost
                ? CrmActivityType.LOST
                : CrmActivityType.STAGE_CHANGED,
            title: stage.isWon
              ? "ثبت‌نام نهایی"
              : stage.isLost
                ? "از دست‌رفته"
                : "مرحله لید تغییر کرد",
            summary: stage.name,
            actorUserId: input.actorUserId,
            occurredAt: calledAt,
            metadata: { stageId: stage.id, stageType: stage.stageType },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: AuditAction.CRM_CALL_LOGGED,
          entityType: "CrmCallLog",
          entityId: call.id,
          metadata: { outcome: input.outcome, durationSeconds, createdTask: Boolean(createdTaskId) },
        },
      });
      return { id: call.id, created: true };
    });
  } catch (error) {
    const raced = await prisma.crmCallLog.findFirst({
      where: { organizationId: input.organizationId, idempotencyKey: key },
      select: { id: true },
    });
    if (raced) return { id: raced.id, created: false };
    throw error;
  }
}
