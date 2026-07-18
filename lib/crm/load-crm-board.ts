/**
 * Load CRM pipeline board data (org-scoped, bounded, no N+1).
 */

import {
  CrmTaskStatus,
  LeadScoreBand,
  LeadSourceType,
  type CrmStageType,
} from "@/generated/prisma/enums";
import {
  hasPermission,
  normalizeLeadScopeFilter,
  scopedLeadWhereForFilter,
  type LeadScopeFilter,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { loadLeadOwnerOptions } from "@/lib/crm/lead-owners";
import { loadCrmSmsTemplates, type CrmSmsTemplateOption } from "@/lib/crm/manual-sms";
import { SCORE_BAND_LABELS } from "@/lib/crm/scoring";
import { isTaskOverdue } from "@/lib/crm/tasks";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type CrmBoardFilters = {
  scope?: LeadScopeFilter;
  ownerUserId?: string;
  stageId?: string;
  sourceType?: LeadSourceType;
  scoreBand?: LeadScoreBand;
  branchId?: string;
  followUpOverdue?: boolean;
};

export type CrmBoardLeadCard = {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  mobileMasked: string;
  mobileValid: boolean;
  score: number;
  scoreBand: LeadScoreBand;
  scoreBandLabel: string;
  source: string;
  sourceType: string;
  ownerName: string | null;
  nextFollowUpLabel: string | null;
  overdueTaskCount: number;
  bookingStatus: string | null;
  lastActivityLabel: string | null;
  stageId: string | null;
};

export type CrmBoardColumn = {
  stageId: string;
  stageName: string;
  stageCode: string;
  stageType: CrmStageType;
  colorKey: string | null;
  isTerminal: boolean;
  leads: CrmBoardLeadCard[];
};

export type CrmBoardLoadError = {
  message: string;
  stack?: string;
};

function maskMobile(mobile: string): string {
  if (mobile.length < 7) return "••••";
  return `${mobile.slice(0, 4)}•••${mobile.slice(-2)}`;
}

export async function loadCrmPipelineBoard(filters: CrmBoardFilters = {}): Promise<
  | {
      ok: true;
      data: {
        pipelineId: string;
        columns: CrmBoardColumn[];
        owners: Array<{ id: string; name: string }>;
        branches: Array<{ id: string; name: string }>;
        scope: LeadScopeFilter;
        totalLeads: number;
        permissions: {
          assign: boolean;
          viewAll: boolean;
          changeStage: boolean;
          terminal: boolean;
          sendSms: boolean;
        };
        smsTemplates: CrmSmsTemplateOption[];
      };
    }
  | { ok: false; error: CrmBoardLoadError }
> {
  const session = await requirePermission("crm.view_assigned");
  try {
    const organizationId = session.organization.id;
    const scope = normalizeLeadScopeFilter(session, filters.scope);
    const initialized = await ensureDefaultPipeline(organizationId);

    const pipeline = await prisma.crmPipeline.findFirst({
      where: {
        id: initialized.pipelineId,
        organizationId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        stages: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
        },
      },
    });
    if (!pipeline) {
      throw new Error(
        `Initialized CRM pipeline ${initialized.pipelineId} could not be loaded.`,
      );
    }
    if (pipeline.stages.length === 0) {
      throw new Error(
        `Initialized CRM pipeline ${pipeline.id} has no active stages.`,
      );
    }

    const now = new Date();
    const leads = await prisma.lead.findMany({
      where: {
        AND: [
          scopedLeadWhereForFilter(session, scope),
          {
            pipelineId: pipeline.id,
            ...(filters.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
            ...(filters.stageId ? { stageId: filters.stageId } : {}),
            ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
            ...(filters.scoreBand ? { scoreBand: filters.scoreBand } : {}),
            ...(filters.branchId ? { branchId: filters.branchId } : {}),
            ...(filters.followUpOverdue
              ? {
                  crmTasks: {
                    some: {
                      deletedAt: null,
                      status: {
                        in: [
                          CrmTaskStatus.OPEN,
                          CrmTaskStatus.IN_PROGRESS,
                        ],
                      },
                      dueAt: { lt: now },
                    },
                  },
                }
              : {}),
          },
        ],
      },
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      take: 200,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mobile: true,
        normalizedMobile: true,
        score: true,
        scoreBand: true,
        source: true,
        sourceType: true,
        stageId: true,
        nextFollowUpAt: true,
        owner: { select: { firstName: true, lastName: true } },
        crmTasks: {
          where: {
            deletedAt: null,
            status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
          },
          select: { dueAt: true, status: true },
        },
        bookingReservations: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
        crmActivities: {
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: { occurredAt: true },
        },
      },
    });

    const cardsByStage = new Map<string, CrmBoardLeadCard[]>();
    for (const stage of pipeline.stages) {
      cardsByStage.set(stage.id, []);
    }

    for (const lead of leads) {
      const normalizedMobile = normalizeIranianMobile(
        lead.normalizedMobile ?? lead.mobile,
      );
      const card: CrmBoardLeadCard = {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        mobile: normalizedMobile.ok ? normalizedMobile.normalized : lead.mobile,
        mobileMasked: maskMobile(lead.mobile),
        mobileValid: normalizedMobile.ok,
        score: lead.score,
        scoreBand: lead.scoreBand,
        scoreBandLabel: SCORE_BAND_LABELS[lead.scoreBand],
        source: lead.source,
        sourceType: lead.sourceType,
        ownerName: lead.owner
          ? `${lead.owner.firstName} ${lead.owner.lastName}`.trim()
          : null,
        nextFollowUpLabel: lead.nextFollowUpAt
          ? formatJalaliDateTimeShort(lead.nextFollowUpAt)
          : null,
        overdueTaskCount: lead.crmTasks.filter((t) =>
          isTaskOverdue({ status: t.status, dueAt: t.dueAt, now }),
        ).length,
        bookingStatus: lead.bookingReservations[0]?.status ?? null,
        lastActivityLabel: lead.crmActivities[0]
          ? formatJalaliDateTimeShort(lead.crmActivities[0].occurredAt)
          : null,
        stageId: lead.stageId,
      };
      const key = lead.stageId ?? pipeline.stages[0]?.id;
      if (key && cardsByStage.has(key)) {
        cardsByStage.get(key)!.push(card);
      } else if (pipeline.stages[0]) {
        cardsByStage.get(pipeline.stages[0].id)!.push(card);
      }
    }

    const canViewAll = hasPermission(session, "crm.view_all");
    const ownerOptions = canViewAll
      ? await loadLeadOwnerOptions({
          organizationId,
          accessibleBranchIds: session.membership.allBranches
            ? undefined
            : session.membership.branchIds,
        })
      : [];

    const branches = await prisma.branch.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(session.membership.allBranches
          ? {}
          : { id: { in: session.membership.branchIds } }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 50,
    });
    const smsTemplates = hasPermission(session, "crm.send_sms")
      ? await loadCrmSmsTemplates(organizationId)
      : [];

    return {
      ok: true,
      data: {
        pipelineId: pipeline.id,
        columns: pipeline.stages.map((stage) => ({
          stageId: stage.id,
          stageName: stage.name,
          stageCode: stage.code,
          stageType: stage.stageType,
          colorKey: stage.colorKey,
          isTerminal: stage.isTerminal,
          leads: cardsByStage.get(stage.id) ?? [],
        })),
        owners: ownerOptions.map((owner) => ({
          id: owner.id,
          name: owner.name,
        })),
        branches,
        scope,
        totalLeads: leads.length,
        smsTemplates,
        permissions: {
          assign: hasPermission(session, "crm.assign"),
          viewAll: canViewAll,
          changeStage: hasPermission(session, "crm.change_stage"),
          terminal: hasPermission(session, "crm.mark_won_lost"),
          sendSms: hasPermission(session, "crm.send_sms"),
        },
      },
    };
  } catch (error) {
    console.error("Failed to load CRM pipeline board:", error);

    if (error instanceof Error) {
      return {
        ok: false,
        error: {
          message: error.message,
          ...(process.env.NODE_ENV === "development" && error.stack
            ? { stack: error.stack }
            : {}),
        },
      };
    }

    return {
      ok: false,
      error: {
        message: String(error),
      },
    };
  }
}
