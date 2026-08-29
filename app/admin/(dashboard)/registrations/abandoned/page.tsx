import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import { listRegistrations } from "@/lib/registration/admin-list";
import {
  REGISTRATION_STATUS_LABELS,
  WIZARD_STEP_LABELS,
} from "@/lib/registration/status";
import { markNeedsCallAction } from "@/app/admin/(dashboard)/registrations/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت‌نام‌های ناقص",
};

export default async function AbandonedRegistrationsPage() {
  const session = await requirePermission("registrations.view");
  const { rows, total } = await listRegistrations({
    organizationId: session.organization.id,
    filters: { incompleteOnly: true },
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="گزارش ثبت‌نام‌های ناقص و رهاشده"
        description="ثبت‌نام‌هایی که پیش از تکمیل رها شده‌اند — با آخرین مرحله، درصد پیشرفت و اقدام سریع."
        breadcrumbs={adminBreadcrumbs.registrationAbandoned}
        compact
      />

      <p className="text-sm text-muted">
        تعداد: {toPersianDigits(String(total))}
      </p>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-background/70 text-xs text-muted">
            <tr>
              <th className="px-3 py-3 text-right font-medium">متقاضی</th>
              <th className="px-3 py-3 text-right font-medium">فرم</th>
              <th className="px-3 py-3 text-right font-medium">آخرین مرحله</th>
              <th className="px-3 py-3 text-right font-medium">تکمیل</th>
              <th className="px-3 py-3 text-right font-medium">آخرین فعالیت</th>
              <th className="px-3 py-3 text-right font-medium">دلیل</th>
              <th className="px-3 py-3 text-right font-medium">اقدامات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted">
                  مورد ناقصی ثبت نشده است.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{row.applicant}</div>
                    <div className="text-xs text-muted" dir="ltr">
                      {toPersianDigits(row.mobile)}
                    </div>
                  </td>
                  <td className="px-3 py-3">{row.formTitle}</td>
                  <td className="px-3 py-3">
                    {WIZARD_STEP_LABELS[row.lastCompletedStep] ??
                      toPersianDigits(String(row.lastCompletedStep))}
                  </td>
                  <td className="px-3 py-3">
                    {toPersianDigits(`${row.completionPercent}٪`)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatJalaliDateTimeShort(row.lastActivityAt)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {row.abandonedReason ||
                      REGISTRATION_STATUS_LABELS[row.status]}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/registrations/${row.id}`}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        جزئیات
                      </Link>
                      {row.leadId ? (
                        <Link
                          href={`/admin/leads/${row.leadId}`}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          CRM
                        </Link>
                      ) : null}
                      <form action={markNeedsCallAction}>
                        <input
                          type="hidden"
                          name="registrationId"
                          value={row.id}
                        />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-danger hover:underline"
                        >
                          علامت تماس
                        </button>
                      </form>
                      <Link
                        href={`/ghalamchi/register/wizard?resume=1`}
                        className="text-xs text-muted hover:underline"
                        title="ادامه توسط متقاضی با توکن ذخیره‌شده"
                      >
                        ادامه
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
