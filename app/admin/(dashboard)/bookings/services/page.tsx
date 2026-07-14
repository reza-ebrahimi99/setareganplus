import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminBreadcrumbs } from "@/content/admin";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/persian";

export default async function BookingServicesPage() {
  const session = await requireAdminSession();
  const services = await prisma.bookingService.findMany({
    where: { organizationId: session.organization.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { advisorLinks: true, slots: true } } },
  });
  const create = <Link href="/admin/bookings/services/new" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white">تعریف خدمت جدید</Link>;
  return <><AdminPageHeader title="خدمت‌های نوبت‌دهی" description="خدمت‌ها، مشاوران و ظرفیت‌های قابل رزرو" breadcrumbs={adminBreadcrumbs.bookingServices} compact />
    <div className="mb-5 flex justify-end">{create}</div>
    {services.length === 0 ? <AdminEmptyState title="هنوز خدمتی تعریف نشده است" description="برای شروع، یک خدمت نوبت‌دهی ایجاد کنید." action={create} /> :
      <div className="space-y-3">{services.map((service) => <Link key={service.id} href={`/admin/bookings/services/${service.id}`} className="admin-card block p-5 hover:border-secondary"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-primary">{service.title}</h2><p className="mt-1 text-sm text-muted">{toPersianDigits(service.durationMinutes)} دقیقه · {service.isActive ? "فعال" : "غیرفعال"}</p></div><p className="text-sm text-muted">{toPersianDigits(service._count.advisorLinks)} مشاور · {toPersianDigits(service._count.slots)} نوبت</p></div></Link>)}</div>}
  </>;
}
