/**
 * Lead detail loader for admin CRM.
 */

import { CrmTaskStatus } from "@/generated/prisma/enums";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { SCORE_BAND_LABELS } from "@/lib/crm/scoring";
import { displayTaskStatus } from "@/lib/crm/tasks";
import { formatJalaliDateShort, formatJalaliDateTimeLabel } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

function maskMobile(mobile: string): string {
  if (mobile.length < 7) return "••••";
  return `${mobile.slice(0, 4)}•••${mobile.slice(-2)}`;
}

export async function loadLeadDetail(leadId: string) {
  try {
    const session = await requireAdminSession();
    const organizationId = session.organization.id;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
      include: {
        stage: true,
        pipeline: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
        formSubmissions: {
          where: { deletedAt: null },
          orderBy: { submittedAt: "desc" },
          take: 5,
          select: { id: true, submittedAt: true, formId: true },
        },
        bookingReservations: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            trackingCode: true,
            status: true,
            createdAt: true,
            slot: { select: { startsAt: true, endsAt: true } },
          },
        },
        crmTasks: {
          where: { deletedAt: null },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          take: 50,
          select: {
            id: true,
            title: true,
            taskType: true,
            status: true,
            priority: true,
            dueAt: true,
            completedAt: true,
            assignedTo: { select: { firstName: true, lastName: true } },
          },
        },
        crmActivities: {
          orderBy: { occurredAt: "desc" },
          take: 50,
          select: {
            id: true,
            activityType: true,
            title: true,
            summary: true,
            occurredAt: true,
            actor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!lead) return { ok: false as const, notFound: true };

    const stages = lead.pipelineId
      ? await prisma.crmPipelineStage.findMany({
          where: {
            organizationId,
            pipelineId: lead.pipelineId,
            deletedAt: null,
          },
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            isTerminal: true,
            isWon: true,
            isLost: true,
          },
        })
      : [];

    const owners = await prisma.organizationMembership.findMany({
      where: { organizationId, deletedAt: null, status: "ACTIVE" },
      take: 100,
      select: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const smsCount = await prisma.smsMessage.count({
      where: {
        organizationId,
        relatedType: "Lead",
        relatedId: lead.id,
      },
    });

    const breakdown = Array.isArray(lead.scoreBreakdown)
      ? (lead.scoreBreakdown as Array<{ key: string; label: string; points: number }>)
      : [];

    return {
      ok: true as const,
      data: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        fatherName: lead.fatherName,
        mobileMasked: maskMobile(lead.mobile),
        school: lead.school,
        gradeLevel: lead.gradeLevel,
        source: lead.source,
        sourceType: lead.sourceType,
        status: lead.status,
        score: lead.score,
        scoreBand: lead.scoreBand,
        scoreBandLabel: SCORE_BAND_LABELS[lead.scoreBand],
        scoreBreakdown: breakdown,
        pipelineName: lead.pipeline?.name ?? null,
        stageId: lead.stageId,
        stageName: lead.stage?.name ?? null,
        ownerId: lead.ownerUserId,
        ownerName: lead.owner
          ? `${lead.owner.firstName} ${lead.owner.lastName}`.trim()
          : null,
        branchName: lead.branch.name,
        nextFollowUpLabel: lead.nextFollowUpAt
          ? formatJalaliDateShort(lead.nextFollowUpAt)
          : null,
        lastContactLabel: lead.lastContactAt
          ? formatJalaliDateShort(lead.lastContactAt)
          : null,
        convertedAtLabel: lead.convertedAt
          ? formatJalaliDateShort(lead.convertedAt)
          : null,
        lostAtLabel: lead.lostAt ? formatJalaliDateShort(lead.lostAt) : null,
        lostReason: lead.lostReason,
        stages,
        owners: owners.map((m) => ({
          id: m.user.id,
          name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        })),
        submissions: lead.formSubmissions.map((s) => ({
          id: s.id,
          submittedAtLabel: formatJalaliDateShort(s.submittedAt),
        })),
        bookings: lead.bookingReservations.map((b) => ({
          id: b.id,
          trackingCode: b.trackingCode,
          status: b.status,
          whenLabel: formatJalaliDateTimeLabel(b.slot.startsAt, b.slot.endsAt),
        })),
        tasks: lead.crmTasks.map((t) => ({
          id: t.id,
          title: t.title,
          taskType: t.taskType,
          status: t.status,
          displayStatus: displayTaskStatus(t.status, t.dueAt),
          priority: t.priority,
          dueLabel: t.dueAt ? formatJalaliDateShort(t.dueAt) : null,
          assignee: t.assignedTo
            ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`.trim()
            : null,
        })),
        timeline: lead.crmActivities.map((a) => ({
          id: a.id,
          activityType: a.activityType,
          title: a.title,
          summary: a.summary,
          whenLabel: formatJalaliDateShort(a.occurredAt),
          actor: a.actor
            ? `${a.actor.firstName} ${a.actor.lastName}`.trim()
            : null,
        })),
        smsQueuedCount: smsCount,
        openTaskCount: lead.crmTasks.filter(
          (t) =>
            t.status === CrmTaskStatus.OPEN ||
            t.status === CrmTaskStatus.IN_PROGRESS,
        ).length,
      },
    };
  } catch {
    return { ok: false as const, notFound: false };
  }
}
