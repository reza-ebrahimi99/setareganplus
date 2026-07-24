/**
 * Lead detail loader for admin CRM.
 */

import { CrmTaskStatus } from "@/generated/prisma/enums";
import { hasPermission, scopedLeadWhere } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { SCORE_BAND_LABELS } from "@/lib/crm/scoring";
import { loadCrmSmsTemplates } from "@/lib/crm/manual-sms";
import { loadLeadOwnerOptions } from "@/lib/crm/lead-owners";
import { displayTaskStatus } from "@/lib/crm/tasks";
import {
  formatJalaliDateShort,
  formatJalaliDateTimeLabel,
  formatJalaliDateTimeShort,
} from "@/lib/datetime/jalali";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";
import { parseAttributionFromUnknown } from "@/lib/registration/attribution";
import {
  REGISTRATION_PAYMENT_LABELS,
  REGISTRATION_STATUS_LABELS,
} from "@/lib/registration/status";
import { formatRials } from "@/lib/registration/format";

function maskMobile(mobile: string): string {
  if (mobile.length < 7) return "••••";
  return `${mobile.slice(0, 4)}•••${mobile.slice(-2)}`;
}

function smsActivityMetadata(metadata: unknown): {
  status: "sent" | "failed";
  messageId: string;
} | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }
  const status = Reflect.get(metadata, "status");
  const messageId = Reflect.get(metadata, "smsMessageId");
  return (status === "sent" || status === "failed") && typeof messageId === "string"
    ? { status, messageId }
    : null;
}

export async function loadLeadDetail(leadId: string) {
  const session = await requirePermission("crm.view_assigned");
  const organizationId = session.organization.id;
  try {
    const lead = await prisma.lead.findFirst({
      where: { ...scopedLeadWhere(session), id: leadId },
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
        registrations: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            registrationNumber: true,
            status: true,
            paymentStatus: true,
            flowKey: true,
            productTitle: true,
            discountCode: true,
            finalAmountRials: true,
            createdAt: true,
            metadata: true,
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
            assignedToUserId: true,
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
            metadata: true,
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
            stageType: true,
            isTerminal: true,
            isWon: true,
            isLost: true,
          },
        })
      : [];

    const owners = hasPermission(session, "crm.assign")
      ? await loadLeadOwnerOptions({
          organizationId,
          branchId: lead.branchId,
        })
      : [];

    const branches = hasPermission(session, "crm.assign") ? await prisma.branch.findMany({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
        ...(session.membership.allBranches ? {} : { id: { in: session.membership.branchIds } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }) : [];

    const canSendSms = hasPermission(session, "crm.send_sms");
    const [smsCount, smsTemplates] = await Promise.all([
      prisma.smsMessage.count({
        where: {
          organizationId,
          relatedType: "Lead",
          relatedId: lead.id,
        },
      }),
      canSendSms ? loadCrmSmsTemplates(organizationId) : Promise.resolve([]),
    ]);
    const normalizedMobile = normalizeIranianMobile(
      lead.normalizedMobile ?? lead.mobile,
    );

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
        mobileTel: normalizedMobile.ok ? normalizedMobile.normalized : lead.mobile,
        mobileValid: normalizedMobile.ok,
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
        branchId: lead.branch.id,
        branches,
        nextFollowUpLabel: lead.nextFollowUpAt
          ? formatJalaliDateTimeShort(lead.nextFollowUpAt)
          : null,
        lastContactLabel: lead.lastContactAt
          ? formatJalaliDateTimeShort(lead.lastContactAt)
          : null,
        convertedAtLabel: lead.convertedAt
          ? formatJalaliDateShort(lead.convertedAt)
          : null,
        lostAtLabel: lead.lostAt ? formatJalaliDateShort(lead.lostAt) : null,
        lostReason: lead.lostReason,
        stages,
        owners: owners.map((owner) => ({
          id: owner.id,
          name: owner.name,
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
        registrations: lead.registrations.map((r) => {
          const attr = parseAttributionFromUnknown(r.metadata);
          const meta =
            r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
              ? (r.metadata as Record<string, unknown>)
              : {};
          const applied = Array.isArray(meta.appliedPromotions)
            ? (meta.appliedPromotions as Array<{ title?: string; type?: string; code?: string }>)
            : [];
          return {
            id: r.id,
            registrationNumber: r.registrationNumber,
            status: r.status,
            statusLabel: REGISTRATION_STATUS_LABELS[r.status] ?? r.status,
            paymentStatus: r.paymentStatus,
            paymentLabel:
              REGISTRATION_PAYMENT_LABELS[r.paymentStatus] ?? r.paymentStatus,
            flowKey: r.flowKey,
            productTitle: r.productTitle,
            discountCode: r.discountCode,
            finalAmountLabel: formatRials(r.finalAmountRials),
            createdAtLabel: formatJalaliDateShort(r.createdAt),
            promotionUsed: applied.map((p) => p.title || p.code).filter(Boolean).join("، ") || null,
            referralUsed:
              attr?.referralCode ||
              applied.find((p) => p.type === "REFERRAL")?.code ||
              null,
            acquisitionSource: attr?.acquisitionSource ?? null,
            campaign: attr?.campaign ?? attr?.utmCampaign ?? null,
          };
        }),
        tasks: lead.crmTasks.map((t) => ({
          id: t.id,
          title: t.title,
          taskType: t.taskType,
          status: t.status,
          displayStatus: displayTaskStatus(t.status, t.dueAt),
          priority: t.priority,
          dueLabel: t.dueAt ? formatJalaliDateTimeShort(t.dueAt) : null,
          assignedToUserId: t.assignedToUserId,
          assignee: t.assignedTo
            ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`.trim()
            : null,
        })),
        timeline: lead.crmActivities.map((a) => {
          const sms = smsActivityMetadata(a.metadata);
          return {
            id: a.id,
            activityType: a.activityType,
            title: a.title,
            summary: a.summary,
            whenLabel: formatJalaliDateTimeShort(a.occurredAt),
            actor: a.actor
              ? `${a.actor.firstName} ${a.actor.lastName}`.trim()
              : null,
            smsStatus: sms?.status ?? null,
            smsMessageId: sms?.messageId ?? null,
          };
        }),
        smsQueuedCount: smsCount,
        smsTemplates,
        openTaskCount: lead.crmTasks.filter(
          (t) =>
            t.status === CrmTaskStatus.OPEN ||
            t.status === CrmTaskStatus.IN_PROGRESS,
        ).length,
        permissions: {
          assign: hasPermission(session, "crm.assign"),
          changeStage: hasPermission(session, "crm.change_stage"),
          terminal: hasPermission(session, "crm.mark_won_lost"),
          addNote: hasPermission(session, "crm.add_note"),
          createTask: hasPermission(session, "crm.create_task"),
          completeTask: hasPermission(session, "crm.complete_task"),
          call: hasPermission(session, "crm.call"),
          sendSms: canSendSms,
        },
      },
    };
  } catch {
    return { ok: false as const, notFound: false };
  }
}
