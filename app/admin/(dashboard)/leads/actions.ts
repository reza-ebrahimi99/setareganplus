"use server";

import { revalidatePath } from "next/cache";
import { AuditAction, CrmCallOutcome, CrmTaskType } from "@/generated/prisma/enums";
import { assertPermission, scopedLeadWhere, type Permission } from "@/lib/auth/permissions";
import { requireAdminSession, type AdminSessionContext } from "@/lib/auth/require-admin";
import { recordCrmActivity } from "@/lib/crm/activity";
import { CrmActivityType } from "@/generated/prisma/enums";
import {
  assignLeadOwner,
  changeLeadStage,
} from "@/lib/crm/leads";
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
    select: { id: true, branchId: true },
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

export async function changeLeadStageAction(formData: FormData) {
  const session = await requireOrg();
  const leadId = String(formData.get("leadId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const lostReason = String(formData.get("lostReason") ?? "").trim() || null;
  if (!leadId || !stageId) return;
  await requireLeadAccess(session, leadId, "crm.change_stage");
  const stage = await prisma.crmPipelineStage.findFirst({
    where: { id: stageId, organizationId: session.organization.id, deletedAt: null },
    select: { isTerminal: true },
  });
  if (stage?.isTerminal) {
    assertPermission(session, "crm.mark_won_lost");
    if (String(formData.get("terminalConfirmed") ?? "") !== "true") {
      throw new Error("TERMINAL_CONFIRMATION_REQUIRED");
    }
  }

  const changed = await changeLeadStage({
    organizationId: session.organization.id,
    leadId,
    stageId,
    actorUserId: session.user.id,
    lostReason,
  });
  if (changed.ok) {
    await prisma.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        action: AuditAction.CRM_STAGE_CHANGED,
        entityType: "Lead",
        entityId: leadId,
        metadata: { terminal: Boolean(stage?.isTerminal) },
      },
    });
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/crm");
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
        OR: [
          { branchMemberships: { none: { deletedAt: null } } },
          { branchMemberships: { some: { branchId: accessibleLead.branchId, deletedAt: null } } },
        ],
      },
      select: { id: true },
    });
    if (!owner) throw new Error("INVALID_BRANCH_ASSIGNEE");
  }

  await assignLeadOwner({
    organizationId: session.organization.id,
    leadId,
    ownerUserId,
    actorUserId: session.user.id,
  });
  await prisma.auditLog.create({
    data: {
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: AuditAction.CRM_LEAD_ASSIGNED,
      entityType: "Lead",
      entityId: leadId,
      metadata: { assigned: Boolean(ownerUserId) },
    },
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/crm");
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
