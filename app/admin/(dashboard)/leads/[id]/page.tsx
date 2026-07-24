import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CrmCallOutcome } from "@/generated/prisma/enums";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  FailedLeadSmsResendAction,
  LeadSmsAction,
} from "@/components/admin/crm/LeadSmsAction";
import { LeadCallFollowUpFields } from "@/components/admin/crm/LeadCallFollowUpFields";
import { LeadOwnerBadge } from "@/components/admin/crm/LeadOwnerBadge";
import { LeadOwnerSelect } from "@/components/admin/crm/LeadOwnerSelect";
import { LeadStageControl } from "@/components/admin/crm/LeadStageControl";
import {
  addLeadNoteAction,
  assignLeadOwnerAction,
  assignLeadBranchAction,
  assignLeadTaskAction,
  cancelLeadTaskAction,
  completeLeadTaskAction,
  createLeadTaskAction,
  logLeadCallAction,
} from "@/app/admin/(dashboard)/leads/actions";
import { adminBreadcrumbs } from "@/content/admin";
import { loadLeadDetail } from "@/lib/crm/load-lead-detail";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پرونده متقاضی",
};

type PageProps = { params: Promise<{ id: string }> };

const CALL_OUTCOME_LABELS: Record<CrmCallOutcome, string> = {
  ANSWERED: "پاسخ داده شد",
  NO_ANSWER: "بدون پاسخ",
  BUSY: "مشغول",
  OFF: "خاموش",
  WRONG_NUMBER: "شماره اشتباه",
  FOLLOW_UP_REQUIRED: "نیازمند پیگیری",
  CONSULTATION_BOOKED: "مشاوره رزرو شد",
  NOT_INTERESTED: "عدم تمایل",
  REGISTERED: "ثبت‌نام شد",
  OTHER: "سایر",
};

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
            <li className="flex items-center gap-2">
              <span>مسئول:</span>
              <LeadOwnerBadge ownerName={lead.ownerName} />
            </li>
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

          {lead.permissions.changeStage && (
            <LeadStageControl
              key={lead.stageId ?? "unassigned"}
              leadId={lead.id}
              currentStageId={lead.stageId}
              stages={lead.stages}
              canMarkTerminal={lead.permissions.terminal}
            />
          )}
          {lead.permissions.sendSms && (
            <LeadSmsAction
              leadId={lead.id}
              leadName={`${lead.firstName} ${lead.lastName}`.trim()}
              mobile={lead.mobileTel}
              mobileValid={lead.mobileValid}
              templates={lead.smsTemplates}
            />
          )}

          {lead.permissions.assign && <form action={assignLeadOwnerAction} className="space-y-2 border-t border-border pt-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-sm">
              <span className="mb-1 block text-muted">مسئول</span>
              <LeadOwnerSelect
                name="ownerUserId"
                defaultValue={lead.ownerId ?? ""}
                owners={lead.owners}
                className="w-full"
              />
            </label>
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">تخصیص</button>
          </form>}
          {lead.permissions.assign && <form action={assignLeadBranchAction} className="space-y-2 border-t border-border pt-3">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-sm"><span className="mb-1 block text-muted">شعبه</span><select name="branchId" defaultValue={lead.branchId} className="w-full rounded-lg border border-border px-3 py-2">{lead.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">تغییر شعبه</button>
          </form>}
        </section>

        <section className="space-y-5 lg:col-span-2">
          {lead.permissions.call && <div className="admin-card px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-primary">ثبت تماس</h2>
              <a href={`tel:${lead.mobileTel}`} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">شروع تماس</a>
            </div>
            <form action={logLeadCallAction} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
              <select name="outcome" required className="rounded-lg border border-border px-3 py-2 text-sm">
                {Object.values(CrmCallOutcome).map((outcome) => <option key={outcome} value={outcome}>{CALL_OUTCOME_LABELS[outcome]}</option>)}
              </select>
              <input name="durationSeconds" type="number" min="0" max="86400" placeholder="مدت تماس (ثانیه)" className="rounded-lg border border-border px-3 py-2 text-sm" />
              <textarea name="note" maxLength={1000} placeholder="یادداشت تماس" className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2" />
              <LeadCallFollowUpFields />
              {lead.permissions.changeStage && <label className="text-sm"><span className="mb-1 block text-muted">تغییر مرحله (اختیاری)</span><select name="stageId" defaultValue="" className="w-full rounded-lg border border-border px-3 py-2"><option value="">بدون تغییر</option>{lead.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="createTask" value="true" />برای پیگیری وظیفه بساز</label>
              {lead.permissions.terminal && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="terminalConfirmed" value="true" />انتقال نهایی را تأیید می‌کنم</label>}
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white sm:col-span-2">ثبت نتیجه تماس</button>
            </form>
          </div>}
          <div className="admin-card px-5 py-5">
            <h2 className="mb-3 font-bold text-primary">وظایف</h2>
            {lead.permissions.createTask && <form action={createLeadTaskAction} className="mb-4 grid gap-2 sm:grid-cols-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <input name="title" placeholder="عنوان وظیفه" required className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-white">افزودن</button>
            </form>}
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
                  {lead.permissions.assign && <form action={assignLeadTaskAction} className="flex gap-1">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <select name="assignedToUserId" defaultValue={task.assignedToUserId ?? ""} className="rounded border border-border px-2 py-1 text-xs"><option value="">بدون مسئول</option>{lead.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>
                    <button className="rounded border border-border px-2 py-1 text-xs">واگذاری</button>
                  </form>}
                  {lead.permissions.completeTask && <div className="flex gap-2">
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
                  </div>}
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
            <ul className="mb-4 space-y-1 text-sm text-muted">
              {lead.submissions.map((s) => (
                <li key={s.id}>پاسخ فرم · {s.submittedAtLabel}</li>
              ))}
            </ul>
            <h3 className="mb-2 text-xs font-semibold text-muted">وضعیت ثبت‌نام متصل</h3>
            <ul className="space-y-2 text-sm">
              {lead.registrations.map((r) => (
                <li key={r.id} className="rounded-lg border border-border/80 px-3 py-2">
                  <Link
                    href={`/admin/registrations/${r.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {r.registrationNumber}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    وضعیت: {r.statusLabel} · پرداخت: {r.paymentLabel}
                  </p>
                  <p className="text-xs text-muted">
                    جریان: {r.flowKey}
                    {r.productTitle ? ` · ${r.productTitle}` : ""}
                  </p>
                  <p className="text-xs text-muted">تاریخ ثبت‌نام: {r.createdAtLabel}</p>
                  {r.promotionUsed ? (
                    <p className="text-xs">پروموشن استفاده‌شده: {r.promotionUsed}</p>
                  ) : null}
                  {r.referralUsed ? (
                    <p className="text-xs">معرف: {r.referralUsed}</p>
                  ) : null}
                  {r.acquisitionSource ? (
                    <p className="text-xs text-muted">منبع ثبت‌نام: {r.acquisitionSource}</p>
                  ) : null}
                </li>
              ))}
              {lead.registrations.length === 0 ? (
                <li className="text-muted">ثبت‌نامی متصل نیست</li>
              ) : null}
            </ul>
          </div>

          <div className="admin-card px-5 py-5">
            <h2 className="mb-3 font-bold text-primary">یادداشت و تایم‌لاین</h2>
            {lead.permissions.addNote && <form action={addLeadNoteAction} className="mb-4 flex gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input name="note" required placeholder="یادداشت جدید" className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-white">ثبت</button>
            </form>}
            <ol className="space-y-3">
              {lead.timeline.map((item) => (
                <li key={item.id} className="border-r-2 border-primary/30 pr-3 text-sm">
                  <p className="font-medium text-primary">
                    {item.activityType === "SMS_QUEUED" ? (
                      <span aria-hidden="true" className="ml-1">✉</span>
                    ) : null}
                    {item.title}
                  </p>
                  {item.summary ? <p className="text-muted">{item.summary}</p> : null}
                  <p className="text-xs text-muted">
                    {item.whenLabel}
                    {item.actor ? ` · ${item.actor}` : ""}
                    {` · ${item.activityType}`}
                  </p>
                  {lead.permissions.sendSms &&
                  item.smsStatus === "failed" &&
                  item.smsMessageId ? (
                    <FailedLeadSmsResendAction
                      leadId={lead.id}
                      messageId={item.smsMessageId}
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
