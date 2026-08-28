import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookingExportStatCard } from "@/components/admin/bookings/BookingExportStatCard";
import { ExportExcelButton } from "@/components/admin/bookings/ExportExcelButton";
import { PrintQueueButton } from "@/components/admin/commerce/PrintQueueButton";
import { adminBreadcrumbs } from "@/content/admin";
import { requirePermission } from "@/lib/auth/require-admin";
import {
  bookingReservationExportQueryString,
  parseBookingReservationExportFilters,
  type BookingExportDatePreset,
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

const DATE_CHIPS: ReadonlyArray<{ value: BookingExportDatePreset | ""; label: string }> = [
  { value: "today", label: "امروز" },
  { value: "tomorrow", label: "فردا" },
  { value: "thisWeek", label: "این هفته" },
  { value: "thisMonth", label: "این ماه" },
  { value: "", label: "همه" },
];

const inputClass =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition focus:border-secondary/60 focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-medium text-muted";
const toolbarButtonClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-medium text-primary transition hover:bg-background";

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
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
        }
      `}</style>

      <AdminPageHeader
        title="خروجی اکسل رزروها"
        description="ساخت گزارش مدیریتی حرفه‌ای از رزروهای نوبت‌دهی با فیلتر دلخواه"
        breadcrumbs={adminBreadcrumbs.bookingExport}
        compact
      />

      <div className="admin-card mb-6 flex flex-wrap items-center justify-between gap-3 p-4 print:hidden">
        <div>
          <p className="text-sm font-semibold text-primary">
            {toPersianDigits(String(rows.length))} رزرو مطابق با فیلترهای فعلی
          </p>
          <p className="mt-0.5 text-xs text-muted">
            فایل اکسل دقیقاً همین نتایج را شامل می‌شود.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportExcelButton href={exportHref} />
          <PrintQueueButton label="🖨 چاپ برنامه روز" />
          <Link href={refreshHref} className={toolbarButtonClass}>
            🔄 بروزرسانی
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6 print:hidden">
        <BookingExportStatCard
          tone="total"
          label="کل رزروها"
          value={toPersianDigits(String(summary.total))}
          subtitle="مطابق فیلتر فعلی"
        />
        <BookingExportStatCard
          tone="confirmed"
          label="تایید شده"
          value={toPersianDigits(String(summary.confirmed))}
          subtitle="آماده حضور"
        />
        <BookingExportStatCard
          tone="pending"
          label="در انتظار"
          value={toPersianDigits(String(summary.pending))}
          subtitle="نیازمند پیگیری"
        />
        <BookingExportStatCard
          tone="cancelled"
          label="لغو شده"
          value={toPersianDigits(String(summary.cancelled))}
          subtitle="لغوشده توسط مراجعه‌کننده یا مرکز"
        />
        <BookingExportStatCard
          tone="completed"
          label="تکمیل شده"
          value={toPersianDigits(String(summary.completed))}
          subtitle="جلسه برگزار شد"
        />
        <BookingExportStatCard
          tone="noShow"
          label="عدم حضور"
          value={toPersianDigits(String(summary.noShow))}
          subtitle="مراجعه‌نشده"
        />
      </div>

      <form className="admin-card mb-8 space-y-4 p-5 print:hidden">
        <div>
          <p className={labelClass}>بازه زمانی سریع</p>
          <div className="flex flex-wrap gap-2">
            {DATE_CHIPS.map((chip) => {
              const active = filters.datePreset === chip.value;
              return (
                <button
                  key={chip.label}
                  type="submit"
                  name="datePreset"
                  value={chip.value}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className={labelClass}>یا از تاریخ (بازه دلخواه)</span>
            <input
              type="text"
              name="dateFrom"
              defaultValue={filters.dateFrom}
              placeholder="مثلاً ۱۴۰۴/۰۱/۰۱"
              dir="ltr"
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="block text-sm">
            <span className={labelClass}>تا تاریخ</span>
            <input
              type="text"
              name="dateTo"
              defaultValue={filters.dateTo}
              placeholder="مثلاً ۱۴۰۴/۰۱/۳۰"
              dir="ltr"
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="block text-sm">
            <span className={labelClass}>خدمت</span>
            <select name="serviceId" defaultValue={filters.serviceId} className={`${inputClass} w-full`}>
              <option value="">همه خدمت‌ها</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className={labelClass}>وضعیت رزرو</span>
            <select name="status" defaultValue={filters.status} className={`${inputClass} w-full`}>
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(BOOKING_EXPORT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className={labelClass}>جستجوی شماره موبایل</span>
            <input
              type="text"
              name="mobile"
              defaultValue={filters.mobile}
              placeholder="۰۹xxxxxxxxx"
              dir="ltr"
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="block text-sm">
            <span className={labelClass}>جستجوی نام دانش‌آموز</span>
            <input
              type="text"
              name="studentName"
              defaultValue={filters.studentName}
              placeholder="نام یا نام خانوادگی"
              className={`${inputClass} w-full`}
            />
          </label>
          <div className="flex items-end">
            <button className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90">
              اعمال فیلتر
            </button>
          </div>
        </div>
      </form>

      <section className="hidden print:block">
        <h2 className="mb-1 text-lg font-bold">برنامه امروز</h2>
        <p className="mb-4 text-sm text-muted">
          {formatJalaliDateShort(new Date())} · SetareganPlus ERP
        </p>
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
