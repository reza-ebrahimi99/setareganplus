import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  addLeadNoteAction,
  assignLeadOwnerAction,
  cancelLeadTaskAction,
  changeLeadStageAction,
  completeLeadTaskAction,
  createLeadTaskAction,
} from "@/app/admin/(dashboard)/leads/actions";
import { adminBreadcrumbs } from "@/content/admin";
import { loadLeadDetail } from "@/lib/crm/load-lead-detail";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پرونده متقاضی",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadLeadDetail(id);

  if (!result.ok && result.notFound) notFound();
  if (!result.ok) {
    return (
      <>
        <AdminPageHeader title="پرونده متقاضی" breadcrumbs={[...adminBreadcrumbs.leadDetail]} compact />
        <div role="alert" className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          بارگذاری پرونده ممکن نشد.
        </div>
      </>
    );
  }

  const lead = result.data;

  return (
    <>
      <AdminPageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        description="پرونده عملیاتی پذیرش — امتیاز، وظایف، رزرو و تایم‌لاین"
        breadcrumbs={[...adminBreadcrumbs.leadDetail]}
        compact
      />

      <div className="mb-4">
        <Link href="/admin/crm" className="text-sm text-primary hover:underline">
          بازگشت به تابلوی CRM
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="admin-card space-y-3 px-5 py-5 lg:col-span-1">
          <h2 className="font-bold text-primary">هویت</h2>
          <ul className="space-y-1 text-sm leading-7 text-muted">
            <li>موبایل: <span dir="ltr">{lead.mobileMasked}</span></li>
            <li>شعبه: {lead.branchName}</li>
            <li>منبع: {lead.source} ({lead.sourceType})</li>
            <li>مرحله: {lead.stageName ?? "—"}</li>
            <li>مسئول: {lead.ownerName ?? "—"}</li>
            <li>پیگیری بعدی: {lead.nextFollowUpLabel ?? "—"}</li>
            <li>آخرین تماس: {lead.lastContactLabel ?? "—"}</li>
            {lead.lostReason ? <li>علت از دست رفتن: {lead.lostReason}</li> : null}
          </ul>

          <div className="rounded-lg border border-border bg-background px-3 py-3">
            <p className="text-sm font-semibold text-primary">
              امتیاز: {toPersianDigits(lead.score)} · {lead.scoreBandLabel}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {lead.scoreBreakdown.map((item) => (
                <li key={item.key}>
                  {item.label}: {toPersianDigits(item.points)}
                </li>
              ))}
            </ul>
          </div>

          <form action={changeLeadStageAction} className="space-y-2 border-t border-border pt-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">تغییر مرحله</span>
              <select name="stageId" defaultValue={lead.stageId ?? ""} className="w-full rounded-lg border border-border px-3 py-2">
                {lead.stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">علت از دست رفتن (در صورت نیاز)</span>
              <input name="lostReason" className="w-full rounded-lg border border-border px-3 py-2" />
            </label>
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-white">ذخیره مرحله</button>
          </form>

          <form action={assignLeadOwnerAction} className="space-y-2 border-t border-border pt-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">مسئول</span>
              <select name="ownerUserId" defaultValue={lead.ownerId ?? ""} className="w-full rounded-lg border border-border px-3 py-2">
                <option value="">بدون مسئول</option>
                {lead.owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">تخصیص</button>
          </form>
        </section>

        <section className="space-y-5 lg:col-span-2">
          <div className="admin-card px-5 py-5">
            <h2 className="mb-3 font-bold text-primary">وظایف</h2>
            <form action={createLeadTaskAction} className="mb-4 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input name="title" placeholder="عنوان وظیفه" required className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-white">افزودن</button>
            </form>
            <ul className="divide-y divide-border">
              {lead.tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-primary">{task.title}</p>
                    <p className="text-xs text-muted">
                      {task.displayStatus}
                      {task.dueLabel ? ` · ${task.dueLabel}` : ""}
                      {task.assignee ? ` · ${task.assignee}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={completeLeadTaskAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" className="rounded border border-border px-2 py-1 text-xs">تکمیل</button>
                    </form>
                    <form action={cancelLeadTaskAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" className="rounded border border-border px-2 py-1 text-xs">لغو</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-card px-5 py-5">
            <h2 className="mb-3 font-bold text-primary">رزروها و فرم‌ها</h2>
            <p className="mb-2 text-xs text-muted">پیامک‌های صف‌شده مرتبط: {toPersianDigits(lead.smsQueuedCount)}</p>
            <ul className="mb-3 space-y-2 text-sm">
              {lead.bookings.map((b) => (
                <li key={b.id}>
                  رزرو {b.trackingCode} · {b.status} · {b.whenLabel}
                </li>
              ))}
              {lead.bookings.length === 0 ? <li className="text-muted">رزروی ثبت نشده</li> : null}
            </ul>
            <ul className="space-y-1 text-sm text-muted">
              {lead.submissions.map((s) => (
                <li key={s.id}>پاسخ فرم · {s.submittedAtLabel}</li>
              ))}
            </ul>
          </div>

          <div className="admin-card px-5 py-5">
            <h2 className="mb-3 font-bold text-primary">یادداشت و تایم‌لاین</h2>
            <form action={addLeadNoteAction} className="mb-4 flex gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input name="note" required placeholder="یادداشت جدید" className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-white">ثبت</button>
            </form>
            <ol className="space-y-3">
              {lead.timeline.map((item) => (
                <li key={item.id} className="border-r-2 border-primary/30 pr-3 text-sm">
                  <p className="font-medium text-primary">{item.title}</p>
                  {item.summary ? <p className="text-muted">{item.summary}</p> : null}
                  <p className="text-xs text-muted">
                    {item.whenLabel}
                    {item.actor ? ` · ${item.actor}` : ""}
                    {` · ${item.activityType}`}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
