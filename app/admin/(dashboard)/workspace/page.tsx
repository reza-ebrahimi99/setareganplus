import type { Metadata } from "next";
import Link from "next/link";
import { CrmTaskStatus } from "@/generated/prisma/enums";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { hasPermission, scopedLeadWhere } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  formatJalaliDateShort,
  formatJalaliDateTimeShort,
} from "@/lib/datetime/jalali";
import { getTehranParts, tehranDayBoundsUtc } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "میز کار من" };
export const dynamic = "force-dynamic";

function masked(value: string) {
  return value.length > 7 ? `${value.slice(0, 4)}•••${value.slice(-2)}` : "••••";
}

export default async function WorkspacePage() {
  const session = await requirePermission("crm.view_assigned");
  const organizationId = session.organization.id;
  const now = new Date();
  const today = getTehranParts(now);
  const { startUtc: start, endUtc: end } = tehranDayBoundsUtc(today.year, today.month, today.day);
  const leadScope = scopedLeadWhere(session);
  const branchIds = session.membership.branchIds;
  const bookingSlotScope = hasPermission(session, "booking.view_all")
    ? session.membership.allBranches ? {} : { branchId: { in: branchIds } }
    : { advisor: { userId: session.user.id } };

  const [callsToday, overdue, nextFollowUps, leads, bookings, tasks, activities] =
    await Promise.all([
      prisma.crmCallLog.findMany({
        where: { organizationId, membershipId: session.membership.id, calledAt: { gte: start, lt: end } },
        orderBy: { calledAt: "desc" },
        take: 20,
        select: { id: true, outcome: true, calledAt: true, lead: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.lead.findMany({
        where: { ...leadScope, nextFollowUpAt: { lt: now } },
        orderBy: { nextFollowUpAt: "asc" },
        take: 20,
        select: { id: true, firstName: true, lastName: true, mobile: true, nextFollowUpAt: true },
      }),
      prisma.lead.findMany({
        where: { ...leadScope, nextFollowUpAt: { gte: now } },
        orderBy: { nextFollowUpAt: "asc" },
        take: 20,
        select: { id: true, firstName: true, lastName: true, mobile: true, nextFollowUpAt: true },
      }),
      prisma.lead.findMany({
        where: leadScope,
        orderBy: { updatedAt: "desc" },
        take: 24,
        select: { id: true, firstName: true, lastName: true, mobile: true, score: true },
      }),
      prisma.bookingReservation.findMany({
        where: {
          organizationId,
          deletedAt: null,
          slot: { startsAt: { gte: start, lt: end }, ...bookingSlotScope },
        },
        orderBy: { slot: { startsAt: "asc" } },
        take: 30,
        select: { id: true, firstName: true, lastName: true, status: true, slot: { select: { startsAt: true } } },
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
        select: { id: true, title: true, dueAt: true, priority: true, lead: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.crmActivity.findMany({
        where: { organizationId, lead: leadScope },
        orderBy: { occurredAt: "desc" },
        take: 20,
        select: { id: true, title: true, occurredAt: true, lead: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

  const leadList = (title: string, rows: typeof overdue) => (
    <section className="admin-card p-5">
      <h2 className="font-semibold text-primary">{title} <span className="text-xs text-muted">({rows.length})</span></h2>
      <ul className="mt-3 space-y-2">
        {rows.map((lead) => <li key={lead.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm">
          <Link href={`/admin/leads/${lead.id}`} className="font-medium text-primary">{lead.firstName} {lead.lastName}</Link>
          <span dir="ltr" className="text-xs text-muted">{masked(lead.mobile)}</span>
        </li>)}
        {rows.length === 0 && <li className="text-sm text-muted">موردی وجود ندارد.</li>}
      </ul>
    </section>
  );

  return (
    <>
      <AdminPageHeader title="میز کار من" description="پیگیری‌های شخصی، تماس‌ها، رزروها و وظایف امروز" breadcrumbs={[{ label: "مدیریت", href: "/admin" }, { label: "میز کار من" }]} compact />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="admin-card p-4"><p className="text-xs text-muted">تماس‌های امروز</p><p className="mt-1 text-2xl font-bold text-primary">{callsToday.length}</p></div>
        <div className="admin-card p-4"><p className="text-xs text-muted">پیگیری عقب‌افتاده</p><p className="mt-1 text-2xl font-bold text-red-700">{overdue.length}</p></div>
        <div className="admin-card p-4"><p className="text-xs text-muted">وظایف باز</p><p className="mt-1 text-2xl font-bold text-primary">{tasks.length}</p></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {leadList("تماس‌ها و پیگیری‌های عقب‌افتاده", overdue)}
        {leadList("پیگیری‌های بعدی", nextFollowUps)}
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">لیدهای واگذارشده</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">{leads.map((lead) => <li key={lead.id}><Link href={`/admin/leads/${lead.id}`} className="block rounded-lg border border-border p-3 text-sm">{lead.firstName} {lead.lastName}<span className="mt-1 block text-xs text-muted">امتیاز {lead.score} · {masked(lead.mobile)}</span></Link></li>)}</ul>
        </section>
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">رزروهای امروز ({bookings.length})</h2>
          <ul className="mt-3 space-y-2">{bookings.map((booking) => <li key={booking.id} className="text-sm">{booking.firstName} {booking.lastName} · {formatJalaliDateShort(booking.slot.startsAt)} · {booking.status}</li>)}</ul>
        </section>
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">وظایف باز</h2>
          <ul className="mt-3 space-y-2">{tasks.map((task) => <li key={task.id} className="text-sm"><Link href={`/admin/leads/${task.lead.id}`} className="font-medium">{task.title}</Link> · {task.lead.firstName} {task.lead.lastName}{task.dueAt ? ` · ${formatJalaliDateTimeShort(task.dueAt)}` : ""}</li>)}</ul>
        </section>
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">فعالیت‌های اخیر</h2>
          <ul className="mt-3 space-y-2">{activities.map((activity) => <li key={activity.id} className="text-sm">{activity.title} · {activity.lead.firstName} {activity.lead.lastName} · {formatJalaliDateTimeShort(activity.occurredAt)}</li>)}</ul>
        </section>
      </div>
    </>
  );
}
