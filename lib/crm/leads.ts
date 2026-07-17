/**
 * Lead upsert / dedupe for forms and bookings.
 *
 * Consistency strategy (forms):
 * - Capacity transaction creates FormSubmission only (kept lean).
 * - After commit: upsertLeadFromFormSubmission (idempotent by sourceFormSubmissionId)
 *   then enqueue FORM_SUBMISSION_RECEIVED for automation worker.
 * - CRM failure is swallowed for the public submit path (lead can be rebuilt by worker).
 *
 * Dedupe keys (deterministic only):
 * 1. sourceFormSubmissionId
 * 2. sourceBookingReservationId
 * 3. organizationId + normalizedMobile (single unambiguous match)
 * Ambiguous multi-mobile matches → do NOT auto-merge.
 */

import {
  AuditAction,
  CrmActivityType,
  LeadScoreBand,
  LeadSourceType,
  LeadStatus,
  ServiceInterest,
} from "@/generated/prisma/enums";
import { recordCrmActivity } from "@/lib/crm/activity";
import {
  assertOwnerInOrg,
  assertStageInOrg,
  ensureDefaultPipeline,
  stageTypeToLeadStatus,
} from "@/lib/crm/pipeline";
import { calculateLeadScore } from "@/lib/crm/scoring";
import { createCrmTask } from "@/lib/crm/tasks";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type LeadIdentityInput = {
  organizationId: string;
  branchId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  mobileRaw?: string;
  fatherName?: string | null;
  school?: string | null;
  gradeLevel?: string | null;
  email?: string | null;
  nationalCode?: string | null;
  source: string;
  sourceType: LeadSourceType;
  sourceFormSubmissionId?: string | null;
  sourceBookingReservationId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  ownerUserId?: string | null;
  serviceInterest?: ServiceInterest;
  applyScoring?: boolean;
  createInitialTask?: boolean;
  initialTaskTitle?: string;
  initialTaskDueMinutes?: number;
};

export type UpsertLeadResult =
  | { ok: true; leadId: string; created: boolean }
  | { ok: false; error: string };

async function findDeterministicLead(params: {
  organizationId: string;
  sourceFormSubmissionId?: string | null;
  sourceBookingReservationId?: string | null;
  normalizedMobile?: string | null;
}): Promise<{ id: string } | null> {
  if (params.sourceFormSubmissionId) {
    const bySub = await prisma.lead.findFirst({
      where: {
        organizationId: params.organizationId,
        sourceFormSubmissionId: params.sourceFormSubmissionId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (bySub) return bySub;
  }
  if (params.sourceBookingReservationId) {
    const byBook = await prisma.lead.findFirst({
      where: {
        organizationId: params.organizationId,
        sourceBookingReservationId: params.sourceBookingReservationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (byBook) return byBook;
  }
  if (params.normalizedMobile) {
    const matches = await prisma.lead.findMany({
      where: {
        organizationId: params.organizationId,
        normalizedMobile: params.normalizedMobile,
        deletedAt: null,
      },
      select: { id: true },
      take: 3,
    });
    if (matches.length === 1) return matches[0]!;
    // Ambiguous: do not auto-merge.
  }
  return null;
}

export async function upsertLead(input: LeadIdentityInput): Promise<UpsertLeadResult> {
  const mobile = normalizeIranianMobile(input.mobile);
  if (!mobile.ok) {
    return { ok: false, error: mobile.error };
  }

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "نام و نام خانوادگی الزامی است." };
  }

  const pipeline = await ensureDefaultPipeline(input.organizationId);
  const pipelineId = input.pipelineId ?? pipeline.pipelineId;
  let stageId = input.stageId ?? pipeline.newStageId;

  const stage = await assertStageInOrg({
    organizationId: input.organizationId,
    stageId,
    pipelineId,
  });
  if (!stage) {
    return { ok: false, error: "مرحله انتخاب‌شده معتبر نیست." };
  }
  stageId = stage.id;

  if (input.ownerUserId) {
    const ok = await assertOwnerInOrg({
      organizationId: input.organizationId,
      userId: input.ownerUserId,
    });
    if (!ok) {
      return { ok: false, error: "مالک انتخاب‌شده در این سازمان نیست." };
    }
  }

  const existing = await findDeterministicLead({
    organizationId: input.organizationId,
    sourceFormSubmissionId: input.sourceFormSubmissionId,
    sourceBookingReservationId: input.sourceBookingReservationId,
    normalizedMobile: mobile.normalized,
  });

  const scoreResult =
    input.applyScoring !== false
      ? calculateLeadScore({
          hasValidMobile: true,
          hasValidEmail: Boolean(input.email?.trim()),
          hasNationalId: Boolean(input.nationalCode?.trim()),
          consultationRequested:
            input.serviceInterest === ServiceInterest.CONSULTATION ||
            input.sourceType === LeadSourceType.BOOKING,
          bookingCreated: input.sourceType === LeadSourceType.BOOKING,
          bookingCompleted: false,
          hasOverdueTask: false,
        })
      : null;

  try {
    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          pipelineId,
          stageId,
          status: stageTypeToLeadStatus(stage.stageType),
          ownerUserId: input.ownerUserId ?? undefined,
          sourceBookingReservationId:
            input.sourceBookingReservationId ?? undefined,
          sourceFormSubmissionId: input.sourceFormSubmissionId ?? undefined,
          ...(scoreResult
            ? {
                score: scoreResult.score,
                scoreBand: scoreResult.band,
                scoreBreakdown: scoreResult.breakdown,
              }
            : {}),
        },
      });
      return { ok: true, leadId: existing.id, created: false };
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: input.organizationId,
        branchId: input.branchId,
        status: stageTypeToLeadStatus(stage.stageType),
        firstName,
        lastName,
        fatherName: input.fatherName?.trim() || null,
        mobile: mobile.normalized,
        mobileRaw: input.mobileRaw?.trim() || mobile.raw,
        normalizedMobile: mobile.normalized,
        school: input.school?.trim() || null,
        gradeLevel: input.gradeLevel?.trim() || null,
        nationalCode: input.nationalCode?.trim() || null,
        serviceInterest: input.serviceInterest ?? ServiceInterest.UNDECIDED,
        source: input.source,
        sourceType: input.sourceType,
        sourceFormSubmissionId: input.sourceFormSubmissionId ?? null,
        sourceBookingReservationId: input.sourceBookingReservationId ?? null,
        pipelineId,
        stageId,
        ownerUserId: input.ownerUserId ?? null,
        score: scoreResult?.score ?? 0,
        scoreBand: scoreResult?.band ?? LeadScoreBand.COLD,
        scoreBreakdown: scoreResult?.breakdown ?? undefined,
      },
      select: { id: true },
    });

    await recordCrmActivity({
      organizationId: input.organizationId,
      leadId: lead.id,
      activityType: CrmActivityType.LEAD_CREATED,
      title: "لید ایجاد شد",
      summary: input.source,
      relatedFormSubmissionId: input.sourceFormSubmissionId,
      relatedBookingReservationId: input.sourceBookingReservationId,
      metadata: scoreResult
        ? { score: scoreResult.score, band: scoreResult.band }
        : null,
    });

    if (input.createInitialTask) {
      await createCrmTask({
        organizationId: input.organizationId,
        leadId: lead.id,
        title: input.initialTaskTitle?.trim() || "تماس اولیه",
        taskType: "CALL",
        dueMinutes: input.initialTaskDueMinutes ?? 60,
        assignedToUserId: input.ownerUserId,
        idempotencyKey: `lead_initial_task:${lead.id}`,
      });
    }

    return { ok: true, leadId: lead.id, created: true };
  } catch {
    return { ok: false, error: "ثبت لید ممکن نشد." };
  }
}

export async function changeLeadStage(params: {
  organizationId: string;
  leadId: string;
  stageId: string;
  actorUserId?: string | null;
  lostReason?: string | null;
}): Promise<
  | { ok: true; changed: boolean; repairedTerminalFields: boolean }
  | { ok: false; error: string }
> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: {
        id: params.leadId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
    });
    if (!lead) return { ok: false as const, error: "لید یافت نشد." };

    const stage = await tx.crmPipelineStage.findFirst({
      where: {
        id: params.stageId,
        organizationId: params.organizationId,
        deletedAt: null,
        ...(lead.pipelineId ? { pipelineId: lead.pipelineId } : {}),
      },
      select: {
        id: true,
        pipelineId: true,
        stageType: true,
        isTerminal: true,
        isWon: true,
        isLost: true,
        name: true,
      },
    });
    if (!stage) return { ok: false as const, error: "مرحله معتبر نیست." };

    const nextStatus = stageTypeToLeadStatus(stage.stageType);
    const transitioned = lead.stageId !== stage.id || lead.status !== nextStatus;
    const now = new Date();
    const nextConvertedAt = stage.isWon ? (lead.convertedAt ?? now) : null;
    const nextLostAt = stage.isLost ? (lead.lostAt ?? now) : null;
    const suppliedLostReason = params.lostReason?.trim() || null;
    const nextLostReason = stage.isLost
      ? suppliedLostReason ?? (lead.stageId === stage.id ? lead.lostReason : null)
      : null;
    const repairedTerminalFields =
      lead.convertedAt?.getTime() !== nextConvertedAt?.getTime() ||
      lead.lostAt?.getTime() !== nextLostAt?.getTime() ||
      lead.lostReason !== nextLostReason;

    if (!transitioned && !repairedTerminalFields) {
      return {
        ok: true as const,
        changed: false,
        repairedTerminalFields: false,
      };
    }

    await tx.lead.update({
      where: {
        organizationId_id: {
          organizationId: params.organizationId,
          id: lead.id,
        },
      },
      data: {
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        status: nextStatus,
        convertedAt: nextConvertedAt,
        lostAt: nextLostAt,
        lostReason: nextLostReason,
      },
    });

    if (transitioned) {
      await recordCrmActivity({
        organizationId: params.organizationId,
        leadId: lead.id,
        activityType: stage.isWon
          ? CrmActivityType.CONVERTED
          : stage.isLost
            ? CrmActivityType.LOST
            : CrmActivityType.STAGE_CHANGED,
        title: stage.isWon
          ? "ثبت‌نام نهایی"
          : stage.isLost
            ? "از دست‌رفته"
            : "تغییر مرحله",
        summary: stage.name,
        actorUserId: params.actorUserId,
        metadata: {
          stageId: stage.id,
          stageType: stage.stageType,
          previousStageId: lead.stageId,
          previousStatus: lead.status,
        },
        tx,
      });
      if (params.actorUserId) {
        await tx.auditLog.create({
          data: {
            organizationId: params.organizationId,
            branchId: lead.branchId,
            actorUserId: params.actorUserId,
            action: AuditAction.CRM_STAGE_CHANGED,
            entityType: "Lead",
            entityId: lead.id,
            metadata: {
              previousStageId: lead.stageId,
              nextStageId: stage.id,
              previousStatus: lead.status,
              nextStatus,
              terminal: stage.isTerminal,
            },
          },
        });
      }
    }

    return {
      ok: true as const,
      changed: transitioned,
      repairedTerminalFields,
    };
  });
}

export async function assignLeadOwner(params: {
  organizationId: string;
  leadId: string;
  ownerUserId: string | null;
  actorUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.ownerUserId) {
    const ok = await assertOwnerInOrg({
      organizationId: params.organizationId,
      userId: params.ownerUserId,
    });
    if (!ok) return { ok: false, error: "کاربر در این سازمان عضو نیست." };
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!lead) return { ok: false, error: "لید یافت نشد." };

  await prisma.lead.update({
    where: { id: lead.id },
    data: { ownerUserId: params.ownerUserId },
  });

  await recordCrmActivity({
    organizationId: params.organizationId,
    leadId: lead.id,
    activityType: CrmActivityType.OWNER_ASSIGNED,
    title: "تخصیص مسئول",
    actorUserId: params.actorUserId,
    metadata: { ownerUserId: params.ownerUserId },
  });

  return { ok: true };
}

/** @deprecated use LeadStatus sync via stage — kept for type imports */
export type { LeadStatus };
