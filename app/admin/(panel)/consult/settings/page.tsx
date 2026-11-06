import { redirect } from "next/navigation";
import { requirePerm, logAction } from "@/lib/auth";
import { b, s } from "@/lib/admin";
import { PageTitle, Panel, Field, Area, Check } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { getConsultSettings, saveConsultSettings } from "@/lib/consult/settings";
import { parseConsultSettings } from "@/lib/consult/settings-parse";

export const dynamic = "force-dynamic";

export default async function ConsultSettings({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("consult.settings");
  const { ok } = await searchParams;
  const cur = await getConsultSettings();

  async function save(fd: FormData) {
    "use server";
    const who = await requirePerm("consult.settings");
    const num = (k: string) => s(fd, k);
    const next = parseConsultSettings({
      publicOpen: b(fd, "publicOpen"),
      specialOpen: b(fd, "specialOpen"),
      slotMinutes: num("slotMinutes"),
      horizonDays: num("horizonDays"),
      minNoticeMinutes: num("minNoticeMinutes"),
      reminderEnabled: b(fd, "reminderEnabled"),
      reminderHoursBefore: num("reminderHoursBefore"),
      otpTemplateId: num("otpTemplateId"),
      createdTemplateId: num("createdTemplateId"),
      cancelledTemplateId: num("cancelledTemplateId"),
      movedTemplateId: num("movedTemplateId"),
      reminderTemplateId: num("reminderTemplateId"),
      smsCreated: s(fd, "smsCreated"),
      smsCancelled: s(fd, "smsCancelled"),
      smsMoved: s(fd, "smsMoved"),
      smsReminder: s(fd, "smsReminder"),
    });
    await saveConsultSettings(next);
    await logAction(who, "consult.settings", "ذخیرهٔ تنظیمات مشاوره");
    redirect("/admin/consult/settings?ok=1");
  }

  return (
    <>
      <PageTitle title="تنظیمات مشاوره" sub="متن پیامک و بازهٔ رزرو. برنامهٔ هیچ مشاوری اینجا ساخته نمی‌شود." />
      {ok && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">ذخیره شد.</p>}
      <form action={save} className="space-y-6">
        <Panel title="صفحه و زمان">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 sm:col-span-2">
              <Check label="صفحهٔ مشاورهٔ رایگان باز باشد" name="publicOpen" defaultChecked={cur.publicOpen} />
              <Check label="صفحهٔ جلسهٔ ویژه باز باشد" name="specialOpen" defaultChecked={cur.specialOpen} />
              <Check label="یادآوری پیش از جلسه (با دستور زمان‌بندی)" name="reminderEnabled" defaultChecked={cur.reminderEnabled} />
            </div>
            <Field label="طول پیش‌فرض هر نوبت (دقیقه)" name="slotMinutes" type="number" defaultValue={cur.slotMinutes} hint="۱۰ تا ۱۲۰. هر بازه می‌تواند طول خودش را داشته باشد." />
            <Field label="افق رزرو (روز)" name="horizonDays" type="number" defaultValue={cur.horizonDays} hint="۱ تا ۶۰. دورتر از این روزی نشان داده نمی‌شود." />
            <Field label="حداقل فاصله تا شروع (دقیقه)" name="minNoticeMinutes" type="number" defaultValue={cur.minNoticeMinutes} />
            <Field label="یادآوری، چند ساعت قبل" name="reminderHoursBefore" type="number" defaultValue={cur.reminderHoursBefore} />
          </div>
        </Panel>
        <Panel title="پیامک SMS.ir">
          <p className="mb-4 text-sm leading-7 text-muted">
            کلید API همان <span dir="ltr">SMSIR_API_KEY</span> فروشگاه است و در این صفحه نوشته نمی‌شود. اگر شناسهٔ قالب Verify را بگذارید، پارامترها <span dir="ltr">NAME DATE TIME MODE CONSULTANT CODE</span> هستند و هر کدام حداکثر ۲۵ نویسه می‌رود.
            اگر قالب خالی باشد و <span dir="ltr">SMSIR_LINE_NUMBER</span> در محیط سرور باشد، متن پایین عیناً ارسال می‌شود. هیچ‌کدام نباشد، متن در صندوق نوبت می‌ماند.
            قالب ورود با پارامتر <span dir="ltr">CODE</span> است. در تولید، بدون این قالب رزرو عمومی انجام نمی‌شود.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="قالب کد تأیید (CODE)" name="otpTemplateId" defaultValue={cur.otpTemplateId ?? ""} dir="ltr" />
            <Field label="قالب ثبت نوبت" name="createdTemplateId" defaultValue={cur.createdTemplateId ?? ""} dir="ltr" />
            <Field label="قالب لغو" name="cancelledTemplateId" defaultValue={cur.cancelledTemplateId ?? ""} dir="ltr" />
            <Field label="قالب جابه‌جایی" name="movedTemplateId" defaultValue={cur.movedTemplateId ?? ""} dir="ltr" />
            <Field label="قالب یادآوری" name="reminderTemplateId" defaultValue={cur.reminderTemplateId ?? ""} dir="ltr" />
          </div>
          <div className="mt-4 grid gap-4">
            <Area label="متن ثبت" name="smsCreated" defaultValue={cur.smsCreated} rows={3} hint="جایگاه‌ها: {name} {student} {date} {time} {mode} {consultant} {code} {grade}" />
            <Area label="متن لغو" name="smsCancelled" defaultValue={cur.smsCancelled} rows={3} />
            <Area label="متن جابه‌جایی" name="smsMoved" defaultValue={cur.smsMoved} rows={3} />
            <Area label="متن یادآوری" name="smsReminder" defaultValue={cur.smsReminder} rows={3} />
          </div>
        </Panel>
        <SubmitButton>ذخیرهٔ تنظیمات</SubmitButton>
      </form>
      <p className="mt-4 text-xs leading-6 text-muted">یادآوری خودکار با <span dir="ltr">npm run consult:remind</span> هر ۱۵ دقیقه. تا وقتی کلید بالا خاموش است پیامی برای یادآوری ساخته نمی‌شود. دستور دقیق در DEPLOY.md است. متغیر <span dir="ltr">CONSULT_ALLOW_DEV_OTP</span> را روی سرور واقعی روشن نکنید.</p>
    </>
  );
}
