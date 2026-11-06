/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa } from "@/lib/format";
import { PageTitle, Panel, Field, Area, Check, ImageInput } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { WEEKDAYS } from "@/lib/consult/constants";
import { J_MONTHS } from "@/lib/jalali";
import { tehranDateKey, tehranKeyToJalali } from "@/lib/consult/time";
import { addException, addWindow, deleteException, deleteWindow, removeConsultant, saveConsultant } from "../actions";

export const dynamic = "force-dynamic";

export default async function ConsultantEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; e?: string }> }) {
  await requirePerm("consult.consultants");
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const m = isNew ? null : await prisma.consultant.findUnique({ where: { id }, include: { windows: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }, exceptions: { orderBy: { date: "asc" } } } });
  if (!isNew && !m) notFound();
  const nowJ = tehranKeyToJalali(tehranDateKey(new Date()));
  return (
    <>
      <PageTitle title={isNew ? "مشاور جدید" : m!.name} sub="بدون بازهٔ زمانی، این مشاور در سایت دیده نمی‌شود." />
      {sp.ok && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">ذخیره شد.</p>}
      {sp.e && <p className="mb-4 rounded-xl bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">{sp.e}</p>}
      <form action={saveConsultant} className="space-y-6">
        <input type="hidden" name="id" value={id} />
        <Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نام" name="name" defaultValue={m?.name} required />
            <Field label="تخصص" name="specialty" defaultValue={m?.specialty} required hint="مثلاً برنامه‌ریزی کنکور. خالی نگذارید." />
            <div className="md:col-span-2"><Area label="معرفی کوتاه" name="bio" defaultValue={m?.bio} rows={4} /></div>
            <ImageInput label="عکس عمومی" name="photo" current={m?.photo} />
            <Field label="ترتیب" name="sortOrder" type="number" defaultValue={m?.sortOrder ?? 10} hint="عدد کوچک‌تر در «سریع‌ترین» وقتی بار نوبت‌ها برابر است جلوتر است." />
            <div className="flex flex-wrap gap-4 md:col-span-2">
              <Check label="فعال و قابل نمایش" name="active" defaultChecked={m?.active ?? false} />
              <Check label="صفحهٔ مشاورهٔ رایگان" name="offersPublic" defaultChecked={m?.offersPublic ?? false} />
              <Check label="جلسهٔ ویژهٔ دانش‌آموزان" name="offersSpecial" defaultChecked={m?.offersSpecial ?? false} />
              <Check label="آنلاین" name="offersOnline" defaultChecked={m?.offersOnline ?? false} />
              <Check label="حضوری" name="offersInPerson" defaultChecked={m?.offersInPerson ?? false} />
            </div>
          </div>
          <div className="mt-6"><SubmitButton>ذخیرهٔ مشخصات</SubmitButton></div>
        </Panel>
      </form>
      {!isNew && m && (
        <div className="mt-6 grid gap-6">
          <Panel title="برنامهٔ هفتگی">
            <p className="mb-3 text-xs leading-6 text-muted">شنبه = اولین روز. اگر این فهرست خالی بماند، هیچ روزی برای این مشاور ساخته نمی‌شود. ظرفیت خالی یعنی یک نفر در هر نوبت. طول خالی یعنی همان پیش‌فرض تنظیمات (معمولاً ۳۰ دقیقه).</p>
            {m.windows.length === 0 ? <p className="text-sm text-muted">بازه‌ای ثبت نشده.</p> : (
              <ul className="mb-4 divide-y divide-line text-sm">
                {m.windows.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 py-2">
                    <span>{WEEKDAYS[w.weekday]} · <span dir="ltr">{w.startTime}–{w.endTime}</span> · {w.audience === "BOTH" ? "هر دو" : w.audience === "PUBLIC" ? "عمومی" : "ویژه"} · {w.online ? "آنلاین " : ""}{w.inPerson ? "حضوری" : ""} · ظرفیت {fa(w.capacity ?? 1)}</span>
                    <form action={deleteWindow}><input type="hidden" name="consultantId" value={m.id} /><input type="hidden" name="windowId" value={w.id} /><button className="text-xs font-bold text-gc">حذف</button></form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addWindow} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="consultantId" value={m.id} />
              <label className="block"><span className="label">روز</span><select name="weekday" className="input">{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
              <label className="block"><span className="label">مخاطب</span><select name="audience" className="input" defaultValue="BOTH"><option value="BOTH">هر دو صفحه</option><option value="PUBLIC">فقط مشاورهٔ رایگان</option><option value="SPECIAL">فقط جلسهٔ ویژه</option></select></label>
              <label className="block"><span className="label">از ساعت</span><input name="startTime" type="time" required className="input" dir="ltr" /></label>
              <label className="block"><span className="label">تا ساعت</span><input name="endTime" type="time" required className="input" dir="ltr" /></label>
              <Field label="طول هر نوبت (دقیقه، اختیاری)" name="slotMinutes" />
              <Field label="ظرفیت هر نوبت (اختیاری)" name="capacity" hint="خالی = ۱" />
              <div className="flex gap-4 sm:col-span-2"><Check label="آنلاین" name="online" defaultChecked /><Check label="حضوری" name="inPerson" defaultChecked /></div>
              <SubmitButton>افزودن بازه</SubmitButton>
            </form>
          </Panel>
          <Panel title="تعطیلی و روز اضافه">
            {m.exceptions.length === 0 ? <p className="mb-3 text-sm text-muted">استثنایی ثبت نشده.</p> : (
              <ul className="mb-4 divide-y divide-line text-sm">
                {m.exceptions.map((e) => {
                  const j = tehranKeyToJalali(e.date);
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                      <span>{e.kind === "OFF" ? "تعطیل" : "اضافه"} · {fa(j.jd)} {J_MONTHS[j.jm - 1]} {fa(j.jy)} {e.startTime ? <span dir="ltr">{e.startTime}–{e.endTime}</span> : "کل روز"} {e.note ? `· ${e.note}` : ""}</span>
                      <form action={deleteException}><input type="hidden" name="consultantId" value={m.id} /><input type="hidden" name="exceptionId" value={e.id} /><button className="text-xs font-bold text-gc">حذف</button></form>
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={addException} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="consultantId" value={m.id} />
              <Field label="سال" name="jy" type="number" defaultValue={nowJ.jy} required />
              <label className="block"><span className="label">ماه</span><select name="jm" defaultValue={nowJ.jm} className="input">{J_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select></label>
              <Field label="روز" name="jd" type="number" defaultValue={nowJ.jd} required />
              <label className="block"><span className="label">نوع</span><select name="kind" className="input"><option value="OFF">تعطیل</option><option value="EXTRA">ساعت اضافه</option></select></label>
              <label className="block"><span className="label">از (برای کل روز خالی)</span><input name="startTime" type="time" className="input" dir="ltr" /></label>
              <label className="block"><span className="label">تا</span><input name="endTime" type="time" className="input" dir="ltr" /></label>
              <label className="block sm:col-span-3"><span className="label">یادداشت</span><input name="note" className="input" /></label>
              <div className="flex gap-4 sm:col-span-3"><Check label="آنلاین" name="online" defaultChecked /><Check label="حضوری" name="inPerson" defaultChecked /></div>
              <label className="block sm:col-span-3"><span className="label">مخاطب</span><select name="audience" className="input" defaultValue="BOTH"><option value="BOTH">هر دو صفحه</option><option value="PUBLIC">فقط مشاورهٔ رایگان</option><option value="SPECIAL">فقط جلسهٔ ویژه</option></select></label>
              <SubmitButton>ثبت استثنا</SubmitButton>
            </form>
          </Panel>
          <form action={removeConsultant}>
            <input type="hidden" name="id" value={m.id} />
            <SubmitButton className="text-sm font-semibold text-gc" confirm="اگر نوبتی نداشته باشد حذف می‌شود.">حذف مشاور</SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}
