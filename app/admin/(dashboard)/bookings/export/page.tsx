import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { PrintQueueButton } from "@/components/admin/commerce/PrintQueueButton";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  bookingReservationExportQueryString,
  parseBookingReservationExportFilters,
} from "@/lib/booking/reservation-export-filters";
import {
  loadBookingReservationsForExport,
  loadTodayBookingReservations,
} from "@/lib/booking/reservation-export-query";
import {
  BOOKING_EXPORT_STATUS_LABELS,
  buildBookingExportSummary,
} from "@/lib/booking/reservation-export-summary";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { formatTehranTime24 } from "@/lib/datetime/tehran-zone";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export const metadata: Metadata = { title: "خروجی اکسل رزروها" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DATE_PRESET_OPTIONS = [
  { value: "today", label: "امروز" },
  { value: "tomorrow", label: "فردا" },
  { value: "thisWeek", label: "این هفته" },
  { value: "thisMonth", label: "این ماه" },
] as const;

const inputClass = "rounded-xl border border-border px-3 py-2 text-sm";
const buttonClass =
  "inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary hover:bg-background";

export default async function BookingsExportPage({ searchParams }: Props) {
  const query = await searchParams;
  const session = await requirePermission("booking.view_all");
  const filters = parseBookingReservationExportFilters(query);
  const allowedBranchIds = session.membership.allBranches
    ? null
    : session.membership.branchIds;

  const services = await prisma.bookingService.findMany({
    where: {
      organizationId: session.organization.id,
      deletedAt: null,
      ...(session.membership.allBranches
        ? {}
        : { branchId: { in: session.membership.branchIds } }),
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const [rows, todayRows] = await Promise.all([
    loadBookingReservationsForExport({
      organizationId: session.organization.id,
      allowedBranchIds,
      filters,
    }),
    loadTodayBookingReservations({
      organizationId: session.organization.id,
      allowedBranchIds,
    }),
  ]);
  const summary = buildBookingExportSummary(rows);

  const qs = bookingReservationExportQueryString(filters);
  const exportHref = `/admin/bookings/export.xlsx${qs}`;
  const refreshHref = `/admin/bookings/export${qs}`;

  return (
    <>
      <AdminPageHeader
        title="خروجی اکسل رزروها"
        description="ساخت گزارش مدیریتی حرفه‌ای از رزروهای نوبت‌دهی با فیلتر دلخواه"
        breadcrumbs={adminBreadcrumbs.bookingExport}
        compact
      />

      <div className="mb-5 flex flex-wrap gap-2 print:hidden">
        <Link
          href={exportHref}
          className={`${buttonClass} border-primary bg-primary text-white hover:bg-primary/90`}
        >
          📥 خروجی اکسل
        </Link>
        <PrintQueueButton label="🖨 چاپ برنامه روز" />
        <Link href={refreshHref} className={buttonClass}>
          🔄 بروزرسانی
        </Link>
      </div>

      <form className="admin-card mb-6 grid gap-3 p-4 print:hidden sm:grid-cols-2 lg:grid-cols-4">
        <select name="datePreset" defaultValue={filters.datePreset} className={inputClass}>
          <option value="">بازه دلخواه (تاریخ‌ها را پر کنید)</option>
          {DATE_PRESET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="dateFrom"
          defaultValue={filters.dateFrom}
          placeholder="از تاریخ (مثلاً ۱۴۰۴/۰۱/۰۱)"
          dir="ltr"
          className={inputClass}
        />
        <input
          type="text"
          name="dateTo"
          defaultValue={filters.dateTo}
          placeholder="تا تاریخ (مثلاً ۱۴۰۴/۰۱/۳۰)"
          dir="ltr"
          className={inputClass}
        />
        <select name="serviceId" defaultValue={filters.serviceId} className={inputClass}>
          <option value="">همه خدمت‌ها</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status} className={inputClass}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(BOOKING_EXPORT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="mobile"
          defaultValue={filters.mobile}
          placeholder="جستجوی شماره موبایل"
          dir="ltr"
          className={inputClass}
        />
        <input
          type="text"
          name="studentName"
          defaultValue={filters.studentName}
          placeholder="جستجوی نام دانش‌آموز"
          className={inputClass}
        />
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
          اعمال فیلتر
        </button>
      </form>

      <div className="mb-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6 print:hidden">
        <AdminStatCard label="کل رزروها" value={toPersianDigits(String(summary.total))} />
        <AdminStatCard label="تایید شده" value={toPersianDigits(String(summary.confirmed))} />
        <AdminStatCard label="در انتظار" value={toPersianDigits(String(summary.pending))} />
        <AdminStatCard label="لغو شده" value={toPersianDigits(String(summary.cancelled))} />
        <AdminStatCard label="تکمیل شده" value={toPersianDigits(String(summary.completed))} />
        <AdminStatCard label="عدم حضور" value={toPersianDigits(String(summary.noShow))} />
      </div>

      <p className="mb-8 text-sm text-muted print:hidden">
        {toPersianDigits(String(rows.length))} رزرو مطابق با فیلترهای انتخاب‌شده — فایل
        اکسل دقیقاً همین نتایج را شامل می‌شود.
      </p>

      <section className="hidden print:block">
        <h2 className="mb-3 text-lg font-bold">
          برنامه امروز — {formatJalaliDateShort(new Date())}
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border p-2">ساعت</th>
              <th className="border border-border p-2">نام دانش‌آموز</th>
              <th className="border border-border p-2">موبایل</th>
              <th className="border border-border p-2">خدمت</th>
              <th className="border border-border p-2">وضعیت</th>
              <th className="border border-border p-2">کد رهگیری</th>
            </tr>
          </thead>
          <tbody>
            {todayRows.map((row) => (
              <tr key={row.id}>
                <td className="border border-border p-2">
                  {toPersianDigits(formatTehranTime24(row.startsAt))}
                </td>
                <td className="border border-border p-2">{row.studentName}</td>
                <td className="border border-border p-2" dir="ltr">
                  {toPersianDigits(row.mobile)}
                </td>
                <td className="border border-border p-2">{row.serviceTitle}</td>
                <td className="border border-border p-2">
                  {BOOKING_EXPORT_STATUS_LABELS[row.status]}
                </td>
                <td className="border border-border p-2" dir="ltr">
                  {toPersianDigits(row.trackingCode)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {todayRows.length === 0 ? (
          <p className="mt-3 text-sm">رزروی برای امروز ثبت نشده است.</p>
        ) : null}
      </section>
    </>
  );
}
