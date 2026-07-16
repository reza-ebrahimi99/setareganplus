import type { Prisma } from "@/generated/prisma/client";
import {
  CrmActivityType,
  CrmCallOutcome,
  CrmTaskStatus,
  CrmTaskType,
  type SystemRole,
} from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { STAFF_METRIC_DEFINITIONS } from "@/lib/reports/staff-metric-definitions";

export type StaffPerformanceFilters = {
  from: Date;
  to: Date;
  branchId?: string;
  role?: SystemRole;
  membershipId?: string;
  source?: string;
  formId?: string;
  stageId?: string;
};

const ANSWERED_OUTCOMES = new Set<CrmCallOutcome>([
  CrmCallOutcome.ANSWERED,
  CrmCallOutcome.FOLLOW_UP_REQUIRED,
  CrmCallOutcome.CONSULTATION_BOOKED,
  CrmCallOutcome.REGISTERED,
]);
const NO_ANSWER_OUTCOMES = new Set<CrmCallOutcome>([
  CrmCallOutcome.NO_ANSWER,
  CrmCallOutcome.BUSY,
  CrmCallOutcome.OFF,
]);

export async function loadStaffPerformance(
  session: AdminSessionContext,
  filters: StaffPerformanceFilters,
) {
  const organizationId = session.organization.id;
  const allowedBranches = session.membership.allBranches
    ? undefined
    : session.membership.branchIds;
  const branchIds = filters.branchId
    ? allowedBranches && !allowedBranches.includes(filters.branchId)
      ? []
      : [filters.branchId]
    : allowedBranches;

  const memberWhere: Prisma.OrganizationMembershipWhereInput = {
    organizationId,
    deletedAt: null,
    status: "ACTIVE",
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.membershipId ? { id: filters.membershipId } : {}),
    ...(branchIds
      ? {
          OR: [
            { branchMemberships: { none: { deletedAt: null } } },
            { branchMemberships: { some: { branchId: { in: branchIds }, deletedAt: null } } },
          ],
        }
      : {}),
  };
  const members = await prisma.organizationMembership.findMany({
    where: memberWhere,
    orderBy: { user: { lastName: "asc" } },
    take: 200,
    select: {
      id: true,
      role: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  const membershipIds = members.map((member) => member.id);
  const userIds = members.map((member) => member.user.id);
  const leadFilter: Prisma.LeadWhereInput = {
    organizationId,
    deletedAt: null,
    ...(branchIds ? { branchId: { in: branchIds } } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.formId ? { formSubmissions: { some: { formId: filters.formId } } } : {}),
    ...(filters.stageId ? { stageId: filters.stageId } : {}),
  };
  const range = { gte: filters.from, lte: filters.to };

  const [leads, calls, tasks, activities, branches, stages, forms] = await Promise.all([
    prisma.lead.findMany({
      where: { ...leadFilter, createdAt: range, ownerUserId: { in: userIds } },
      take: 10_000,
      select: { id: true, ownerUserId: true, createdAt: true },
    }),
    prisma.crmCallLog.findMany({
      where: {
        organizationId,
        membershipId: { in: membershipIds },
        calledAt: range,
        lead: leadFilter,
      },
      orderBy: { calledAt: "asc" },
      take: 20_000,
      select: {
        membershipId: true,
        leadId: true,
        outcome: true,
        calledAt: true,
        lead: { select: { createdAt: true } },
      },
    }),
    prisma.crmTask.findMany({
      where: {
        organizationId,
        assignedToUserId: { in: userIds },
        deletedAt: null,
        lead: leadFilter,
        OR: [
          { completedAt: range, taskType: CrmTaskType.FOLLOW_UP },
          { dueAt: { lt: new Date() }, status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] } },
        ],
      },
      take: 20_000,
      select: { assignedToUserId: true, taskType: true, status: true, completedAt: true, dueAt: true },
    }),
    prisma.crmActivity.findMany({
      where: {
        organizationId,
        actorUserId: { in: userIds },
        occurredAt: range,
        lead: leadFilter,
      },
      take: 20_000,
      select: { actorUserId: true, leadId: true, activityType: true, metadata: true },
    }),
    prisma.branch.findMany({
      where: { organizationId, deletedAt: null, ...(allowedBranches ? { id: { in: allowedBranches } } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.crmPipelineStage.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
    prisma.form.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { slug: "asc" },
      take: 200,
      select: {
        id: true,
        slug: true,
        publishedVersion: {
          select: { title: true },
        },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { title: true },
        },
      },
    }),
  ]);

  const rows = members.map((member) => {
    const assigned = leads.filter((lead) => lead.ownerUserId === member.user.id);
    const memberCalls = calls.filter((call) => call.membershipId === member.id);
    const memberTasks = tasks.filter((task) => task.assignedToUserId === member.user.id);
    const memberActivities = activities.filter((activity) => activity.actorUserId === member.user.id);
    const firstCalls = new Map<string, (typeof memberCalls)[number]>();
    for (const call of memberCalls) if (!firstCalls.has(call.leadId)) firstCalls.set(call.leadId, call);
    const responseTimes = [...firstCalls.values()]
      .map((call) => call.calledAt.getTime() - call.lead.createdAt.getTime())
      .filter((value) => value >= 0);
    const won = memberActivities.filter((activity) => activity.activityType === CrmActivityType.CONVERTED).length;
    const assignedCount = assigned.length;
    const activeLeadCount = new Set(memberActivities.map((activity) => activity.leadId)).size;
    return {
      membershipId: member.id,
      userId: member.user.id,
      name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      role: member.role,
      roleLabel: ROLE_LABELS[member.role],
      assignedLeads: assignedCount,
      calls: memberCalls.length,
      answered: memberCalls.filter((call) => ANSWERED_OUTCOMES.has(call.outcome)).length,
      noAnswer: memberCalls.filter((call) => NO_ANSWER_OUTCOMES.has(call.outcome)).length,
      followUpsCompleted: memberTasks.filter((task) => task.taskType === CrmTaskType.FOLLOW_UP && task.status === CrmTaskStatus.COMPLETED && task.completedAt && task.completedAt >= filters.from && task.completedAt <= filters.to).length,
      overdueTasks: memberTasks.filter((task) => task.status !== CrmTaskStatus.COMPLETED && task.status !== CrmTaskStatus.CANCELLED && task.dueAt && task.dueAt < new Date()).length,
      consultations: memberCalls.filter((call) => call.outcome === CrmCallOutcome.CONSULTATION_BOOKED).length,
      qualified: memberActivities.filter((activity) => {
        if (activity.activityType !== CrmActivityType.STAGE_CHANGED || !activity.metadata || Array.isArray(activity.metadata) || typeof activity.metadata !== "object") return false;
        return (activity.metadata as Record<string, unknown>).stageType === "QUALIFIED";
      }).length,
      won,
      conversionRate: activeLeadCount ? (won / activeLeadCount) * 100 : 0,
      averageResponseMinutes: responseTimes.length
        ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length / 60_000
        : null,
      activityCount: memberActivities.length,
    };
  });

  return {
    rows,
    branches,
    stages,
    forms: forms.map((form) => ({
      id: form.id,
      title:
        form.publishedVersion?.title ??
        form.versions[0]?.title ??
        form.slug,
    })),
    definitions: STAFF_METRIC_DEFINITIONS,
  };
}
