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
  describeBookingReservationExportFilters,
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

type IconProps = { className?: string };

function CalendarIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </svg>
  );
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.35-4.35" />
    </svg>
  );
}

function TagIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M11.5 3.5H6a2.5 2.5 0 0 0-2.5 2.5v5.5a2 2 0 0 0 .59 1.41l8 8a2 2 0 0 0 2.82 0l6.09-6.09a2 2 0 0 0 0-2.82l-8-8a2 2 0 0 0-1.5-.5Z" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Small section heading with an icon — groups the filter form into scannable clusters. */
function FilterSectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="text-sm font-semibold text-primary">{label}</p>
    </div>
  );
}

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

  const selectedServiceTitle = filters.serviceId
    ? (services.find((service) => service.id === filters.serviceId)?.title ?? null)
    : null;
  const filtersDescription = describeBookingReservationExportFilters(filters, {
    serviceTitle: selectedServiceTitle,
    statusLabel: filters.status ? BOOKING_EXPORT_STATUS_LABELS[filters.status] : null,
  });

  const qs = bookingReservationExportQueryString(filters);
  const exportHref = `/admin/bookings/export.xlsx${qs}`;
  const refreshHref = `/admin/bookings/export${qs}`;
  const hasActiveFilters = qs.length > 0;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          .booking-export-print-footer {
            position: fixed;
            bottom: 0;
            inset-inline: 0;
            text-align: center;
          }
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
          <p className="mt-1.5 text-xs text-muted">
            <span className="font-medium text-foreground">فیلتر فعلی:</span> {filtersDescription}
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

      <form className="admin-card mb-8 space-y-6 p-5 print:hidden">
        <div className="rounded-xl border border-border/70 bg-background/40 p-4">
          <FilterSectionHeading icon={<CalendarIcon className="size-4" />} label="بازه زمانی" />
          <div className="space-y-3">
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
                        : "border-border bg-surface text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background/40 p-4">
            <FilterSectionHeading icon={<TagIcon className="size-4" />} label="دسته‌بندی" />
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/40 p-4">
            <FilterSectionHeading icon={<SearchIcon className="size-4" />} label="جستجو" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className={labelClass}>شماره موبایل</span>
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
                <span className={labelClass}>نام دانش‌آموز</span>
                <input
                  type="text"
                  name="studentName"
                  defaultValue={filters.studentName}
                  placeholder="نام یا نام خانوادگی"
                  className={`${inputClass} w-full`}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
          {hasActiveFilters ? (
            <Link href="/admin/bookings/export" className={toolbarButtonClass}>
              ✖ پاک‌کردن فیلترها
            </Link>
          ) : null}
          <button className="min-h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary/90">
            اعمال فیلتر
          </button>
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
        <p className="booking-export-print-footer hidden text-xs text-muted print:block">
          SetareganPlus ERP · {formatJalaliDateShort(new Date())}
        </p>
      </section>
    </>
  );
}
