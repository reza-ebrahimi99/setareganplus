import type { Metadata } from "next";
import Link from "next/link";
import { AdminMetricGrid } from "@/components/admin/AdminMetricGrid";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { toPersianDigits } from "@/lib/persian";
import {
  listRegistrations,
  loadRegistrationDashboardCounts,
  parseRegistrationListFilters,
} from "@/lib/registration/admin-list";
import { listRegistrationCatalogs } from "@/lib/registration/catalog-registry";
import {
  REGISTRATION_PAYMENT_LABELS,
  REGISTRATION_STATUS_LABELS,
  WIZARD_STEP_LABELS,
} from "@/lib/registration/status";
import {
  RegistrationPaymentStatus,
  RegistrationProductType,
  RegistrationStatus,
} from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت‌نام‌ها",
};

const PAGE_SIZE = 25;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePermission("registrations.view");
  const params = await searchParams;
  const filters = parseRegistrationListFilters(params);
  const requestedPage =
    typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const candidatePage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const [counts, listed, catalogs] = await Promise.all([
    loadRegistrationDashboardCounts(session.organization.id),
    listRegistrations({
      organizationId: session.organization.id,
      filters,
      page: 1,
      pageSize: PAGE_SIZE,
    }),
    Promise.resolve(listRegistrationCatalogs()),
  ]);

  const pageCount = Math.max(1, Math.ceil(listed.total / PAGE_SIZE));
  const page = Math.min(candidatePage, pageCount);
  const { rows, total } =
    page === 1
      ? listed
      : await listRegistrations({
          organizationId: session.organization.id,
          filters,
          page,
          pageSize: PAGE_SIZE,
        });

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value && key !== "page") {
        query.set(key, value);
      }
    }
    query.set("page", String(target));
    return `/admin/registrations?${query.toString()}`;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مرکز مدیریت ثبت‌نام‌ها"
        description="پیگیری ثبت‌نام‌های آنلاین، موارد ناقص، پرداخت و تأیید مدارک — مستقل از فرم‌ساز."
        breadcrumbs={adminBreadcrumbs.registrations}
        compact
      />

      <AdminMetricGrid
        compact
        heading="نمای وضعیت ثبت‌نام"
        headingId="reg-metrics"
        items={[
          {
            label: "ثبت‌نام‌های جدید",
            value: toPersianDigits(String(counts.newCount)),
            icon: "users",
            hint: "وضعیت جدید",
          },
          {
            label: "ناقص / رهاشده",
            value: toPersianDigits(String(counts.incomplete)),
            icon: "clipboard",
            hint: "نیاز به پیگیری",
          },
          {
            label: "نیاز به تماس",
            value: toPersianDigits(String(counts.needsCall)),
            icon: "message",
          },
          {
            label: "در انتظار پرداخت",
            value: toPersianDigits(String(counts.waitingPayment)),
            icon: "clock",
          },
          {
            label: "در انتظار تأیید",
            value: toPersianDigits(String(counts.underReview)),
            icon: "clipboard",
          },
          {
            label: "تکمیل / تأییدشده",
            value: toPersianDigits(String(counts.approved)),
            icon: "clipboard",
          },
          {
            label: "امروز",
            value: toPersianDigits(String(counts.today)),
            icon: "users",
          },
          {
            label: "مدارک ناقص",
            value: toPersianDigits(String(counts.waitingDocuments)),
            icon: "clock",
          },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/registrations/abandoned"
          className="inline-flex min-h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:bg-background"
        >
          گزارش ثبت‌نام‌های ناقص
        </Link>
      </div>

      <form
        method="get"
        className="admin-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <label className="space-y-1 text-xs text-muted sm:col-span-2">
          جستجو
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="نام، موبایل، کد ملی، شماره ثبت‌نام"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
          />
        </label>
        <label className="space-y-1 text-xs text-muted">
          فرم / جریان
          <select
            name="form"
            defaultValue={filters.flowKey ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">همه</option>
            {catalogs.map((c) => (
              <option key={c.flowKey} value={c.flowKey}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted">
          نوع ثبت‌نام
          <select
            name="productType"
            defaultValue={filters.productType ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">همه</option>
            {Object.values(RegistrationProductType).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted">
          وضعیت
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">همه</option>
            {Object.values(RegistrationStatus).map((value) => (
              <option key={value} value={value}>
                {REGISTRATION_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted">
          پرداخت
          <select
            name="payment"
            defaultValue={filters.paymentStatus ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
          >
            <option value="">همه</option>
            {Object.values(RegistrationPaymentStatus).map((value) => (
              <option key={value} value={value}>
                {REGISTRATION_PAYMENT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted">
          از تاریخ (شمسی)
          <input
            name="from"
            defaultValue={filters.fromJalali ?? ""}
            placeholder="1405/01/01"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
            dir="ltr"
          />
        </label>
        <label className="space-y-1 text-xs text-muted">
          تا تاریخ (شمسی)
          <input
            name="to"
            defaultValue={filters.toJalali ?? ""}
            placeholder="1405/12/29"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
            dir="ltr"
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2">
          <button
            type="submit"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white"
          >
            اعمال فیلتر
          </button>
          <Link
            href="/admin/registrations"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm"
          >
            پاک کردن
          </Link>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-background/70 text-xs text-muted">
            <tr>
              <th className="px-3 py-3 text-right font-medium">شماره</th>
              <th className="px-3 py-3 text-right font-medium">متقاضی</th>
              <th className="px-3 py-3 text-right font-medium">فرم</th>
              <th className="px-3 py-3 text-right font-medium">موبایل</th>
              <th className="px-3 py-3 text-right font-medium">مرحله</th>
              <th className="px-3 py-3 text-right font-medium">تکمیل</th>
              <th className="px-3 py-3 text-right font-medium">وضعیت</th>
              <th className="px-3 py-3 text-right font-medium">پرداخت</th>
              <th className="px-3 py-3 text-right font-medium">ایجاد</th>
              <th className="px-3 py-3 text-right font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted">
                  ثبت‌نامی با این فیلترها یافت نشد.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/70 last:border-0 hover:bg-background/50"
                >
                  <td className="px-3 py-3 font-medium" dir="ltr">
                    {toPersianDigits(row.registrationNumber)}
                  </td>
                  <td className="px-3 py-3">{row.applicant}</td>
                  <td className="px-3 py-3">{row.formTitle}</td>
                  <td className="px-3 py-3" dir="ltr">
                    {toPersianDigits(row.mobile)}
                  </td>
                  <td className="px-3 py-3">
                    {WIZARD_STEP_LABELS[row.currentStep] ??
                      toPersianDigits(String(row.currentStep))}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex min-w-12 justify-center rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {toPersianDigits(`${row.completionPercent}٪`)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {REGISTRATION_STATUS_LABELS[row.status]}
                  </td>
                  <td className="px-3 py-3">
                    {REGISTRATION_PAYMENT_LABELS[row.paymentStatus]}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatJalaliDateTimeShort(row.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/registrations/${row.id}`}
                      className="text-xs font-semibold text-secondary hover:underline"
                    >
                      جزئیات
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <p>
          مجموع: {toPersianDigits(String(total))} · صفحه{" "}
          {toPersianDigits(String(page))} از {toPersianDigits(String(pageCount))}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5"
            >
              قبلی
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5"
            >
              بعدی
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
