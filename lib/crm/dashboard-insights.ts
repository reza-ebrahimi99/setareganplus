import { CrmStageType, LeadStatus } from "@/generated/prisma/enums";
import {
  hasPermission,
  scopedBranchWhere,
  scopedLeadWhereForFilter,
} from "@/lib/auth/permissions";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";

type LeadAggregateGroup = {
  ownerUserId: string | null;
  stageId: string | null;
  status: LeadStatus;
  count: number;
};

type StageOutcome = {
  id: string;
  stageType: CrmStageType;
  isWon: boolean;
  isLost: boolean;
};

export type CrmDashboardOverview = {
  total: number;
  assigned: number;
  unassigned: number;
  newToday: number;
  importedToday: number;
  registered: number;
  lost: number;
};

export type AdvisorLeadDistribution = {
  ownerUserId: string;
  ownerName: string;
  total: number;
  active: number;
  registered: number;
  lost: number;
  conversionRate: number;
};

export type DashboardImportOwnerDistribution = {
  ownerUserId: string | null;
  ownerName: string;
  count: number;
};

export type DashboardImportReport = {
  id: string;
  createdAt: Date;
  importedBy: string;
  sourceFileName: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  failed: number;
  duplicates: number;
  ownerDistribution: DashboardImportOwnerDistribution[];
};

export type CrmManagementAlert = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: "warning" | "danger";
};

export type CrmDashboardInsights = {
  overview: CrmDashboardOverview;
  advisors: AdvisorLeadDistribution[];
  recentImports: DashboardImportReport[];
  latestImportReportId: string | null;
  alerts: CrmManagementAlert[];
  canViewAllAdvisors: boolean;
};

export type CrmDashboardInsightsResult =
  | { ok: true; data: CrmDashboardInsights }
  | { ok: false; error: string };

function isRegistered(
  group: LeadAggregateGroup,
  stage: StageOutcome | undefined,
): boolean {
  if (stage) return stage.isWon || stage.stageType === CrmStageType.WON;
  return group.status === LeadStatus.ENROLLED;
}

function isLost(
  group: LeadAggregateGroup,
  stage: StageOutcome | undefined,
): boolean {
  if (stage) return stage.isLost || stage.stageType === CrmStageType.LOST;
  return group.status === LeadStatus.LOST;
}

export function summarizeLeadGroups(
  groups: readonly LeadAggregateGroup[],
  stages: readonly StageOutcome[],
  ownerNames: ReadonlyMap<string, string>,
): {
  overview: Pick<
    CrmDashboardOverview,
    "total" | "assigned" | "unassigned" | "registered" | "lost"
  >;
  advisors: AdvisorLeadDistribution[];
} {
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const owners = new Map<
    string,
    Omit<AdvisorLeadDistribution, "ownerName" | "conversionRate">
  >();
  let total = 0;
  let unassigned = 0;
  let registered = 0;
  let lost = 0;

  for (const group of groups) {
    total += group.count;
    if (!group.ownerUserId) unassigned += group.count;
    const stage = group.stageId ? stageById.get(group.stageId) : undefined;
    const registeredCount = isRegistered(group, stage) ? group.count : 0;
    const lostCount = isLost(group, stage) ? group.count : 0;
    registered += registeredCount;
    lost += lostCount;

    if (group.ownerUserId) {
      const current = owners.get(group.ownerUserId) ?? {
        ownerUserId: group.ownerUserId,
        total: 0,
        active: 0,
        registered: 0,
        lost: 0,
      };
      current.total += group.count;
      current.registered += registeredCount;
      current.lost += lostCount;
      current.active += group.count - registeredCount - lostCount;
      owners.set(group.ownerUserId, current);
    }
  }

  return {
    overview: {
      total,
      assigned: total - unassigned,
      unassigned,
      registered,
      lost,
    },
    advisors: [...owners.values()]
      .map((owner) => ({
        ...owner,
        ownerName: ownerNames.get(owner.ownerUserId) ?? "کاربر غیرفعال",
        conversionRate: owner.total
          ? (owner.registered / owner.total) * 100
          : 0,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

function readOwnerDistribution(
  value: unknown,
): DashboardImportOwnerDistribution[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.ownerName !== "string" ||
      typeof row.count !== "number" ||
      !Number.isSafeInteger(row.count) ||
      row.count < 0 ||
      (row.ownerUserId !== null && typeof row.ownerUserId !== "string")
    ) {
      return [];
    }
    return [{
      ownerUserId: row.ownerUserId as string | null,
      ownerName: row.ownerName,
      count: row.count,
    }];
  });
}

export function buildCrmManagementAlerts(params: {
  unassigned: number;
  importedUnassigned: number;
  advisors: readonly AdvisorLeadDistribution[];
  recentImports: readonly DashboardImportReport[];
}): CrmManagementAlert[] {
  const alerts: CrmManagementAlert[] = [];
  if (params.unassigned > 0) {
    alerts.push({
      id: "unassigned",
      label: "لید بدون مسئول وجود دارد",
      detail: `${params.unassigned} لید نیازمند تخصیص مسئول است.`,
      href: "/admin/leads?scope=unassigned",
      tone: "warning",
    });
  }
  if (params.importedUnassigned > 0) {
    alerts.push({
      id: "imported-unassigned",
      label: "لید واردشده بدون مسئول",
      detail: `${params.importedUnassigned} لید واردشده هنوز مسئول ندارد.`,
      href: "/admin/leads?scope=unassigned&sourceType=IMPORT",
      tone: "warning",
    });
  }

  const assignedTotal = params.advisors.reduce(
    (sum, advisor) => sum + advisor.total,
    0,
  );
  const average = params.advisors.length
    ? assignedTotal / params.advisors.length
    : 0;
  const highLoad = params.advisors.find(
    (advisor) => advisor.total >= 20 && advisor.total > average * 1.5,
  );
  if (highLoad) {
    alerts.push({
      id: "advisor-high-load",
      label: "تراکم بالای لید برای یک مشاور",
      detail: `${highLoad.ownerName} با ${highLoad.total} لید بالاتر از میانگین تیم است.`,
      href: `/admin/leads?scope=all&owner=${encodeURIComponent(highLoad.ownerUserId)}`,
      tone: "warning",
    });
  }

  const invalid = params.recentImports.find((report) => report.invalid > 0);
  if (invalid) {
    alerts.push({
      id: "import-invalid",
      label: "ردیف نامعتبر در ورود اخیر",
      detail: `${invalid.invalid} ردیف از آخرین ورودها نامعتبر بوده است.`,
      href: `/admin/crm/import/reports/${invalid.id}`,
      tone: "warning",
    });
  }
  const partialFailure = params.recentImports.find(
    (report) => report.failed > 0,
  );
  if (partialFailure) {
    alerts.push({
      id: "import-failed",
      label: "ورود گروهی ناقص انجام شد",
      detail: `${partialFailure.failed} ردیف در یک ورود اخیر ثبت نشده است.`,
      href: `/admin/crm/import/reports/${partialFailure.id}`,
      tone: "danger",
    });
  }
  return alerts;
}

export async function loadCrmDashboardInsights(
  session: AdminSessionContext,
  now = new Date(),
): Promise<CrmDashboardInsightsResult> {
  try {
    const leadScope = scopedLeadWhereForFilter(session, "all");
    const branchScope = scopedBranchWhere(session);
    const canViewAllAdvisors = hasPermission(session, "crm.view_all");
    const canViewImports = hasPermission(session, "crm.import_leads");
    const tehranToday = getTehranParts(now);
    const { startUtc, endUtc } = tehranDayBoundsUtc(
      tehranToday.year,
      tehranToday.month,
      tehranToday.day,
    );

    const [rawGroups, newToday, importedToday, importedUnassigned, reports] =
      await Promise.all([
        prisma.lead.groupBy({
          by: ["ownerUserId", "stageId", "status"],
          where: leadScope,
          _count: { _all: true },
        }),
        prisma.lead.count({
          where: {
            ...leadScope,
            createdAt: { gte: startUtc, lte: endUtc },
          },
        }),
        prisma.lead.count({
          where: {
            ...leadScope,
            sourceType: "IMPORT",
            createdAt: { gte: startUtc, lte: endUtc },
          },
        }),
        prisma.lead.count({
          where: {
            ...leadScope,
            sourceType: "IMPORT",
            ownerUserId: null,
          },
        }),
        canViewImports
          ? prisma.crmLeadImportReport.findMany({
              where: {
                organizationId: session.organization.id,
                ...branchScope,
                ...(canViewAllAdvisors
                  ? {}
                  : { importedByUserId: session.user.id }),
              },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 5,
              select: {
                id: true,
                sourceFileName: true,
                totalRows: true,
                createdCount: true,
                updatedCount: true,
                skippedCount: true,
                invalidCount: true,
                failedCount: true,
                duplicateCount: true,
                ownerDistribution: true,
                createdAt: true,
                importedBy: {
                  select: { firstName: true, lastName: true },
                },
              },
            })
          : Promise.resolve([]),
      ]);

    const groups: LeadAggregateGroup[] = rawGroups.map((group) => ({
      ownerUserId: group.ownerUserId,
      stageId: group.stageId,
      status: group.status,
      count: group._count._all,
    }));
    const stageIds = [
      ...new Set(groups.flatMap((group) => group.stageId ? [group.stageId] : [])),
    ];
    const ownerIds = [
      ...new Set(
        groups.flatMap((group) =>
          group.ownerUserId ? [group.ownerUserId] : [],
        ),
      ),
    ];
    const [stages, owners] = await Promise.all([
      stageIds.length
        ? prisma.crmPipelineStage.findMany({
            where: {
              organizationId: session.organization.id,
              id: { in: stageIds },
            },
            select: {
              id: true,
              stageType: true,
              isWon: true,
              isLost: true,
            },
          })
        : Promise.resolve([]),
      ownerIds.length
        ? prisma.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
    ]);
    const ownerNames = new Map(
      owners.map((owner) => [
        owner.id,
        `${owner.firstName} ${owner.lastName}`.trim(),
      ]),
    );
    const summary = summarizeLeadGroups(groups, stages, ownerNames);
    const recentImports: DashboardImportReport[] = reports.map((report) => ({
      id: report.id,
      createdAt: report.createdAt,
      importedBy: report.importedBy
        ? `${report.importedBy.firstName} ${report.importedBy.lastName}`.trim()
        : "کاربر حذف‌شده",
      sourceFileName: report.sourceFileName,
      total: report.totalRows,
      created: report.createdCount,
      updated: report.updatedCount,
      skipped: report.skippedCount,
      invalid: report.invalidCount,
      failed: report.failedCount,
      duplicates: report.duplicateCount,
      ownerDistribution: readOwnerDistribution(report.ownerDistribution),
    }));
    const overview: CrmDashboardOverview = {
      ...summary.overview,
      newToday,
      importedToday,
    };

    return {
      ok: true,
      data: {
        overview,
        advisors: summary.advisors,
        recentImports,
        latestImportReportId: recentImports[0]?.id ?? null,
        alerts: buildCrmManagementAlerts({
          unassigned: overview.unassigned,
          importedUnassigned,
          advisors: summary.advisors,
          recentImports,
        }),
        canViewAllAdvisors,
      },
    };
  } catch (error) {
    console.error("Failed to load CRM dashboard insights", error);
    return {
      ok: false,
      error: "بارگذاری شاخص‌های CRM در حال حاضر ممکن نیست.",
    };
  }
}
