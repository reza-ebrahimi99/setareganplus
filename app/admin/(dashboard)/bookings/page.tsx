import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "رزرو نوبت" };

const items = [
  ["خدمت‌های نوبت‌دهی", "تعریف خدمت، مشاور و ساعت‌های در دسترس", "/admin/bookings/services"],
  ["تقویم نوبت‌ها", "مشاهده نوبت‌ها و رزروهای روزانه", "/admin/bookings/calendar"],
  ["پذیرش و ورود", "ثبت ورود با کد QR یا شناسه رزرو", "/admin/bookings/check-in"],
] as const;

export default async function BookingsPage() {
  const session = await requirePermission("booking.view_all");
  const visible = hasPermission(session, "settings.manage") ? items : items.filter((item) => item[2] === "/admin/bookings/calendar");
  return <><AdminPageHeader title="رزرو نوبت" description="مدیریت خدمت‌ها، زمان‌های آزاد و پذیرش مراجعه‌کنندگان" breadcrumbs={adminBreadcrumbs.bookings} showNotice compact />
    <div className="grid gap-4 md:grid-cols-3">{visible.map(([title, description, href]) => <Link key={href} href={href} className="admin-card p-5 transition hover:border-secondary"><h2 className="font-semibold text-primary">{title}</h2><p className="mt-2 text-sm leading-7 text-muted">{description}</p><span className="mt-4 inline-block text-sm font-medium text-secondary">ورود به بخش ←</span></Link>)}</div>
  </>;
}
