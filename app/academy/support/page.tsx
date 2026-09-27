import { AcademyShell } from "@/components/academy/AcademyShell";
import { getAcademyOrganizationId, getAcademySettings } from "@/lib/academy/config";

export const metadata = { title: "پشتیبانی" };

export default async function AcademySupportPage() {
  const organizationId = await getAcademyOrganizationId();
  const settings = await getAcademySettings(organizationId);

  return (
    <AcademyShell activePath="/support">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">پشتیبانی</h1>
        <div className="academy-card mt-8 space-y-4 p-8 text-sm leading-relaxed text-muted">
          {settings.supportPhone ? (
            <p>
              تلفن:{" "}
              <span dir="ltr" className="text-primary">
                {settings.supportPhone}
              </span>
            </p>
          ) : null}
          {settings.supportEmail ? (
            <p>
              ایمیل:{" "}
              <span dir="ltr" className="text-primary">
                {settings.supportEmail}
              </span>
            </p>
          ) : null}
          {settings.supportNote ? <p>{settings.supportNote}</p> : null}
          {!settings.supportPhone && !settings.supportEmail && !settings.supportNote ? (
            <p>
              اطلاعات تماس پشتیبانی از طریق پنل مدیریت آکادمی قابل تنظیم است. برای
              هماهنگی می‌توانید از کانال‌های رسمی مجموعه ستارگان پلاس استفاده کنید.
            </p>
          ) : null}
        </div>
      </div>
    </AcademyShell>
  );
}
