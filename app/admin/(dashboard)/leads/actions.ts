"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, CrmCallOutcome, CrmTaskType } from "@/generated/prisma/enums";
import {
  assertPermission,
  hasPermission,
  permissionsForRole,
  scopedLeadWhere,
  type Permission,
} from "@/lib/auth/permissions";
import {
  requireAdminSession,
  requirePermission,
  type AdminSessionContext,
} from "@/lib/auth/require-admin";
import { recordCrmActivity } from "@/lib/crm/activity";
import {
  MAX_FILTERED_LEAD_ASSIGNMENT_SIZE,
  parseBulkLeadAssignmentInput,
} from "@/lib/crm/lead-assignment";
import { leadListWhere } from "@/lib/crm/lead-list-filters";
import { setLeadOwnersBulk } from "@/lib/crm/lead-ownership";
import { CrmActivityType } from "@/generated/prisma/enums";
import {
  createManualLead,
  validateManualLeadIntake,
  type ManualLeadIntakeFieldErrors,
  type ManualLeadIntakeValues,
} from "@/lib/crm/create-manual-lead";
import {
  assignLeadOwner,
  changeLeadStage,
} from "@/lib/crm/leads";
import {
  evaluateTerminalConfirmation,
  type TerminalStageStatus,
} from "@/lib/crm/stage-transition";
import { cancelCrmTask, completeCrmTask, createCrmTask } from "@/lib/crm/tasks";
import { logCrmCall } from "@/lib/crm/calls";
import { prisma } from "@/lib/prisma";
import { jalaliTehranLocalToUtc, parseJalaliDateInput } from "@/lib/datetime/jalali";

async function requireOrg() {
  return requireAdminSession();
}

async function requireLeadAccess(
  session: AdminSessionContext,
  leadId: string,
  permission: Permission,
) {
  assertPermission(session, permission);
  const lead = await prisma.lead.findFirst({
    where: { ...scopedLeadWhere(session), id: leadId },
    select: { id: true, branchId: true, pipelineId: true },
  });
  if (!lead) throw new Error("FORBIDDEN");
  return lead;
}

async function requireTaskAccess(session: AdminSessionContext, taskId: string) {
  assertPermission(session, "crm.complete_task");
  const task = await prisma.crmTask.findFirst({
    where: {
      id: taskId,
      organizationId: session.organization.id,
      deletedAt: null,
      lead: scopedLeadWhere(session),
    },
    select: { id: true },
  });
  if (!task) throw new Error("FORBIDDEN");
}

export type CreateLeadState = {
  status?: "created" | "duplicate" | "error";
  fieldErrors?: ManualLeadIntakeFieldErrors;
  formError?: string;
  values?: ManualLeadIntakeValues;
  leadId?: string;
  duplicateLeadId?: string;
  taskId?: string | null;
  created?: boolean;
};

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readDefaultTrueBoolean(formData: FormData, key: string): boolean {
  const values = formData.getAll(key);
  if (values.length === 0) return true;
  return values.some((value) => {
    const normalized = String(value).trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "on";
  });
}

export async function createLeadAction(
  _previousState: CreateLeadState,
  formData: FormData,
): Promise<CreateLeadState> {
  const session = await requirePermission("crm.create_lead");
  const requestedOwnerUserId = readFormString(formData, "ownerUserId");
  if (requestedOwnerUserId.trim() && !hasPermission(session, "crm.assign")) {
    return {
      status: "error",
      fieldErrors: { ownerUserId: "اجازه تخصیص مسئول را ندارید." },
    };
  }
  const validation = validateManualLeadIntake({
    firstName: readFormString(formData, "firstName"),
    lastName: readFormString(formData, "lastName"),
    mobile: readFormString(formData, "mobile"),
    branchId: readFormString(formData, "branchId"),
    source: readFormString(formData, "source"),
    ownerUserId: requestedOwnerUserId,
    notes: readFormString(formData, "notes"),
    createFollowUpTask: readDefaultTrueBoolean(
      formData,
      "createFollowUpTask",
    ),
    followUpDueAt: readFormString(formData, "followUpDueAt"),
    idempotencyKey: readFormString(formData, "idempotencyKey"),
  });

  if (!validation.ok) {
    return {
      status: "error",
      fieldErrors: validation.fieldErrors,
      values: validation.values,
    };
  }

  try {
    const result = await createManualLead({
      actor: {
        organizationId: session.organization.id,
        membershipId: session.membership.id,
        userId: session.user.id,
        isPlatformAdmin: session.user.isPlatformAdmin,
      },
      input: validation.data,
    });

    if (result.status === "invalid") {
      return {
        status: "error",
        fieldErrors: result.fieldErrors,
        values: validation.values,
      };
    }
    if (result.status === "duplicate") {
      return {
        status: "duplicate",
        duplicateLeadId: result.leadId,
        values: validation.values,
      };
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin/crm");
    revalidatePath("/admin/workspace");
    revalidatePath(`/admin/leads/${result.leadId}`);

    return {
      status: "created",
      leadId: result.leadId,
      taskId: result.taskId,
      created: result.created,
      values: validation.values,
    };
  } catch {
    return {
      status: "error",
      formError: "ثبت لید ممکن نشد. دوباره تلاش کنید.",
      values: validation.values,
    };
  }
}

export type ChangeLeadStageActionResult =
  | {
      ok: true;
      changed: boolean;
      stageId: string;
      terminalStatus: TerminalStageStatus | null;
      message: string;
    }
  | {
      ok: false;
      requiresConfirmation: true;
      terminalStatus: TerminalStageStatus;
    }
  | {
      ok: false;
      requiresConfirmation?: false;
      error: string;
    };

export async function changeLeadStageAction(
  formData: FormData,
): Promise<ChangeLeadStageActionResult> {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "").trim();
  const stageId = String(formData.get("stageId") ?? "").trim();
  const lostReason = String(formData.get("lostReason") ?? "").trim() || null;
  const terminalConfirmed =
    String(formData.get("terminalConfirmed") ?? "") === "true";

  if (!leadId || !stageId) {
    return {
      ok: false,
      error: "لید و مرحله مقصد باید مشخص باشند.",
    };
  }

  try {
    const lead = await requireLeadAccess(session, leadId, "crm.change_stage");
    const stage = await prisma.crmPipelineStage.findFirst({
      where: {
        id: stageId,
        organizationId: session.organization.id,
        deletedAt: null,
        ...(lead.pipelineId ? { pipelineId: lead.pipelineId } : {}),
      },
      select: {
        id: true,
        isTerminal: true,
        stageType: true,
      },
    });
    if (!stage) {
      return { ok: false, error: "مرحله انتخاب‌شده معتبر نیست." };
    }

    const confirmation = evaluateTerminalConfirmation(stage, terminalConfirmed);
    if (!confirmation.ok) {
      if (confirmation.requiresConfirmation) {
        if (!hasPermission(session, "crm.mark_won_lost")) {
          return {
            ok: false,
            error: "اجازه تغییر به وضعیت پایانی را ندارید.",
          };
        }
        return confirmation;
      }
      return { ok: false, error: confirmation.error };
    }

    if (confirmation.terminalStatus && !hasPermission(session, "crm.mark_won_lost")) {
      return {
        ok: false,
        error: "اجازه تغییر به وضعیت پایانی را ندارید.",
      };
    }

    const changed = await changeLeadStage({
      organizationId: session.organization.id,
      leadId,
      stageId,
      actorUserId: session.user.id,
      lostReason,
    });
    if (!changed.ok) {
      return { ok: false, error: changed.error };
    }

    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/crm");

    return {
      ok: true,
      changed: changed.changed,
      stageId,
      terminalStatus: confirmation.terminalStatus,
      message: changed.changed
        ? "وضعیت مخاطب با موفقیت تغییر کرد."
        : "مخاطب از قبل در همین وضعیت قرار داشت.",
    };
  } catch (error) {
    console.error("CRM lead stage transition failed", {
      error,
      actorUserId: session.user.id,
      organizationId: session.organization.id,
      leadId,
      stageId,
    });
    return {
      ok: false,
      error: "تغییر وضعیت انجام نشد. لطفاً دوباره تلاش کنید.",
    };
  }
}

export async function assignLeadOwnerAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const ownerUserIdRaw = String(formData.get("ownerUserId") ?? "");
  const ownerUserId = ownerUserIdRaw.trim() || null;
  if (!leadId) return;
  const accessibleLead = await requireLeadAccess(session, leadId, "crm.assign");
  if (ownerUserId) {
    const owner = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: session.organization.id,
        userId: ownerUserId,
        status: "ACTIVE",
        deletedAt: null,
        user: { status: "ACTIVE", deletedAt: null },
        OR: [
          { branchMemberships: { none: { deletedAt: null } } },
          { branchMemberships: { some: { branchId: accessibleLead.branchId, deletedAt: null } } },
        ],
      },
      select: { id: true, role: true },
    });
    if (!owner) throw new Error("INVALID_BRANCH_ASSIGNEE");
    if (!permissionsForRole(owner.role).has("crm.view_assigned")) {
      throw new Error("INVALID_LEAD_ASSIGNEE");
    }
  }

  const assigned = await assignLeadOwner({
    organizationId: session.organization.id,
    leadId,
    ownerUserId,
    actorUserId: session.user.id,
  });
  if (!assigned.ok) throw new Error("LEAD_ASSIGNMENT_FAILED");

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/workspace");
  revalidatePath("/admin");
}

export type BulkAssignLeadOwnerResult =
  | { ok: true; updatedCount: number; message: string }
  | { ok: false; error: string };

export async function bulkAssignLeadOwnerAction(
  input: unknown,
): Promise<BulkAssignLeadOwnerResult> {
  const session = await requirePermission("crm.assign");
  const parsed = parseBulkLeadAssignmentInput(input);
  if (!parsed.ok) return parsed;
  const { ownerUserId } = parsed;
  let leadIds: string[];
  if (parsed.selection.mode === "explicit") {
    leadIds = parsed.selection.leadIds;
  } else {
    const filteredLeads = await prisma.lead.findMany({
      where: {
        ...leadListWhere(session, parsed.selection.filters),
        ...(parsed.selection.excludedLeadIds.length
          ? { id: { notIn: parsed.selection.excludedLeadIds } }
          : {}),
      },
      orderBy: { id: "asc" },
      take: MAX_FILTERED_LEAD_ASSIGNMENT_SIZE + 1,
      select: { id: true },
    });
    if (filteredLeads.length > MAX_FILTERED_LEAD_ASSIGNMENT_SIZE) {
      return {
        ok: false,
        error: `تعداد نتایج فیلتر بیش از ${MAX_FILTERED_LEAD_ASSIGNMENT_SIZE} لید است. فیلتر را محدودتر کنید.`,
      };
    }
    leadIds = filteredLeads.map((lead) => lead.id);
    if (leadIds.length === 0) {
      return { ok: false, error: "لیدی مطابق فیلتر برای تخصیص وجود ندارد." };
    }
  }

  const transactionScope =
    parsed.selection.mode === "filtered"
      ? leadListWhere(session, parsed.selection.filters)
      : scopedLeadWhere(session);
  const transactionResult = await prisma.$transaction(async (tx) => {
    const leads = await tx.lead.findMany({
      where: {
        ...transactionScope,
        id: { in: leadIds },
      },
      select: { id: true, branchId: true, ownerUserId: true },
    });
    if (leads.length !== leadIds.length) {
      return {
        ok: false as const,
        error: "یک یا چند لید انتخاب‌شده خارج از محدوده دسترسی شما است.",
      };
    }

    const assigned = await setLeadOwnersBulk({
      organizationId: session.organization.id,
      leads,
      ownerUserId,
      actorUserId: session.user.id,
      source: "BULK",
      tx,
    });
    if (!assigned.ok) {
      return assigned;
    }
    const changedLeadIds = new Set(assigned.changedLeadIds);
    const changedLeads = leads.filter((lead) => changedLeadIds.has(lead.id));
    return { ok: true as const, changedLeads };
  }).catch((error: unknown) => {
    console.error("Bulk lead assignment failed", {
      error,
      actorUserId: session.user.id,
      organizationId: session.organization.id,
      leadCount: leadIds.length,
    });
    return {
      ok: false as const,
      error: "تخصیص گروهی انجام نشد. دوباره تلاش کنید.",
    };
  });
  if (!transactionResult.ok) {
    return transactionResult;
  }
  const { changedLeads } = transactionResult;

  revalidatePath("/admin/leads");
  revalidatePath("/admin/crm");
  revalidatePath("/admin/workspace");
  revalidatePath("/admin");

  return {
    ok: true,
    updatedCount: changedLeads.length,
    message:
      changedLeads.length > 0
        ? `${changedLeads.length} لید با موفقیت به‌روزرسانی شد.`
        : "مسئول لیدهای انتخاب‌شده تغییری نکرد.",
  };
}

export async function assignLeadTaskAction(formData: FormData) {
  const session = await requireOrg();
  assertPermission(session, "crm.assign");
  const leadId = String(formData.get("leadId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const assignedToUserId = String(formData.get("assignedToUserId") ?? "").trim() || null;
  const lead = await requireLeadAccess(session, leadId, "crm.assign");
  const task = await prisma.crmTask.findFirst({
    where: { id: taskId, leadId, organizationId: session.organization.id, deletedAt: null },
    select: { id: true },
  });
  if (!task) throw new Error("TASK_NOT_FOUND");
  if (assignedToUserId) {
    const member = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: session.organization.id,
        userId: assignedToUserId,
        status: "ACTIVE",
        deletedAt: null,
        OR: [
          { branchMemberships: { none: { deletedAt: null } } },
          { branchMemberships: { some: { branchId: lead.branchId, deletedAt: null } } },
        ],
      },
      select: { id: true },
    });
    if (!member) throw new Error("INVALID_BRANCH_ASSIGNEE");
  }
  await prisma.crmTask.update({ where: { id: task.id }, data: { assignedToUserId } });
  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.CRM_TASK_ASSIGNED,
      entityType: "CrmTask",
      entityId: task.id,
      metadata: { assigned: Boolean(assignedToUserId) },
    },
  });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function assignLeadBranchAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const lead = await prisma.lead.findFirst({
    where: { ...scopedLeadWhere(session), id: leadId },
    select: { id: true, ownerUserId: true },
  });
  assertPermission(session, "crm.assign");
  if (!lead) throw new Error("FORBIDDEN");
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      organizationId: session.organization.id,
      isActive: true,
      deletedAt: null,
      ...(session.membership.allBranches ? {} : { id: { in: session.membership.branchIds } }),
    },
    select: { id: true },
  });
  if (!branch) throw new Error("INVALID_BRANCH");
  if (lead.ownerUserId) {
    const owner = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: session.organization.id,
        userId: lead.ownerUserId,
        status: "ACTIVE",
        deletedAt: null,
        OR: [
          { branchMemberships: { none: { deletedAt: null } } },
          { branchMemberships: { some: { branchId, deletedAt: null } } },
        ],
      },
      select: { id: true },
    });
    if (!owner) throw new Error("OWNER_OUTSIDE_BRANCH");
  }
  await prisma.lead.update({ where: { id: lead.id }, data: { branchId } });
  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      branchId,
      actorUserId: session.user.id,
      action: AuditAction.CRM_BRANCH_ASSIGNED,
      entityType: "Lead",
      entityId: lead.id,
    },
  });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/crm");
}

export async function createLeadTaskAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const taskType = String(formData.get("taskType") ?? "FOLLOW_UP");
  const dueMinutes = Number(formData.get("dueMinutes") ?? 60);
  if (!leadId || !title) return;
  await requireLeadAccess(session, leadId, "crm.create_task");

  await createCrmTask({
    organizationId: session.organization.id,
    leadId,
    title,
    taskType:
      (Object.values(CrmTaskType) as string[]).includes(taskType)
        ? taskType
        : "FOLLOW_UP",
    dueMinutes: Number.isFinite(dueMinutes) && dueMinutes > 0 ? dueMinutes : 60,
    createdByUserId: session.user.id,
    assignedToUserId: session.user.id,
  });

  revalidatePath(`/admin/leads/${leadId}`);
}

export async function completeLeadTaskAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  await requireTaskAccess(session, taskId);
  const completed = await completeCrmTask({
    organizationId: session.organization.id,
    taskId,
    actorUserId: session.user.id,
  });
  if (completed.ok) {
    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        action: AuditAction.CRM_TASK_COMPLETED,
        entityType: "CrmTask",
        entityId: taskId,
      },
    });
  }
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function cancelLeadTaskAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  await requireTaskAccess(session, taskId);
  await cancelCrmTask({
    organizationId: session.organization.id,
    taskId,
    actorUserId: session.user.id,
  });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function addLeadNoteAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!leadId || !note) return;
  await requireLeadAccess(session, leadId, "crm.add_note");

  await recordCrmActivity({
    organizationId: session.organization.id,
    leadId,
    activityType: CrmActivityType.NOTE_ADDED,
    title: "یادداشت",
    summary: note.slice(0, 500),
    actorUserId: session.user.id,
  });

  revalidatePath(`/admin/leads/${leadId}`);
}

export async function logLeadCallAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  await requireLeadAccess(session, leadId, "crm.call");
  const rawOutcome = String(formData.get("outcome") ?? "");
  if (!(Object.values(CrmCallOutcome) as string[]).includes(rawOutcome)) {
    throw new Error("INVALID_CALL_OUTCOME");
  }
  const stageId = String(formData.get("stageId") ?? "").trim() || null;
  if (stageId) assertPermission(session, "crm.change_stage");
  const nextDateRaw = String(formData.get("nextFollowUpDate") ?? "").trim();
  const nextTimeRaw = String(formData.get("nextFollowUpTime") ?? "").trim();
  const nextDate = nextDateRaw ? parseJalaliDateInput(nextDateRaw) : null;
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(nextTimeRaw || "09:00");
  if (nextDateRaw && (!nextDate || !timeMatch)) throw new Error("INVALID_FOLLOW_UP");
  const nextFollowUpAt = nextDate && timeMatch
    ? jalaliTehranLocalToUtc(nextDate.jy, nextDate.jm, nextDate.jd, Number(timeMatch[1]), Number(timeMatch[2]))
    : null;
  const duration = Number(formData.get("durationSeconds") ?? "");
  await logCrmCall({
    organizationId: session.organization.id,
    leadId,
    membershipId: session.membership.id,
    actorUserId: session.user.id,
    outcome: rawOutcome as CrmCallOutcome,
    note: String(formData.get("note") ?? ""),
    durationSeconds: Number.isFinite(duration) ? duration : null,
    nextFollowUpAt,
    createTask: String(formData.get("createTask") ?? "") === "true",
    stageId,
    allowTerminalTransition: hasTerminalPermission(session),
    terminalConfirmed: String(formData.get("terminalConfirmed") ?? "") === "true",
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/workspace");
  revalidatePath("/admin/reports/staff-performance");
}

function hasTerminalPermission(session: AdminSessionContext): boolean {
  try {
    assertPermission(session, "crm.mark_won_lost");
    return true;
  } catch {
    return false;
  }
}
