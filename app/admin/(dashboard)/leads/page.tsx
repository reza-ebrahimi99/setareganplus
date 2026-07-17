import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  LeadAssignmentTable,
  type LeadAssignmentTableRow,
} from "@/components/admin/leads/LeadAssignmentTable";
import { adminBreadcrumbs } from "@/content/admin";
import {
  hasPermission,
  normalizeLeadScopeFilter,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";
import { loadLeadOwnerOptions } from "@/lib/crm/lead-owners";
import {
  leadListWhere,
  parseLeadListFilters,
} from "@/lib/crm/lead-list-filters";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { toPersianDigits } from "@/lib/persian";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "متقاضیان و CRM",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const LEADS_PAGE_SIZE = 30;

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePermission("crm.view_assigned");
  await ensureDefaultPipeline(session.organization.id);
  const params = await searchParams;
  const requestedScope =
    typeof params.scope === "string" ? params.scope : undefined;
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const candidatePage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const scope = normalizeLeadScopeFilter(session, requestedScope);
  const filters = parseLeadListFilters({
    scope,
    assignment:
      typeof params.assignment === "string" ? params.assignment : undefined,
    created: typeof params.created === "string" ? params.created : undefined,
    sourceType:
      typeof params.sourceType === "string" ? params.sourceType : undefined,
    outcome: typeof params.outcome === "string" ? params.outcome : undefined,
    ownerUserId: typeof params.owner === "string" ? params.owner : undefined,
  });
  const leadScope = leadListWhere(session, filters);
  const canAssign = hasPermission(session, "crm.assign");
  const canViewAll = hasPermission(session, "crm.view_all");
  const total = await prisma.lead.count({ where: leadScope });
  const pageCount = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
  const page = Math.min(candidatePage, pageCount);

  const [hot, openTasks, recent, ownerOptions] = await Promise.all([
    prisma.lead.count({
      where: {
        ...leadScope,
        scoreBand: { in: ["HOT", "QUALIFIED"] },
      },
    }),
    prisma.crmTask.count({
      where: {
        organizationId: session.organization.id,
        deletedAt: null,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        lead: leadScope,
      },
    }),
    prisma.lead.findMany({
      where: leadScope,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * LEADS_PAGE_SIZE,
      take: LEADS_PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        score: true,
        scoreBand: true,
        source: true,
        stage: { select: { name: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
    }),
    canAssign
      ? loadLeadOwnerOptions({
          organizationId: session.organization.id,
          accessibleBranchIds: session.membership.allBranches
            ? undefined
            : session.membership.branchIds,
        })
      : Promise.resolve([]),
  ]);
  const rows: LeadAssignmentTableRow[] = recent.map((lead) => ({
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    stageName: lead.stage?.name ?? null,
    score: lead.score,
    scoreBand: lead.scoreBand,
    ownerName: lead.owner
      ? `${lead.owner.firstName} ${lead.owner.lastName}`.trim()
      : null,
    source: lead.source,
  }));
  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams({
      scope,
      page: String(targetPage),
    });
    if (filters.assignment) query.set("assignment", filters.assignment);
    if (filters.created) query.set("created", filters.created);
    if (filters.sourceType) query.set("sourceType", filters.sourceType);
    if (filters.outcome) query.set("outcome", filters.outcome);
    if (filters.ownerUserId) query.set("owner", filters.ownerUserId);
    return `/admin/leads?${query.toString()}`;
  };

  return (
    <>
      <AdminPageHeader
        title="متقاضیان و CRM"
        description="فهرست متقاضیان سازمان — برای نمای پایپ‌لاین از تابلوی CRM استفاده کنید"
        breadcrumbs={adminBreadcrumbs.leads}
        compact
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Link href="/admin/crm" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
          تابلوی پایپ‌لاین
        </Link>
        {hasPermission(session, "crm.create_lead") && (
          <Link href="/admin/leads/new" className="rounded-lg border border-border px-4 py-2 text-sm">
            ثبت متقاضی جدید
          </Link>
        )}
        {hasPermission(session, "crm.import_leads") && (
          <Link href="/admin/crm/import" className="rounded-lg border border-border px-4 py-2 text-sm">
            ورود Excel و CSV
          </Link>
        )}
        {hasPermission(session, "automations.manage") && <Link href="/admin/settings/automations" className="rounded-lg border border-border px-4 py-2 text-sm">قوانین اتوماسیون</Link>}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="admin-card px-4 py-3">
          <p className="text-xs text-muted">کل لیدها</p>
          <p className="text-xl font-bold text-primary">{toPersianDigits(total)}</p>
        </div>
        <div className="admin-card px-4 py-3">
          <p className="text-xs text-muted">داغ / واجد شرایط</p>
          <p className="text-xl font-bold text-primary">{toPersianDigits(hot)}</p>
        </div>
        <div className="admin-card px-4 py-3">
          <p className="text-xs text-muted">وظایف باز</p>
          <p className="text-xl font-bold text-primary">{toPersianDigits(openTasks)}</p>
        </div>
      </div>

      <form method="get" className="admin-card mb-4 flex flex-wrap items-end gap-3 px-4 py-3">
        <label className="min-w-52 text-sm">
          <span className="mb-1 block text-muted">دامنه لیدها</span>
          <select
            name="scope"
            defaultValue={scope}
            className="w-full rounded-lg border border-border bg-white px-3 py-2"
          >
            {canViewAll ? <option value="all">همه لیدها</option> : null}
            <option value="mine">لیدهای من</option>
            {canViewAll ? <option value="unassigned">بدون مسئول</option> : null}
          </select>
        </label>
        <label className="min-w-44 text-sm">
          <span className="mb-1 block text-muted">وضعیت تخصیص</span>
          <select
            name="assignment"
            defaultValue={filters.assignment ?? ""}
            className="w-full rounded-lg border border-border bg-white px-3 py-2"
          >
            <option value="">همه</option>
            <option value="assigned">دارای مسئول</option>
          </select>
        </label>
        <label className="min-w-44 text-sm">
          <span className="mb-1 block text-muted">منبع</span>
          <select
            name="sourceType"
            defaultValue={filters.sourceType ?? ""}
            className="w-full rounded-lg border border-border bg-white px-3 py-2"
          >
            <option value="">همه منابع</option>
            <option value="IMPORT">ورود Excel / CSV</option>
            <option value="MANUAL">ثبت دستی</option>
            <option value="FORM">فرم</option>
            <option value="BOOKING">رزرو</option>
          </select>
        </label>
        <label className="min-w-44 text-sm">
          <span className="mb-1 block text-muted">نتیجه</span>
          <select
            name="outcome"
            defaultValue={filters.outcome ?? ""}
            className="w-full rounded-lg border border-border bg-white px-3 py-2"
          >
            <option value="">همه نتایج</option>
            <option value="registered">ثبت‌نام‌شده</option>
            <option value="lost">از دست‌رفته</option>
          </select>
        </label>
        <label className="min-w-40 text-sm">
          <span className="mb-1 block text-muted">زمان ایجاد</span>
          <select
            name="created"
            defaultValue={filters.created ?? ""}
            className="w-full rounded-lg border border-border bg-white px-3 py-2"
          >
            <option value="">همه زمان‌ها</option>
            <option value="today">امروز</option>
          </select>
        </label>
        {canViewAll ? (
          <label className="min-w-52 text-sm">
            <span className="mb-1 block text-muted">مسئول لید</span>
            <select
              name="owner"
              defaultValue={filters.ownerUserId ?? ""}
              className="w-full rounded-lg border border-border bg-white px-3 py-2"
            >
              <option value="">همه مسئولان</option>
              {ownerOptions.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm">
          اعمال فیلتر
        </button>
      </form>

      <LeadAssignmentTable
        key={JSON.stringify(filters)}
        rows={rows}
        owners={ownerOptions.map((owner) => ({ id: owner.id, name: owner.name }))}
        canAssign={canAssign}
        scope={scope}
        filters={filters}
        totalFiltered={total}
      />
      {pageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="صفحه‌بندی لیدها">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-border px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            صفحه قبل
          </Link>
          <span className="text-muted">
            صفحه {toPersianDigits(Math.min(page, pageCount))} از {toPersianDigits(pageCount)}
          </span>
          <Link
            href={pageHref(Math.min(pageCount, page + 1))}
            aria-disabled={page >= pageCount}
            className={`rounded-lg border border-border px-3 py-2 ${page >= pageCount ? "pointer-events-none opacity-50" : ""}`}
          >
            صفحه بعد
          </Link>
        </nav>
      ) : null}
    </>
  );
}
