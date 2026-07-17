import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CrmKanbanViewport } from "@/components/admin/crm/CrmKanbanViewport";
import { LeadOwnerBadge } from "@/components/admin/crm/LeadOwnerBadge";
import { LeadSmsAction } from "@/components/admin/crm/LeadSmsAction";
import { LeadStageControl } from "@/components/admin/crm/LeadStageControl";
import { adminBreadcrumbs } from "@/content/admin";
import { loadCrmPipelineBoard } from "@/lib/crm/load-crm-board";
import { toPersianDigits } from "@/lib/persian";
import { LeadScoreBand, LeadSourceType } from "@/generated/prisma/enums";
import type { LeadScopeFilter } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تابلوی CRM",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

export default async function AdminCrmBoardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const scoreBandParam = readParam(params, "band");
  const sourceTypeParam = readParam(params, "source");
  const filters = {
    scope: readParam(params, "scope") as LeadScopeFilter | undefined,
    ownerUserId: readParam(params, "owner"),
    stageId: readParam(params, "stage"),
    sourceType:
      sourceTypeParam &&
      (Object.values(LeadSourceType) as string[]).includes(sourceTypeParam)
        ? (sourceTypeParam as LeadSourceType)
        : undefined,
    scoreBand:
      scoreBandParam &&
      (Object.values(LeadScoreBand) as string[]).includes(scoreBandParam)
        ? (scoreBandParam as LeadScoreBand)
        : undefined,
    branchId: readParam(params, "branch"),
    followUpOverdue: readParam(params, "overdue") === "1",
  };

  const result = await loadCrmPipelineBoard(filters);

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader
          title="تابلوی CRM"
          description="پایپ‌لاین پذیرش"
          breadcrumbs={[...adminBreadcrumbs.crm]}
          compact
        />
        <div role="alert" className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <p>بارگذاری تابلوی CRM ممکن نشد.</p>
          {process.env.NODE_ENV === "development" ? (
            <pre
              className="mt-3 overflow-x-auto whitespace-pre-wrap text-left text-xs"
              dir="ltr"
            >
              {result.error.stack ?? result.error.message}
            </pre>
          ) : null}
        </div>
      </>
    );
  }

  const {
    columns,
    owners,
    branches,
    scope,
    totalLeads,
    permissions,
    smsTemplates,
  } = result.data;
  const stageOptions = columns.map((column) => ({
    id: column.stageId,
    name: column.stageName,
    stageType: column.stageType,
    isTerminal: column.isTerminal,
  }));

  return (
    <>
      <AdminPageHeader
        title="تابلوی CRM"
        description="مراحل پذیرش، امتیاز، پیگیری و رزرو — داده‌های سازمان فعلی"
        breadcrumbs={[...adminBreadcrumbs.crm]}
        compact
      />

      <form className="admin-card mb-5 grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="text-sm">
          <span className="mb-1 block text-muted">دامنه لیدها</span>
          <select name="scope" defaultValue={scope} className="w-full rounded-lg border border-border bg-white px-3 py-2">
            {permissions.viewAll ? <option value="all">همه لیدها</option> : null}
            <option value="mine">لیدهای من</option>
            {permissions.viewAll ? <option value="unassigned">بدون مسئول</option> : null}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">مسئول</span>
          <select name="owner" defaultValue={filters.ownerUserId ?? ""} className="w-full rounded-lg border border-border bg-white px-3 py-2">
            <option value="">همه مسئولان</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">باند امتیاز</span>
          <select name="band" defaultValue={filters.scoreBand ?? ""} className="w-full rounded-lg border border-border bg-white px-3 py-2">
            <option value="">همه</option>
            <option value="COLD">سرد</option>
            <option value="WARM">گرم</option>
            <option value="HOT">داغ</option>
            <option value="QUALIFIED">واجد شرایط</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">شعبه</span>
          <select name="branch" defaultValue={filters.branchId ?? ""} className="w-full rounded-lg border border-border bg-white px-3 py-2">
            <option value="">همه</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm">
          <input type="checkbox" name="overdue" value="1" defaultChecked={filters.followUpOverdue} />
          <span>فقط پیگیری سررسید گذشته</span>
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">اعمال فیلتر</button>
        </div>
      </form>

      <p className="mb-4 text-sm text-muted">
        تعداد لیدهای نمایش‌داده‌شده: {toPersianDigits(totalLeads)} (حداکثر ۲۰۰)
      </p>

      {totalLeads === 0 ? (
        <AdminEmptyState
          title="هنوز لیدی در پایپ‌لاین نیست"
          description="با فعال‌سازی «ساخت لید از فرم» یا ثبت رزرو، متقاضیان اینجا ظاهر می‌شوند."
        />
      ) : (
        <div className="w-full min-w-0 max-w-full">
          {/* Desktop board */}
          <CrmKanbanViewport>
            {columns.map((col) => (
              <section
                key={col.stageId}
                className="admin-card flex w-72 min-w-72 shrink-0 flex-col px-3 py-3"
                aria-label={col.stageName}
              >
                <header className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2">
                  <h2 className="text-sm font-bold text-primary">{col.stageName}</h2>
                  <span className="text-xs text-muted" dir="ltr">
                    {toPersianDigits(col.leads.length)}
                  </span>
                </header>
                <ul className="space-y-2">
                  {col.leads.map((lead) => (
                    <li key={lead.id} className="rounded-lg border border-border bg-background p-3">
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                        {lead.firstName} {lead.lastName}
                      </Link>
                      <p className="mt-1 text-xs text-muted" dir="ltr">{lead.mobileMasked}</p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">{lead.scoreBandLabel} · {toPersianDigits(lead.score)}</span>
                        <LeadOwnerBadge ownerName={lead.ownerName} compact />
                        {lead.overdueTaskCount > 0 ? (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">
                            سررسید: {toPersianDigits(lead.overdueTaskCount)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[11px] text-muted">
                        منبع: {lead.source}
                        {lead.nextFollowUpLabel ? ` · پیگیری: ${lead.nextFollowUpLabel}` : ""}
                        {lead.lastActivityLabel ? ` · فعالیت: ${lead.lastActivityLabel}` : ""}
                      </p>
                      {permissions.changeStage ? (
                        <LeadStageControl
                          key={lead.stageId ?? "unassigned"}
                          leadId={lead.id}
                          currentStageId={lead.stageId ?? col.stageId}
                          stages={stageOptions}
                          canMarkTerminal={permissions.terminal}
                          compact
                        />
                      ) : null}
                      {permissions.sendSms ? (
                        <LeadSmsAction
                          leadId={lead.id}
                          leadName={`${lead.firstName} ${lead.lastName}`.trim()}
                          mobile={lead.mobile}
                          mobileValid={lead.mobileValid}
                          templates={smsTemplates}
                          compact
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </CrmKanbanViewport>

          {/* Mobile list fallback */}
          <div className="space-y-3 lg:hidden">
            {columns.flatMap((col) =>
              col.leads.map((lead) => (
                <article key={lead.id} className="admin-card px-4 py-3">
                  <p className="text-xs text-muted">{col.stageName}</p>
                  <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-primary">
                    {lead.firstName} {lead.lastName}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {lead.scoreBandLabel} · {toPersianDigits(lead.score)}
                  </p>
                  <div className="mt-2">
                    <LeadOwnerBadge ownerName={lead.ownerName} compact />
                  </div>
                  {permissions.changeStage ? (
                    <LeadStageControl
                      key={lead.stageId ?? "unassigned"}
                      leadId={lead.id}
                      currentStageId={lead.stageId ?? col.stageId}
                      stages={stageOptions}
                      canMarkTerminal={permissions.terminal}
                      compact
                    />
                  ) : null}
                  {permissions.sendSms ? (
                    <LeadSmsAction
                      leadId={lead.id}
                      leadName={`${lead.firstName} ${lead.lastName}`.trim()}
                      mobile={lead.mobile}
                      mobileValid={lead.mobileValid}
                      templates={smsTemplates}
                      compact
                    />
                  ) : null}
                </article>
              )),
            )}
          </div>
        </div>
      )}
    </>
  );
}
