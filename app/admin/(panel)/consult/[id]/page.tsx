import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm, can } from "@/lib/auth";
import { fa, jalaliDateTime, prettyPhone } from "@/lib/format";
import { PageTitle, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { adminSlotChoices } from "@/lib/consult/availability";
import { AUDIENCE_LABEL, MODE_LABEL, PROOF_LABEL, ROLE_LABEL, STATUS_LABEL, gradeLabel, type Audience } from "@/lib/consult/constants";
import { getConsultSettings } from "@/lib/consult/settings";
import { SOURCE_LABEL } from "@/lib/analytics/classify";
import { cancel, confirm, move, resend } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsultDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; e?: string }> }) {
  const me = await requirePerm("consult.view");
  const { id } = await params;
  const sp = await searchParams;
  const row = await prisma.consultation.findUnique({
    where: { id },
    include: { consultant: true, student: true, notices: { orderBy: { createdAt: "desc" } } },
  });
  if (!row) notFound();
  const manage = can(me, "consult.manage");
  const settings = await getConsultSettings();
  const slots = manage && row.status !== "CANCELLED" ? await adminSlotChoices(row.audience as Audience, settings.horizonDays) : [];
  const noticeLabel = { CREATED: "ثبت", CANCELLED: "لغو", MOVED: "جابه‌جایی", REMINDER: "یادآوری" } as const;
  return (
    <>
      <PageTitle title={row.studentName} sub={row.code} action={<Link href="/admin/consult" className="text-sm font-bold text-edu">بازگشت به فهرست</Link>} />
      {sp.ok && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">انجام شد.</p>}
      {sp.e && <p className="mb-4 rounded-xl bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">{sp.e}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="جزئیات نوبت">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Item k="وضعیت" v={STATUS_LABEL[row.status as keyof typeof STATUS_LABEL] ?? row.status} />
            <Item k="زمان" v={jalaliDateTime(row.startsAt)} />
            <Item k="نوع" v={`${AUDIENCE_LABEL[row.audience as keyof typeof AUDIENCE_LABEL] ?? row.audience} · ${MODE_LABEL[row.mode as keyof typeof MODE_LABEL] ?? row.mode}`} />
            <Item k="مشاور" v={`${row.consultant.name}${row.consultant.specialty ? ` · ${row.consultant.specialty}` : ""}`} />
            <Item k="رزروکننده" v={`${row.bookerName} (${ROLE_LABEL[row.bookerRole as keyof typeof ROLE_LABEL] ?? row.bookerRole})`} />
            <Item k="دانش‌آموز" v={`${row.studentName} · ${gradeLabel(row.grade)}`} />
            <Item k="موبایل" v={prettyPhone(row.mobile)} />
            <Item k="اثبات هویت" v={PROOF_LABEL[row.phoneProof as keyof typeof PROOF_LABEL] ?? row.phoneProof} />
            <Item k="منبع" v={row.source ? `${SOURCE_LABEL[row.source] ?? row.source}${row.campaign ? ` / ${row.campaign}` : ""}` : "ثبت نشده"} />
            <Item k="دانش‌آموز ثبت‌شده" v={row.student ? `${row.student.fullName}${row.student.active ? "" : " (غیرفعال)"}` : "—"} />
          </dl>
          {row.note && <p className="mt-4 rounded-xl bg-ivory px-4 py-3 text-sm leading-7">{row.note}</p>}
          {row.cancelReason && <p className="mt-3 text-sm text-muted">دلیل لغو: {row.cancelReason}</p>}
          {row.rescheduledFrom && <p className="mt-2 text-xs text-muted">زمان قبلی: {jalaliDateTime(row.rescheduledFrom)}</p>}
        </Panel>
        <div className="space-y-6">
          {manage && row.status !== "CANCELLED" && (
            <Panel title="اقدام">
              <div className="space-y-4">
                {row.status === "PENDING" && (
                  <form action={confirm} className="space-y-2">
                    <input type="hidden" name="id" value={row.id} />
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="notify" className="accent-navy" />ارسال پیامک ثبت</label>
                    <SubmitButton>تأیید نوبت</SubmitButton>
                  </form>
                )}
                <form action={cancel} className="space-y-2">
                  <input type="hidden" name="id" value={row.id} />
                  <label className="block"><span className="label">دلیل لغو (اختیاری)</span><input name="reason" className="input" /></label>
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="notify" defaultChecked className="accent-navy" />ارسال پیامک لغو</label>
                  <SubmitButton className="rounded-full bg-gc px-5 py-2 text-sm font-bold text-white" confirm="این نوبت لغو شود و جایش آزاد شود؟">لغو نوبت</SubmitButton>
                </form>
                <form action={move} className="space-y-2 border-t border-line pt-4">
                  <input type="hidden" name="id" value={row.id} />
                  <label className="block">
                    <span className="label">جابه‌جایی به یک ساعت واقعی</span>
                    <select name="slot" className="input" defaultValue="">
                      <option value="">انتخاب از وقت‌های باز</option>
                      {slots.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </label>
                  {slots.length === 0 && <p className="text-xs text-muted">وقت بازی در افق فعلی نیست. اول برنامهٔ مشاور را در پنل تنظیم کنید.</p>}
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="notify" defaultChecked className="accent-navy" />ارسال پیامک جابه‌جایی</label>
                  <SubmitButton>جابه‌جایی و تأیید</SubmitButton>
                </form>
              </div>
            </Panel>
          )}
          <Panel title="صندوق پیامک">
            {row.notices.length === 0 ? <p className="text-sm text-muted">پیامی در صف نیست.</p> : (
              <ul className="space-y-3 text-sm">
                {row.notices.map((n) => (
                  <li key={n.id} className="rounded-xl bg-ivory px-3 py-2">
                    <p className="flex justify-between gap-2 font-bold"><span>{noticeLabel[n.kind as keyof typeof noticeLabel] ?? n.kind}</span><span className={n.status === "SENT" ? "text-emerald-700" : n.status === "FAILED" ? "text-gc" : "text-muted"}>{n.status === "SENT" ? "ارسال شد" : n.status === "FAILED" ? "خطا" : n.status === "SKIPPED" ? "ارسال نشد" : n.status === "QUEUED" || n.status === "SENDING" ? "در صف" : n.status}</span></p>
                    <p className="mt-1 text-xs leading-6 text-muted">{n.body}</p>
                    {n.detail && <p className="text-xs text-gc">{n.detail}</p>}
                    {manage && (n.status === "FAILED" || n.status === "SKIPPED" || n.status === "QUEUED") && (
                      <form action={resend} className="mt-1">
                        <input type="hidden" name="booking" value={row.id} />
                        <input type="hidden" name="notice" value={n.id} />
                        <button className="text-xs font-bold text-edu">ارسال دوباره</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-6 text-muted">اگر قالب SMS.ir یا شمارهٔ خط تنظیم نشده باشد، متن اینجا می‌ماند و پیامک نمی‌رود. رمز یا کلید پیامک در سایت ذخیره نمی‌شود.</p>
          </Panel>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">ثبت‌شده در {jalaliDateTime(row.createdAt)} · کد {fa(row.code)}</p>
    </>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold text-navy">{v}</dd></div>;
}
