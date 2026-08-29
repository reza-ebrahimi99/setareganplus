import { CrmTaskStatus } from "@/generated/prisma/enums";
import type { AutomationConditions } from "@/lib/automation/rules/contract";
import { prisma } from "@/lib/prisma";

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 3_600_000;
}

export async function evaluateAutomationConditions(params: {
  organizationId: string;
  conditions: AutomationConditions;
  leadId: string | null;
  eventCreatedAt: Date;
  branchId: string | null;
  eventPayload: Record<string, unknown>;
}): Promise<boolean> {
  const c = params.conditions;
  const payload = params.eventPayload;

  if (c.branchId && params.branchId && c.branchId !== params.branchId) {
    return false;
  }
  if (
    typeof c.hoursSinceEventMin === "number" &&
    hoursBetween(new Date(), params.eventCreatedAt) < c.hoursSinceEventMin
  ) {
    return false;
  }
  if (
    typeof c.hoursSinceEventMax === "number" &&
    hoursBetween(new Date(), params.eventCreatedAt) > c.hoursSinceEventMax
  ) {
    return false;
  }

  if (c.slaStateIn?.length) {
    const sla =
      typeof payload.slaState === "string"
        ? payload.slaState
        : typeof payload.clock === "string"
          ? "BREACHED"
          : null;
    if (!sla || !c.slaStateIn.includes(sla)) return false;
  }
  if (c.queueIdIn?.length) {
    const queueId =
      typeof payload.queueId === "string" ? payload.queueId : null;
    if (!queueId || !c.queueIdIn.includes(queueId)) return false;
  }
  if (c.priorityIn?.length) {
    const priority =
      typeof payload.priority === "string" ? payload.priority : null;
    if (!priority || !c.priorityIn.includes(priority)) return false;
  }
  if (c.paymentStatusIn?.length) {
    const status =
      typeof payload.paymentStatus === "string" ? payload.paymentStatus : null;
    if (!status || !c.paymentStatusIn.includes(status)) return false;
  }
  if (c.registrationStatusIn?.length) {
    const status =
      typeof payload.registrationStatus === "string"
        ? payload.registrationStatus
        : null;
    if (!status || !c.registrationStatusIn.includes(status)) return false;
  }
  if (c.metadataEquals) {
    for (const [key, expected] of Object.entries(c.metadataEquals)) {
      if (String(payload[key] ?? "") !== expected) return false;
    }
  }

  if (!params.leadId) {
    const needsLead =
      (c.stageIds && c.stageIds.length > 0) ||
      (c.stageTypes && c.stageTypes.length > 0) ||
      typeof c.scoreMin === "number" ||
      typeof c.scoreMax === "number" ||
      (c.sourceTypes && c.sourceTypes.length > 0) ||
      (c.sources && c.sources.length > 0) ||
      typeof c.hasBooking === "boolean" ||
      typeof c.hasCompletedTask === "boolean" ||
      typeof c.ownerIsNull === "boolean" ||
      (c.ownershipSourceIn && c.ownershipSourceIn.length > 0) ||
      (c.leadStatusIn && c.leadStatusIn.length > 0) ||
      (c.answerEquals && Object.keys(c.answerEquals).length > 0);
    return !needsLead;
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.leadId,
      organizationId: params.organizationId,
      deletedAt: null,
    },
    select: {
      stageId: true,
      score: true,
      sourceType: true,
      source: true,
      status: true,
      ownerUserId: true,
      stage: { select: { stageType: true } },
    },
  });
  if (!lead) return false;

  if (c.stageIds?.length && (!lead.stageId || !c.stageIds.includes(lead.stageId))) {
    return false;
  }
  if (
    c.stageTypes?.length &&
    (!lead.stage || !c.stageTypes.includes(lead.stage.stageType))
  ) {
    return false;
  }
  if (typeof c.scoreMin === "number" && lead.score < c.scoreMin) return false;
  if (typeof c.scoreMax === "number" && lead.score > c.scoreMax) return false;
  if (c.sourceTypes?.length && !c.sourceTypes.includes(lead.sourceType)) {
    return false;
  }
  if (c.sources?.length && !c.sources.includes(lead.source)) {
    return false;
  }
  if (typeof c.ownerIsNull === "boolean") {
    const isNull = lead.ownerUserId == null;
    if (c.ownerIsNull !== isNull) return false;
  }
  if (c.leadStatusIn?.length && !c.leadStatusIn.includes(lead.status)) {
    return false;
  }
  if (c.ownershipSourceIn?.length) {
    const source =
      typeof payload.source === "string"
        ? payload.source
        : typeof payload.ownershipSource === "string"
          ? payload.ownershipSource
          : null;
    if (!source || !c.ownershipSourceIn.includes(source)) return false;
  }
  if (typeof c.hasBooking === "boolean") {
    const count = await prisma.bookingReservation.count({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        deletedAt: null,
      },
    });
    if (c.hasBooking !== count > 0) return false;
  }
  if (typeof c.hasCompletedTask === "boolean") {
    const count = await prisma.crmTask.count({
      where: {
        organizationId: params.organizationId,
        leadId: params.leadId,
        status: CrmTaskStatus.COMPLETED,
        deletedAt: null,
      },
    });
    if (c.hasCompletedTask !== count > 0) return false;
  }
  if (c.answerEquals && Object.keys(c.answerEquals).length > 0) {
    const submissionId =
      typeof payload.submissionId === "string" ? payload.submissionId : null;
    if (!submissionId) return false;
    const answers = await prisma.formAnswer.findMany({
      where: {
        organizationId: params.organizationId,
        submissionId,
        fieldKey: { in: Object.keys(c.answerEquals) },
      },
      select: { fieldKey: true, valueText: true, valueLongText: true },
    });
    const map = new Map(
      answers.map((a) => [
        a.fieldKey,
        (a.valueText ?? a.valueLongText ?? "").trim(),
      ]),
    );
    for (const [key, expected] of Object.entries(c.answerEquals)) {
      if ((map.get(key) ?? "") !== expected) return false;
    }
  }
  return true;
}
