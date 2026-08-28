import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { permissionsForRole, PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import type { WorkspaceDashboardData } from "@/lib/crm/workspace-reads";
import { composeDashboard } from "@/lib/dashboard/compose";
import {
  formatJalaliDateShort,
  formatJalaliDateTimeShort,
} from "@/lib/datetime/jalali";

export const metadata: Metadata = { title: "میز کار من" };
export const dynamic = "force-dynamic";

function masked(value: string) {
  return value.length > 7 ? `${value.slice(0, 4)}•••${value.slice(-2)}` : "••••";
}

export default async function WorkspacePage() {
  const session = await requirePermission("crm.view_assigned");
  const permissions = session.user.isPlatformAdmin
    ? new Set(PERMISSIONS)
    : new Set(permissionsForRole(session.membership.role));
  const now = new Date();

  const composed = await composeDashboard({
    dashboardId: "advisor",
    ctx: {
      organizationId: session.organization.id,
      viewerUserId: session.user.id,
      membershipId: session.membership.id,
      permissions,
      allBranches: session.membership.allBranches,
      branchIds: session.membership.branchIds,
      from: new Date(now.getTime() - 30 * 86_400_000),
      to: now,
      includeLazy: true,
      session,
    },
  });

  const boardWidget = composed.ok
    ? composed.dashboard.widgets.find((w) => w.id === "workspace_board")
    : undefined;
  const data =
    boardWidget &&
    (boardWidget.status === "ok" || boardWidget.status === "empty")
      ? (boardWidget.data as WorkspaceDashboardData)
      : null;

  const overdue = data?.overdue ?? [];
  const nextFollowUps = data?.nextFollowUps ?? [];
  const leads = data?.leads ?? [];
  const bookings = data?.bookings ?? [];
  const tasks = data?.tasks ?? [];
  const activities = data?.activities ?? [];
  const summary = data?.summary ?? {
    callsToday: 0,
    overdueFollowUps: 0,
    openTasks: 0,
  };

  const leadList = (
    title: string,
    rows: typeof overdue,
  ) => (
    <section className="admin-card p-5">
      <h2 className="font-semibold text-primary">
        {title}{" "}
        <span className="text-xs text-muted">({rows.length})</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {rows.map((lead) => (
          <li
            key={lead.id}
            className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"
          >
            <Link
              href={`/admin/leads/${lead.id}`}
              className="font-medium text-primary"
            >
              {lead.firstName} {lead.lastName}
            </Link>
            <span dir="ltr" className="text-xs text-muted">
              {masked(lead.mobile)}
            </span>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-sm text-muted">موردی وجود ندارد.</li>
        )}
      </ul>
    </section>
  );

  return (
    <>
      <AdminPageHeader
        title="میز کار من"
        description="پیگیری‌های شخصی، تماس‌ها، رزروها و وظایف امروز"
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "میز کار من" },
        ]}
        compact
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="admin-card p-4">
          <p className="text-xs text-muted">تماس‌های امروز</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {summary.callsToday}
          </p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-muted">پیگیری عقب‌افتاده</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {summary.overdueFollowUps}
          </p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs text-muted">وظایف باز</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {summary.openTasks}
          </p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {leadList("تماس‌ها و پیگیری‌های عقب‌افتاده", overdue)}
        {leadList("پیگیری‌های بعدی", nextFollowUps)}
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">لیدهای واگذارشده</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="block rounded-lg border border-border p-3 text-sm"
                >
                  {lead.firstName} {lead.lastName}
                  <span className="mt-1 block text-xs text-muted">
                    امتیاز {lead.score} · {masked(lead.mobile)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">
            رزروهای امروز ({bookings.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {bookings.map((booking) => (
              <li key={booking.id} className="text-sm">
                {booking.firstName} {booking.lastName} ·{" "}
                {formatJalaliDateShort(new Date(booking.startsAt))} ·{" "}
                {booking.status}
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">وظایف باز</h2>
          <ul className="mt-3 space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="text-sm">
                <Link
                  href={`/admin/leads/${task.lead.id}`}
                  className="font-medium"
                >
                  {task.title}
                </Link>{" "}
                · {task.lead.firstName} {task.lead.lastName}
                {task.dueAt
                  ? ` · ${formatJalaliDateTimeShort(new Date(task.dueAt))}`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
        <section className="admin-card p-5">
          <h2 className="font-semibold text-primary">فعالیت‌های اخیر</h2>
          <ul className="mt-3 space-y-2">
            {activities.map((activity) => (
              <li key={activity.id} className="text-sm">
                {activity.title} · {activity.lead.firstName}{" "}
                {activity.lead.lastName} ·{" "}
                {formatJalaliDateTimeShort(new Date(activity.occurredAt))}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
