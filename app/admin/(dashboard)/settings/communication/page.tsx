import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { loadAdminCommunicationSettings } from "@/lib/communication/load-admin-communication";
import { toPersianDigits } from "@/lib/persian";
import { CommunicationTestForms } from "./CommunicationTestForms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ارتباطات و پیامک",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-primary" dir="ltr">
        {typeof value === "number" ? toPersianDigits(value) : value}
      </p>
    </div>
  );
}

export default async function AdminCommunicationSettingsPage() {
  const result = await loadAdminCommunicationSettings();

  if (!result.ok) {
    return (
      <>
        <AdminPageHeader
          title="ارتباطات و پیامک"
          description="وضعیت ارائه‌دهنده، OTP و صف پیامک"
          breadcrumbs={[...adminBreadcrumbs.communication]}
          showNotice
          compact
        />
        <div
          role="alert"
          className="admin-card border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800"
        >
          بارگذاری تنظیمات ارتباطات ممکن نشد. اتصال پایگاه داده را بررسی کنید.
        </div>
      </>
    );
  }

  const { provider, otp, templates, queue, failedMessages } = result.data;

  return (
    <>
      <AdminPageHeader
        title="ارتباطات و پیامک"
        description="زیرساخت ارائه‌دهنده خنثی برای پیامک و کد یک‌بارمصرف — کلیدهای API فقط در متغیرهای محیطی هستند"
        breadcrumbs={[...adminBreadcrumbs.communication]}
        showNotice
        compact
      />

      <section className="admin-card mb-6 space-y-4 px-5 py-5" aria-labelledby="provider-heading">
        <h2 id="provider-heading" className="text-base font-bold text-primary">
          وضعیت ارائه‌دهنده
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="ارائه‌دهنده انتخاب‌شده"
            value={provider.name === "smsir" ? "SMS.ir" : provider.name}
          />
          <Stat
            label="فعال بودن ارائه‌دهنده"
            value={provider.enabled ? "فعال" : "غیرفعال"}
          />
          <Stat
            label="STAROS_SMS_ENABLED"
            value={provider.smsEnabledEnv ? "true" : "false"}
          />
          <Stat
            label="مهلت SMS.ir (میلی‌ثانیه)"
            value={provider.secrets.timeoutMs}
          />
        </div>
        <ul className="space-y-1 text-sm leading-7 text-muted">
          <li>
            کلید API:{" "}
            {provider.secrets.apiKeyConfigured
              ? provider.secrets.apiKeyMasked
              : "پیکربندی نشده"}
          </li>
          <li>
            نشانی پایه SMS.ir:{" "}
            {provider.secrets.baseUrlConfigured
              ? provider.secrets.baseUrlValid
                ? "پیکربندی‌شده و معتبر"
                : "پیکربندی‌شده و نامعتبر"
              : "پیش‌فرض امن"}
          </li>
          <li>
            پیکربندی کامل ارائه‌دهنده:{" "}
            {provider.secrets.providerConfigured ? "کامل" : "ناقص"}
          </li>
          <li>
            قالب OTP:{" "}
            {provider.secrets.otpTemplateConfigured ? "شناسه تنظیم شده" : "شناسه تنظیم نشده"}
            {" · "}
            {provider.secrets.otpParameterConfigured ? "پارامتر معتبر" : "پارامتر نامعتبر"}
          </li>
          <li>
            قالب رزرو:{" "}
            {provider.secrets.bookingTemplateConfigured ? "شناسه تنظیم شده" : "شناسه تنظیم نشده"}
            {" · "}
            {provider.secrets.bookingParametersConfigured
              ? "پارامترها معتبر"
              : "پارامترها ناقص"}
          </li>
          <li>
            قالب فرم:{" "}
            {provider.secrets.formTemplateConfigured ? "شناسه تنظیم شده" : "شناسه تنظیم نشده"}
            {" · "}
            {provider.secrets.formParametersConfigured
              ? "پارامترها معتبر"
              : "پارامترها ناقص"}
          </li>
        </ul>
        <p className="text-xs leading-6 text-muted">
          کلید API فقط به‌صورت ماسک‌شده نمایش داده می‌شود و هیچ پاسخ خامی از
          ارائه‌دهنده در این صفحه قرار نمی‌گیرد.
        </p>
      </section>

      <section className="admin-card mb-6 space-y-4 px-5 py-5" aria-labelledby="otp-heading">
        <h2 id="otp-heading" className="text-base font-bold text-primary">
          تنظیمات OTP
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="اعتبار (ثانیه)" value={otp.expirySeconds} />
          <Stat label="فاصله ارسال مجدد (ثانیه)" value={otp.resendCooldownSeconds} />
          <Stat label="حداکثر تلاش" value={otp.maxAttempts} />
        </div>
        <p className="text-xs leading-6 text-muted">
          کدهای یک‌بارمصرف فقط به‌صورت هش ذخیره می‌شوند و هرگز در لاگ یا پایگاه داده
          به‌صورت متن ساده نگهداری نمی‌شوند.
        </p>
      </section>

      <section className="admin-card mb-6 space-y-4 px-5 py-5" aria-labelledby="templates-heading">
        <h2 id="templates-heading" className="text-base font-bold text-primary">
          قالب‌های پیامک
        </h2>
        {templates.length === 0 ? (
          <AdminEmptyState
            title="قالبی تعریف نشده"
            description="قالب‌های booking_confirmation و form_confirmation را می‌توانید بعداً اضافه کنید. تا آن زمان متن پیش‌فرض استفاده می‌شود."
          />
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((template) => (
              <li key={template.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-primary">{template.name}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {template.code}
                    {template.isActive ? "" : " · غیرفعال"}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-7 text-muted">
                  هدف: <span dir="ltr">{template.purpose}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="admin-card mb-6 space-y-4 px-5 py-5"
        aria-labelledby="test-send-heading"
      >
        <div>
          <h2 id="test-send-heading" className="text-base font-bold text-primary">
            ارسال آزمایشی
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            شماره مقصد در سرور نرمال می‌شود. نتیجه، کد، متن پیام و پاسخ خام
            نمایش داده یا ثبت نمی‌شوند.
          </p>
        </div>
        <CommunicationTestForms />
      </section>

      <section className="admin-card mb-6 space-y-4 px-5 py-5" aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="text-base font-bold text-primary">
          خلاصه صف
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="در انتظار" value={queue.pending} />
          <Stat label="در حال ارسال" value={queue.processing} />
          <Stat label="ارسال‌شده" value={queue.sent} />
          <Stat label="ناموفق" value={queue.failed} />
          <Stat label="Dead letter" value={queue.deadLetter} />
        </div>
        <p className="text-xs leading-6 text-muted">
          برای پردازش یک‌باره صف:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]" dir="ltr">
            npm run communication:worker-once
          </code>
        </p>
      </section>

      <section className="admin-card space-y-4 px-5 py-5" aria-labelledby="failed-heading">
        <h2 id="failed-heading" className="text-base font-bold text-primary">
          پیام‌های ناموفق
        </h2>
        {failedMessages.length === 0 ? (
          <p className="text-sm text-muted">پیام ناموفقی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-2 py-2 font-medium">هدف</th>
                  <th className="px-2 py-2 font-medium">موبایل</th>
                  <th className="px-2 py-2 font-medium">وضعیت</th>
                  <th className="px-2 py-2 font-medium">تلاش</th>
                  <th className="px-2 py-2 font-medium">خطا</th>
                </tr>
              </thead>
              <tbody>
                {failedMessages.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="px-2 py-2" dir="ltr">
                      {row.purpose}
                    </td>
                    <td className="px-2 py-2" dir="ltr">
                      {row.toMobileMasked}
                    </td>
                    <td className="px-2 py-2">{row.status}</td>
                    <td className="px-2 py-2">
                      {toPersianDigits(row.attemptCount)}
                    </td>
                    <td className="px-2 py-2 text-muted">
                      {row.lastError ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
