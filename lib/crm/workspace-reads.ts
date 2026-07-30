/**
 * Truth Spine read facades for Advisor workspace dashboard (Sprint 6).
 */

import { CrmTaskStatus } from "@/generated/prisma/enums";
import {
  hasPermission,
  scopedLeadWhere,
} from "@/lib/auth/permissions";
import type { AdminSessionContext } from "@/lib/auth/require-admin";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";

export type WorkspaceDashboardData = {
  summary: {
    callsToday: number;
    overdueFollowUps: number;
    openTasks: number;
  };
  callsToday: Array<{
    id: string;
    outcome: string;
    calledAt: string;
    lead: { id: string; firstName: string; lastName: string };
  }>;
  overdue: Array<{
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    nextFollowUpAt: string | null;
  }>;
  nextFollowUps: Array<{
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    nextFollowUpAt: string | null;
  }>;
  leads: Array<{
    id: string;
    firstName: string;
    lastName: string;
    mobile: string;
    score: number;
  }>;
  bookings: Array<{
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    startsAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    priority: string;
    lead: { id: string; firstName: string; lastName: string };
  }>;
  activities: Array<{
    id: string;
    title: string;
    occurredAt: string;
    lead: { id: string; firstName: string; lastName: string };
  }>;
};

export async function readWorkspaceDashboard(
  session: AdminSessionContext,
): Promise<WorkspaceDashboardData> {
  const organizationId = session.organization.id;
  const now = new Date();
  const today = getTehranParts(now);
  const { startUtc: start, endUtc: end } = tehranDayBoundsUtc(
    today.year,
    today.month,
    today.day,
  );
  const leadScope = scopedLeadWhere(session);
  const branchIds = session.membership.branchIds;
  const bookingSlotScope = hasPermission(session, "booking.view_all")
    ? session.membership.allBranches
      ? {}
      : { branchId: { in: branchIds } }
    : { advisor: { userId: session.user.id } };

  const [callsToday, overdue, nextFollowUps, leads, bookings, tasks, activities] =
    await Promise.all([
      prisma.crmCallLog.findMany({
        where: {
          organizationId,
          membershipId: session.membership.id,
          calledAt: { gte: start, lt: end },
        },
        orderBy: { calledAt: "desc" },
        take: 20,
        select: {
          id: true,
          outcome: true,
          calledAt: true,
          lead: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.lead.findMany({
        where: { ...leadScope, nextFollowUpAt: { lt: now } },
        orderBy: { nextFollowUpAt: "asc" },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          nextFollowUpAt: true,
        },
      }),
      prisma.lead.findMany({
        where: { ...leadScope, nextFollowUpAt: { gte: now } },
        orderBy: { nextFollowUpAt: "asc" },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          nextFollowUpAt: true,
        },
      }),
      prisma.lead.findMany({
        where: leadScope,
        orderBy: { updatedAt: "desc" },
        take: 24,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          score: true,
        },
      }),
      prisma.bookingReservation.findMany({
        where: {
          organizationId,
          deletedAt: null,
          slot: { startsAt: { gte: start, lt: end }, ...bookingSlotScope },
        },
        orderBy: { slot: { startsAt: "asc" } },
        take: 30,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          slot: { select: { startsAt: true } },
        },
      }),
      prisma.crmTask.findMany({
        where: {
          organizationId,
          assignedToUserId: session.user.id,
          deletedAt: null,
          status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 30,
        select: {
          id: true,
          title: true,
          dueAt: true,
          priority: true,
          lead: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.crmActivity.findMany({
        where: { organizationId, lead: leadScope },
        orderBy: { occurredAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          occurredAt: true,
          lead: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

  return {
    summary: {
      callsToday: callsToday.length,
      overdueFollowUps: overdue.length,
      openTasks: tasks.length,
    },
    callsToday: callsToday.map((c) => ({
      id: c.id,
      outcome: c.outcome,
      calledAt: c.calledAt.toISOString(),
      lead: c.lead,
    })),
    overdue: overdue.map((l) => ({
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      mobile: l.mobile,
      nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    })),
    nextFollowUps: nextFollowUps.map((l) => ({
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      mobile: l.mobile,
      nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null,
    })),
    leads,
    bookings: bookings.map((b) => ({
      id: b.id,
      firstName: b.firstName,
      lastName: b.lastName,
      status: b.status,
      startsAt: b.slot.startsAt.toISOString(),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt?.toISOString() ?? null,
      priority: t.priority,
      lead: t.lead,
    })),
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      occurredAt: a.occurredAt.toISOString(),
      lead: a.lead,
    })),
  };
}
