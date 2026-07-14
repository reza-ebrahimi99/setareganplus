"use client";

import { useActionState } from "react";
import { updateDraftFormBookingAction } from "@/app/admin/(dashboard)/forms/settings-actions";
import type { FormBookingSettings } from "@/lib/booking/form-booking-settings";

export function FormBookingConnection({ formId, editable, services, settings }: { formId: string; editable: boolean; services: Array<{ id: string; title: string }>; settings: FormBookingSettings }) {
  const [state, action, pending] = useActionState(updateDraftFormBookingAction, {});
  return <section className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold text-primary">اتصال به رزرو نوبت</h2><p className="mt-1 text-xs leading-6 text-muted">در صورت فعال‌سازی، فرم عمومی می‌تواند خدمت نوبت‌دهی انتخاب‌شده را نمایش دهد.</p>
    {state.error ? <p className="mt-3 text-sm text-red-700">{state.error}</p> : state.success ? <p className="mt-3 text-sm text-emerald-700">{state.success}</p> : null}
    {editable ? <form action={action} className="mt-4 space-y-3"><input type="hidden" name="formId" value={formId}/><label className="flex gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={settings.enabled}/>فعال‌سازی رزرو نوبت برای این فرم</label><select name="serviceId" defaultValue={settings.serviceId ?? ""} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"><option value="">انتخاب خدمت</option>{services.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><select name="requireTiming" defaultValue={settings.requireTiming} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"><option value="optional">اختیاری</option><option value="before_submit">پیش از ثبت فرم</option><option value="after_submit">پس از ثبت فرم</option></select><div className="grid gap-2 sm:grid-cols-2">{([["allowWaitingList","فعال‌سازی لیست انتظار",settings.allowWaitingList],["allowAdvisorSelection","انتخاب مشاور",settings.allowAdvisorSelection],["allowBranchSelection","انتخاب شعبه",settings.allowBranchSelection],["showRemainingCapacity","نمایش ظرفیت باقی‌مانده",settings.showRemainingCapacity]] as const).map(([name,label,value])=><label key={name} className="flex gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={value}/>{label}</label>)}</div><button disabled={pending} className="rounded-xl bg-primary px-4 py-2 text-sm text-white">{pending ? "در حال ذخیره…" : "ذخیره اتصال"}</button></form> : <p className="mt-3 text-sm text-muted">نسخه پیش‌نویس وجود ندارد؛ تنظیمات فقط قابل مشاهده‌اند.</p>}
  </section>;
}
