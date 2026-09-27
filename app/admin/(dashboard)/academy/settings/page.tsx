import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertPermission } from "@/lib/auth/permissions";
import { getAcademySettings } from "@/lib/academy/config";
import { updateAcademySettingsAction } from "@/app/admin/(dashboard)/academy/settings/actions";

export default async function AdminAcademySettingsPage() {
  const session = await requireAdminSession();
  assertPermission(session, "academy.manage");
  const settings = await getAcademySettings(session.organization.id);

  return (
    <div dir="rtl" className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">تنظیمات آکادمی</h1>
      <form action={updateAcademySettingsAction} className="space-y-4 rounded-xl border bg-surface p-6">
        <label className="block text-sm">
          عنوان
          <input
            name="title"
            defaultValue={settings.title}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          حداکثر دستگاه
          <input
            name="maxDevices"
            type="number"
            min={1}
            defaultValue={settings.maxDevices}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            dir="ltr"
          />
        </label>
        <label className="block text-sm">
          پخش هم‌زمان
          <input
            name="maxConcurrentStreams"
            type="number"
            min={1}
            defaultValue={settings.maxConcurrentStreams}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            dir="ltr"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="watermarkEnabled"
            defaultChecked={settings.watermarkEnabled}
          />
          واترمارک فعال
        </label>
        <label className="block text-sm">
          تلفن پشتیبانی
          <input
            name="supportPhone"
            defaultValue={settings.supportPhone ?? ""}
            dir="ltr"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-white text-sm">
          ذخیره
        </button>
      </form>
    </div>
  );
}
