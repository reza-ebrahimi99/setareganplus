"use server";

import { revalidatePath } from "next/cache";
import { CrmTaskType } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { recordCrmActivity } from "@/lib/crm/activity";
import { CrmActivityType } from "@/generated/prisma/enums";
import {
  assignLeadOwner,
  changeLeadStage,
} from "@/lib/crm/leads";
import { cancelCrmTask, completeCrmTask, createCrmTask } from "@/lib/crm/tasks";

async function requireOrg() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}

export async function changeLeadStageAction(formData: FormData) {
  const session = await requireOrg();
  if (!session) return;
  const leadId = String(formData.get("leadId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const lostReason = String(formData.get("lostReason") ?? "").trim() || null;
  if (!leadId || !stageId) return;

  await changeLeadStage({
    organizationId: session.organization.id,
    leadId,
    stageId,
    actorUserId: session.user.id,
    lostReason,
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/crm");
}

export async function assignLeadOwnerAction(formData: FormData) {
  const session = await requireOrg();
  if (!session) return;
  const leadId = String(formData.get("leadId") ?? "");
  const ownerUserIdRaw = String(formData.get("ownerUserId") ?? "");
  const ownerUserId = ownerUserIdRaw.trim() || null;
  if (!leadId) return;

  await assignLeadOwner({
    organizationId: session.organization.id,
    leadId,
    ownerUserId,
    actorUserId: session.user.id,
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/crm");
}

export async function createLeadTaskAction(formData: FormData) {
  const session = await requireOrg();
  if (!session) return;
  const leadId = String(formData.get("leadId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const taskType = String(formData.get("taskType") ?? "FOLLOW_UP");
  const dueMinutes = Number(formData.get("dueMinutes") ?? 60);
  if (!leadId || !title) return;

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
  if (!session) return;
  const leadId = String(formData.get("leadId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  await completeCrmTask({
    organizationId: session.organization.id,
    taskId,
    actorUserId: session.user.id,
  });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function cancelLeadTaskAction(formData: FormData) {
  const session = await requireOrg();
  if (!session) return;
  const leadId = String(formData.get("leadId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  await cancelCrmTask({
    organizationId: session.organization.id,
    taskId,
    actorUserId: session.user.id,
  });
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function addLeadNoteAction(formData: FormData) {
  const session = await requireOrg();
  if (!session) return;
  const leadId = String(formData.get("leadId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!leadId || !note) return;

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
