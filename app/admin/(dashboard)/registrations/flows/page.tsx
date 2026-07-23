import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { adminBreadcrumbs } from "@/content/admin";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { requirePermission } from "@/lib/auth/require-admin";
import { toPersianDigits } from "@/lib/persian";
import { listRegistrationFlows } from "@/lib/registration/flows/admin";
import {
  FLOW_LIFECYCLE_LABELS,
  FLOW_PAYMENT_MODE_LABELS,
} from "@/lib/registration/flows/constants";
import { formatRials } from "@/lib/registration/format";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جریان‌های ثبت‌نام",
};

export default async function AdminRegistrationFlowsPage() {
  const session = await requirePermission("registration_flows.view");
  const canManage = hasPermission(session, "registration_flows.manage");
  const flows = await listRegistrationFlows(session.organization.id);

  const createAction = canManage ? (
    <Link
      href="/admin/registrations/flows/new"
      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92"
    >
      جریان جدید
    </Link>
  ) : null;

  return (
    <>
      <AdminPageHeader
        title="محصولات و جریان‌های ثبت‌نام"
        description="مدیریت جریان محصول/خدمت (ثبت‌نام، کتاب، لباس فرم، اردو و …)، اتصال فرم، پرداخت و انتشار"
        breadcrumbs={adminBreadcrumbs.registrationFlows}
        compact
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          هر جریان یک صفحه عمومی در مسیر{" "}
          <span dir="ltr" className="font-mono text-xs">
            /register/[slug]
          </span>{" "}
          دارد.
        </p>
        {createAction}
      </div>

      <AdminSection
        title="جریان‌ها"
        headingId="admin-registration-flows-heading"
        description="وضعیت انتشار، پرداخت و تعداد ثبت‌نام‌های هر جریان."
      >
        {flows.length === 0 ? (
          <AdminEmptyState
            title="هنوز جریان ثبت‌نامی تعریف نشده"
            description="یک جریان جدید بسازید، فرم منتشرشده متصل کنید و سپس منتشر کنید."
            action={createAction ?? undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted">
                  <th className="px-3 py-2 font-medium">عنوان</th>
                  <th className="px-3 py-2 font-medium">وضعیت</th>
                  <th className="px-3 py-2 font-medium">پرداخت</th>
                  <th className="px-3 py-2 font-medium">فرم</th>
                  <th className="px-3 py-2 font-medium">ثبت‌نام</th>
                  <th className="px-3 py-2 font-medium">به‌روزرسانی</th>
                  <th className="px-3 py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((flow) => (
                  <tr
                    key={flow.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-primary">{flow.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted" dir="ltr">
                        {flow.slug}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {FLOW_LIFECYCLE_LABELS[flow.lifecycle]}
                    </td>
                    <td className="px-3 py-3">
                      <p>{FLOW_PAYMENT_MODE_LABELS[flow.paymentMode]}</p>
                      {flow.paymentAmountRials > 0 ? (
                        <p className="text-xs text-muted">
                          {formatRials(flow.paymentAmountRials)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {flow.formTitle ?? "—"}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {toPersianDigits(String(flow.registrationCount))}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      {formatJalaliDateTimeShort(flow.updatedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/registrations/flows/${flow.id}`}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        ویرایش
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </>
  );
}
