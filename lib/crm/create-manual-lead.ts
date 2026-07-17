/**
 * Transactional manual/quick lead intake.
 *
 * This path intentionally does not use upsertLead: an existing mobile must be
 * reported as a duplicate without changing that lead's stage, owner, or source.
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  AuditAction,
  CrmActivityType,
  CrmTaskPriority,
  CrmTaskStatus,
  CrmTaskType,
  LeadSourceType,
  LeadStatus,
} from "@/generated/prisma/enums";
import { permissionsForRole } from "@/lib/auth/permissions";
import { recordCrmActivity } from "@/lib/crm/activity";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { toLatinDigits } from "@/lib/forms/latin-digits";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

const DEFAULT_SOURCE = "MANUAL";
const DEFAULT_FOLLOW_UP_MS = 24 * 60 * 60 * 1000;
const MAX_FOLLOW_UP_MS = 366 * 24 * 60 * 60 * 1000;
const INTAKE_IDEMPOTENCY_METADATA_KEY = "manualIntakeIdempotencyKey";
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export type ManualLeadIntakeValues = {
  firstName: string;
  lastName: string;
  mobile: string;
  branchId: string;
  source: string;
  ownerUserId: string;
  notes: string;
  createFollowUpTask: boolean;
  followUpDueAt: string;
  idempotencyKey: string;
};

export type ManualLeadIntakeFieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "mobile"
    | "branchId"
    | "source"
    | "ownerUserId"
    | "notes"
    | "followUpDueAt"
    | "idempotencyKey",
    string
  >
>;

export type ValidatedManualLeadIntake = {
  firstName: string;
  lastName: string;
  mobile: string;
  mobileRaw: string;
  branchId: string;
  source: string;
  ownerUserId: string | null;
  notes: string | null;
  createFollowUpTask: boolean;
  followUpDueAt: Date | null;
  idempotencyKey: string;
};

export type ManualLeadIntakeValidationResult =
  | {
      ok: true;
      values: ManualLeadIntakeValues;
      data: ValidatedManualLeadIntake;
    }
  | {
      ok: false;
      values: ManualLeadIntakeValues;
      fieldErrors: ManualLeadIntakeFieldErrors;
    };

export type CreateManualLeadResult =
  | {
      status: "created";
      created: boolean;
      leadId: string;
      taskId: string | null;
    }
  | {
      status: "duplicate";
      leadId?: string;
    }
  | {
      status: "invalid";
      fieldErrors: ManualLeadIntakeFieldErrors;
    };

export type ManualLeadActor = {
  organizationId: string;
  membershipId: string;
  userId: string;
  isPlatformAdmin: boolean;
};

type ManualLeadBranchAccess = {
  branchIds: readonly string[];
  allBranches: boolean;
};

function sanitizeSingleLine(value: string): string {
  return value
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeNotes(value: string): string {
  return value
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim();
}

function canAccessBranch(
  access: ManualLeadBranchAccess,
  branchId: string,
): boolean {
  return access.allBranches || access.branchIds.includes(branchId);
}

function duplicateResult(
  access: ManualLeadBranchAccess,
  duplicate: { id: string; branchId: string; deletedAt: Date | null },
): CreateManualLeadResult {
  return duplicate.deletedAt === null && canAccessBranch(access, duplicate.branchId)
    ? { status: "duplicate", leadId: duplicate.id }
    : { status: "duplicate" };
}

export function validateManualLeadIntake(
  raw: ManualLeadIntakeValues,
  now = new Date(),
): ManualLeadIntakeValidationResult {
  const values: ManualLeadIntakeValues = {
    firstName: sanitizeSingleLine(raw.firstName),
    lastName: sanitizeSingleLine(raw.lastName),
    mobile: raw.mobile.trim(),
    branchId: raw.branchId.trim(),
    source: sanitizeSingleLine(raw.source) || DEFAULT_SOURCE,
    ownerUserId: raw.ownerUserId.trim(),
    notes: sanitizeNotes(raw.notes),
    createFollowUpTask: raw.createFollowUpTask,
    followUpDueAt: toLatinDigits(raw.followUpDueAt.trim()),
    idempotencyKey: raw.idempotencyKey.trim(),
  };
  const fieldErrors: ManualLeadIntakeFieldErrors = {};

  if (!values.firstName) {
    fieldErrors.firstName = "نام الزامی است.";
  } else if (values.firstName.length > 100) {
    fieldErrors.firstName = "نام نباید بیشتر از ۱۰۰ کاراکتر باشد.";
  }
  if (!values.lastName) {
    fieldErrors.lastName = "نام خانوادگی الزامی است.";
  } else if (values.lastName.length > 100) {
    fieldErrors.lastName = "نام خانوادگی نباید بیشتر از ۱۰۰ کاراکتر باشد.";
  }

  const latinMobile = toLatinDigits(values.mobile);
  if (values.mobile.length > 32) {
    fieldErrors.mobile = "شماره موبایل بیش از حد طولانی است.";
  } else if (!/^[\d+\s()\-]+$/.test(latinMobile)) {
    fieldErrors.mobile = "شماره موبایل شامل نویسه نامعتبر است.";
  }
  const mobile = normalizeIranianMobile(values.mobile);
  if (!fieldErrors.mobile && !mobile.ok) {
    fieldErrors.mobile = mobile.error;
  }

  if (!values.branchId) {
    fieldErrors.branchId = "شعبه الزامی است.";
  } else if (values.branchId.length > 64) {
    fieldErrors.branchId = "شناسه شعبه نامعتبر است.";
  }
  if (values.source.length > 100) {
    fieldErrors.source = "منبع نباید بیشتر از ۱۰۰ کاراکتر باشد.";
  }
  if (values.ownerUserId.length > 64) {
    fieldErrors.ownerUserId = "شناسه مسئول نامعتبر است.";
  }
  if (values.notes.length > 1000) {
    fieldErrors.notes = "یادداشت نباید بیشتر از ۱۰۰۰ کاراکتر باشد.";
  }
  if (
    !values.idempotencyKey ||
    values.idempotencyKey.length > 128 ||
    !/^[A-Za-z0-9:_-]+$/.test(values.idempotencyKey)
  ) {
    fieldErrors.idempotencyKey = "کلید یکتایی درخواست نامعتبر است.";
  }

  let followUpDueAt: Date | null = null;
  if (values.createFollowUpTask) {
    if (values.followUpDueAt) {
      const parsed = new Date(values.followUpDueAt);
      if (
        !ISO_TIMESTAMP_PATTERN.test(values.followUpDueAt) ||
        Number.isNaN(parsed.getTime())
      ) {
        fieldErrors.followUpDueAt = "زمان پیگیری نامعتبر است.";
      } else if (parsed.getTime() <= now.getTime()) {
        fieldErrors.followUpDueAt = "زمان پیگیری باید در آینده باشد.";
      } else if (parsed.getTime() - now.getTime() > MAX_FOLLOW_UP_MS) {
        fieldErrors.followUpDueAt = "زمان پیگیری نباید بیش از یک سال آینده باشد.";
      } else {
        followUpDueAt = parsed;
      }
    } else {
      followUpDueAt = new Date(now.getTime() + DEFAULT_FOLLOW_UP_MS);
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !mobile.ok) {
    return { ok: false, values, fieldErrors };
  }

  return {
    ok: true,
    values,
    data: {
      firstName: values.firstName,
      lastName: values.lastName,
      mobile: mobile.normalized,
      mobileRaw: mobile.raw,
      branchId: values.branchId,
      source: values.source,
      ownerUserId: values.ownerUserId || null,
      notes: values.notes || null,
      createFollowUpTask: values.createFollowUpTask,
      followUpDueAt,
      idempotencyKey: values.idempotencyKey,
    },
  };
}

async function lockManualIntakeKeys(
  tx: Prisma.TransactionClient,
  keys: readonly string[],
): Promise<void> {
  for (const key of [...keys].sort()) {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${key}))
    `;
  }
}

async function findDuplicate(
  tx: Prisma.TransactionClient,
  organizationId: string,
  normalizedMobile: string,
): Promise<{ id: string; branchId: string; deletedAt: Date | null } | null> {
  return tx.lead.findFirst({
    where: { organizationId, normalizedMobile },
    orderBy: { createdAt: "asc" },
    select: { id: true, branchId: true, deletedAt: true },
  });
}

export async function createManualLead(params: {
  actor: ManualLeadActor;
  input: ValidatedManualLeadIntake;
}): Promise<CreateManualLeadResult> {
  const { actor, input } = params;

  const pipeline = await ensureDefaultPipeline(actor.organizationId);
  const occurredAt = new Date();
  const phoneLockKey = `manual-lead:phone:${actor.organizationId}:${input.mobile}`;
  const requestLockKey = `manual-lead:request:${actor.organizationId}:${input.idempotencyKey}`;

  return prisma.$transaction(async (tx) => {
    await lockManualIntakeKeys(tx, [phoneLockKey, requestLockKey]);

    const membership = await tx.organizationMembership.findFirst({
      where: {
        id: actor.membershipId,
        organizationId: actor.organizationId,
        userId: actor.userId,
        status: "ACTIVE",
        deletedAt: null,
        organization: { isActive: true, deletedAt: null },
        user: { status: "ACTIVE", deletedAt: null },
      },
      select: {
        role: true,
        branchMemberships: {
          where: { deletedAt: null },
          select: { branchId: true },
        },
      },
    });
    if (!membership) throw new Error("MANUAL_LEAD_ACTOR_INVALID");
    if (
      !actor.isPlatformAdmin &&
      !permissionsForRole(membership.role).has("crm.create_lead")
    ) {
      throw new Error("MANUAL_LEAD_FORBIDDEN");
    }
    if (
      input.ownerUserId &&
      !actor.isPlatformAdmin &&
      !permissionsForRole(membership.role).has("crm.assign")
    ) {
      return {
        status: "invalid",
        fieldErrors: { ownerUserId: "اجازه تخصیص مسئول را ندارید." },
      };
    }

    const currentBranchIds = membership.branchMemberships.map((scope) => scope.branchId);
    const actorHasAllBranches = currentBranchIds.length === 0;
    const branchAccess: ManualLeadBranchAccess = {
      branchIds: currentBranchIds,
      allBranches: actorHasAllBranches,
    };
    const branch = await tx.branch.findFirst({
      where: {
        id: input.branchId,
        organizationId: actor.organizationId,
        isActive: true,
        deletedAt: null,
        ...(actorHasAllBranches ? {} : { id: { in: currentBranchIds } }),
      },
      select: { id: true },
    });
    if (!branch) {
      return {
        status: "invalid",
        fieldErrors: { branchId: "شعبه انتخاب‌شده در دسترس نیست." },
      };
    }

    if (input.ownerUserId) {
      const owner = await tx.organizationMembership.findFirst({
        where: {
          organizationId: actor.organizationId,
          userId: input.ownerUserId,
          status: "ACTIVE",
          deletedAt: null,
          user: { status: "ACTIVE", deletedAt: null },
          OR: [
            { branchMemberships: { none: { deletedAt: null } } },
            {
              branchMemberships: {
                some: { branchId: input.branchId, deletedAt: null },
              },
            },
          ],
        },
        select: { id: true, role: true },
      });
      if (
        !owner ||
        !permissionsForRole(owner.role).has("crm.view_assigned")
      ) {
        return {
          status: "invalid",
          fieldErrors: {
            ownerUserId: "مسئول انتخاب‌شده برای این سازمان و شعبه معتبر نیست.",
          },
        };
      }
    }

    const replay = await tx.lead.findFirst({
      where: {
        organizationId: actor.organizationId,
        metadata: {
          path: [INTAKE_IDEMPOTENCY_METADATA_KEY],
          equals: input.idempotencyKey,
        },
      },
      select: { id: true, branchId: true, deletedAt: true },
    });
    if (replay) {
      if (
        replay.deletedAt !== null ||
        !canAccessBranch(branchAccess, replay.branchId)
      ) {
        return { status: "duplicate" };
      }
      const task = await tx.crmTask.findFirst({
        where: {
          organizationId: actor.organizationId,
          idempotencyKey: `manual-lead-follow-up:${input.idempotencyKey}`,
        },
        select: { id: true },
      });
      return {
        status: "created",
        created: false,
        leadId: replay.id,
        taskId: task?.id ?? null,
      };
    }

    const duplicateAfterLock = await findDuplicate(
      tx,
      actor.organizationId,
      input.mobile,
    );
    if (duplicateAfterLock) {
      return duplicateResult(branchAccess, duplicateAfterLock);
    }

    const lead = await tx.lead.create({
      data: {
        organizationId: actor.organizationId,
        branchId: input.branchId,
        status: LeadStatus.NEW,
        firstName: input.firstName,
        lastName: input.lastName,
        mobile: input.mobile,
        mobileRaw: input.mobileRaw,
        normalizedMobile: input.mobile,
        description: input.notes,
        source: input.source,
        sourceType: LeadSourceType.MANUAL,
        pipelineId: pipeline.pipelineId,
        stageId: pipeline.newStageId,
        ownerUserId: input.ownerUserId,
        nextFollowUpAt: input.createFollowUpTask ? input.followUpDueAt : null,
        metadata: {
          [INTAKE_IDEMPOTENCY_METADATA_KEY]: input.idempotencyKey,
        },
      },
      select: { id: true },
    });

    let taskId: string | null = null;
    if (input.createFollowUpTask && input.followUpDueAt) {
      const actorCanOwnTask =
        actor.isPlatformAdmin ||
        permissionsForRole(membership.role).has("crm.create_task");
      const task = await tx.crmTask.create({
        data: {
          organizationId: actor.organizationId,
          leadId: lead.id,
          assignedToUserId:
            input.ownerUserId ?? (actorCanOwnTask ? actor.userId : null),
          createdByUserId: actor.userId,
          title: "پیگیری لید جدید",
          taskType: CrmTaskType.FOLLOW_UP,
          priority: CrmTaskPriority.NORMAL,
          status: CrmTaskStatus.OPEN,
          dueAt: input.followUpDueAt,
          idempotencyKey: `manual-lead-follow-up:${input.idempotencyKey}`,
        },
        select: { id: true },
      });
      taskId = task.id;

      await recordCrmActivity({
        organizationId: actor.organizationId,
        leadId: lead.id,
        activityType: CrmActivityType.TASK_CREATED,
        title: "وظیفه ایجاد شد",
        summary: "پیگیری لید جدید",
        actorUserId: actor.userId,
        relatedTaskId: task.id,
        occurredAt,
        tx,
      });
    }

    await recordCrmActivity({
      organizationId: actor.organizationId,
      leadId: lead.id,
      activityType: CrmActivityType.LEAD_CREATED,
      title: "لید به‌صورت دستی ایجاد شد",
      summary: input.source,
      actorUserId: actor.userId,
      metadata: {
        sourceType: LeadSourceType.MANUAL,
        ownerAssigned: Boolean(input.ownerUserId),
        followUpTaskCreated: Boolean(taskId),
      },
      occurredAt,
      tx,
    });
    if (input.ownerUserId) {
      await recordCrmActivity({
        organizationId: actor.organizationId,
        leadId: lead.id,
        activityType: CrmActivityType.OWNER_ASSIGNED,
        title: "تخصیص مسئول",
        actorUserId: actor.userId,
        metadata: {
          previousOwnerUserId: null,
          ownerUserId: input.ownerUserId,
          source: "MANUAL",
        },
        occurredAt,
        tx,
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        branchId: input.branchId,
        actorUserId: actor.userId,
        action: AuditAction.CRM_LEAD_CREATED,
        entityType: "Lead",
        entityId: lead.id,
        metadata: {
          sourceType: LeadSourceType.MANUAL,
          ownerAssigned: Boolean(input.ownerUserId),
          ownerUserId: input.ownerUserId,
          followUpTaskCreated: Boolean(taskId),
        },
      },
    });
    if (input.ownerUserId) {
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          branchId: input.branchId,
          actorUserId: actor.userId,
          action: AuditAction.CRM_LEAD_ASSIGNED,
          entityType: "Lead",
          entityId: lead.id,
          metadata: {
            previousOwnerUserId: null,
            ownerUserId: input.ownerUserId,
            source: "MANUAL",
          },
        },
      });
    }

    return {
      status: "created",
      created: true,
      leadId: lead.id,
      taskId,
    };
  });
}
